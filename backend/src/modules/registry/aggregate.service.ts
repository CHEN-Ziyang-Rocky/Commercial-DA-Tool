import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RegistryDataset, RegistryEntity } from './registry.entity';
import { RegistryQueryDto } from './registry-query.dto';
import { AggregateRow, QueryCache } from './query-cache';
@Injectable()
export class AggregateService {
  constructor(
    private db: DataSource,
    private cache: QueryCache,
  ) {}
  query(manager: EntityManager, q: RegistryQueryDto, now: Date) {
    if (q.hierarchyLevel?.length && !q.root)
      throw new BadRequestException('Choose a root for relative levels');
    const qb = manager.createQueryBuilder(RegistryEntity, 'e');
    if (q.root || q.portfolio?.length) qb.leftJoin('e.directParent', 'p');
    const level = q.root
      ? 'CASE WHEN e.lei = :root THEN 1 WHEN e.directParentLei = :root THEN 2 WHEN p.directParentLei = :root THEN 3 END'
      : 'NULL';
    if (q.root)
      qb.andWhere(
        '(e.lei=:root OR e.directParentLei=:root OR p.directParentLei=:root)',
        { root: q.root },
      );
    if (q.hierarchyLevel?.length)
      qb.andWhere(`${level} IN (:...levels)`, { levels: q.hierarchyLevel });
    for (const field of ['country', 'city', 'registrationStatus'] as const)
      if (q[field]?.length) {
        qb.andWhere(`e.${field} IN (:...${field})`, { [field]: q[field] });
        // City spelling is exact in the source/list; retain an indexable predicate plus a binary residual.
        if (field === 'city')
          qb.andWhere('BINARY e.city IN (:...city)', { city: q.city });
      }
    if (
      q.entityStatus &&
      q.status &&
      q.status !== 'all' &&
      q.entityStatus !== q.status
    )
      throw new BadRequestException('Conflicting entity statuses');
    const status =
      q.entityStatus ?? (q.status === 'all' ? undefined : q.status);
    if (status) qb.andWhere('e.entityStatus=:status', { status });
    if (q.group)
      qb.andWhere("JSON_CONTAINS(e.record, :group, '$.groups')", {
        group: JSON.stringify(q.group),
      });
    if (q.portfolio?.length)
      qb.andWhere('(e.lei IN (:...portfolio) OR e.directParentLei IN (:...portfolio) OR p.directParentLei IN (:...portfolio))', {
        portfolio: [...new Set(q.portfolio)],
      });
    if (q.renewal && q.renewal !== 'all') {
      qb.andWhere("e.entityStatus='ACTIVE'");
      if (q.renewal === 'unknown') qb.andWhere('e.nextRenewal IS NULL');
      else if (q.renewal === 'overdue')
        qb.andWhere('e.nextRenewal < :now', { now });
      else
        qb.andWhere('e.nextRenewal >= :now AND e.nextRenewal <= :end', {
          now,
          end: new Date(
            now.getTime() + (q.renewal === 'due-30' ? 30 : 90) * 86400000,
          ),
        });
    }
    return { qb, level };
  }
  async aggregate(q: RegistryQueryDto) {
    // This endpoint intentionally accepts only public structural filters; never silently drop others.
    if (
      q.q ||
      (q.quality && q.quality !== 'all') ||
      (q.workflow && q.workflow !== 'all')
    )
      throw new BadRequestException(
        'Public aggregation does not accept search or review filters',
      );
    return this.db.transaction('REPEATABLE READ', async (m) => {
      const dataset = await m.findOneBy(RegistryDataset, { id: 'current' });
      if (!dataset) throw new ServiceUnavailableException('Dataset not ready');
      const now = new Date();
      const { qb, level } = this.query(m, q, now);
      const normalized = {
        root: q.root ?? '',
        group: q.group ?? '',
        portfolio: q.portfolio ?? [],
        hierarchyLevel: q.hierarchyLevel ?? [],
        country: q.country ?? [],
        city: q.city ?? [],
        entityStatus:
          q.entityStatus ?? (q.status === 'all' ? '' : (q.status ?? '')),
        registrationStatus: q.registrationStatus ?? [],
        renewal: q.renewal ?? 'all',
      };
      const rows = await this.cache.read(
        dataset.version,
        normalized,
        async () => {
          const raw = await qb
            .select(level, 'level')
            .addSelect('e.country', 'country')
            .addSelect('e.registrationStatus', 'registrationStatus')
            .addSelect('COUNT(*)', 'count')
            .groupBy(level)
            .addGroupBy('e.country')
            .addGroupBy('e.registrationStatus')
            .orderBy('country', 'ASC')
            .addOrderBy('registrationStatus', 'ASC')
            .addOrderBy('level', 'ASC')
            .getRawMany<AggregateRow>();
          return raw.map((r) => ({
            ...r,
            level: r.level === null ? null : String(r.level),
            count: Number(r.count),
          }));
        },
        !q.renewal || q.renewal === 'all',
      );
      return {
        version: dataset.version,
        fetchedAt: dataset.metadata.fetchedAt,
        rows,
        total: rows.reduce((s, r) => s + r.count, 0),
        scope:
          'Root + two published direct-parent generations; not complete ownership',
      };
    });
  }
}
