import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  RegistryDataset,
  RegistryEntity,
  RegistryReview,
} from './registry.entity';
import { publishedParent, RegistryRecord } from './registry.types';
import { RegistryQueryDto } from './registry-query.dto';
import {
  recordFingerprint,
  renewalBucket,
  reviewIsStale,
  ReviewState,
} from './governance';
import { UpdateReviewDto } from './review.dto';
import { managementSummary } from './management-summary';
import { reviewPresentation } from './review-presentation';

export function reviewFlags(r: RegistryRecord, now = Date.now()) {
  const flags: string[] = [];
  if (r.registrationStatus !== 'ISSUED')
    flags.push(`LEI ${r.registrationStatus}`);
  if (
    r.entityStatus === 'ACTIVE' &&
    r.nextRenewal &&
    Date.parse(r.nextRenewal) < now
  )
    flags.push('Renewal date passed');
  if (
    r.parents.direct.kind === 'unavailable' ||
    r.parents.direct.kind === 'not-fetched'
  )
    flags.push('Parent evidence outside coverage');
  if (
    r.parents.direct.kind === 'relationship' &&
    !publishedParent(r.parents.direct)
  )
    flags.push('Parent relationship not active/published');
  return flags;
}
export function relativeLevels(records: RegistryRecord[], root?: string) {
  const result = new Map<string, string>();
  if (!root || !records.some((r) => r.lei === root)) return result;
  result.set(root, '1');
  for (let depth = 2; depth <= 3; depth++)
    for (const r of records)
      if (
        !result.has(r.lei) &&
        result.get(publishedParent(r.parents.direct) ?? '') ===
          String(depth - 1)
      )
        result.set(r.lei, String(depth));
  return result;
}
export function portfolioMembers(records: RegistryRecord[], roots: string[] = []) {
  const members = new Set<string>();
  for (const root of new Set(roots))
    for (const lei of relativeLevels(records, root).keys()) members.add(lei);
  return members;
}
export function companyOptions(records: RegistryRecord[], seeds: { lei: string; label: string; sector: string }[]) {
  const featured = new Map(seeds.map((s) => [s.lei, s]));
  return records.map((r) => ({
    lei: r.lei, legalName: r.legalName, otherNames: r.otherNames,
    label: featured.get(r.lei)?.label ?? r.legalName,
    sector: featured.get(r.lei)?.sector ?? '', country: r.country,
    featured: featured.has(r.lei),
  })).sort((a, b) => Number(b.featured) - Number(a.featured) || a.label.localeCompare(b.label));
}
export function selectRecords(
  records: RegistryRecord[],
  query: RegistryQueryDto,
  now = Date.now(),
) {
  if (
    query.entityStatus &&
    query.status &&
    query.status !== 'all' &&
    query.entityStatus !== query.status
  )
    throw new BadRequestException('Conflicting entity statuses');
  const q = query.q?.trim().toLocaleLowerCase();
  if (query.hierarchyLevel?.length && !query.root)
    throw new BadRequestException('Choose a root for relative levels');
  const levels = relativeLevels(records, query.root);
  const portfolio = portfolioMembers(records, query.portfolio);
  const level = (r: RegistryRecord) => levels.get(r.lei) ?? null;
  return records
    .filter(
      (r) =>
        (!q ||
          [r.legalName, r.lei, ...r.otherNames].some((s) =>
            s.toLocaleLowerCase().includes(q),
          )) &&
        (!query.root || !!level(r)) &&
        (!query.hierarchyLevel?.length ||
          query.hierarchyLevel.includes(level(r) ?? '')) &&
        (!query.city?.length || query.city.includes(r.city)) &&
        (!query.registrationStatus?.length ||
          query.registrationStatus.includes(r.registrationStatus)) &&
        (!query.entityStatus || r.entityStatus === query.entityStatus) &&
        (!query.country?.length || query.country.includes(r.country)) &&
        (!query.group || r.groups.includes(query.group)) &&
        (!query.portfolio?.length || portfolio.has(r.lei)) &&
        (!query.renewal ||
          query.renewal === 'all' ||
          renewalBucket(r, now) === query.renewal ||
          (query.renewal === 'due-90' && renewalBucket(r, now) === 'due-30')) &&
        (!query.status ||
          query.status === 'all' ||
          r.entityStatus === query.status) &&
        (!query.quality ||
          query.quality === 'all' ||
          (query.quality === 'review' && reviewFlags(r, now).length > 0) ||
          (query.quality === 'lapsed' && r.registrationStatus === 'LAPSED') ||
          (query.quality === 'missing-parent' &&
            !publishedParent(r.parents.direct))),
    )
    .sort(
      (a, b) =>
        a.legalName.localeCompare(b.legalName, 'en') ||
        a.lei.localeCompare(b.lei),
    );
}
export function csvCell(value: string) {
  // Spreadsheet formula injection, including whitespace-prefixed formulas.
  const safe = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
  return '"' + safe.replace(/"/g, '""') + '"';
}
export function ancestorsOf(lei: string, records: RegistryRecord[]) {
  const byId = new Map(records.map((r) => [r.lei, r]));
  const visited = new Set([lei]);
  const ancestors: RegistryRecord[] = [];
  let current = byId.get(lei);
  let stopReason = 'No active published direct parent in this snapshot';
  while (current) {
    const parent = publishedParent(current.parents.direct);
    if (!parent) break;
    if (visited.has(parent)) {
      stopReason = 'Cycle detected; traversal stopped';
      break;
    }
    visited.add(parent);
    const next = byId.get(parent);
    if (!next) {
      stopReason = `Parent ${parent} is outside this snapshot`;
      break;
    }
    ancestors.push(next);
    current = next;
  }
  return { ancestors, stopReason };
}
@Injectable()
export class RegistryService {
  constructor(private readonly db: DataSource) {}
  private async load() {
    // A bounded review snapshot, read consistently during atomic replacement imports.
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const dataset = await manager.findOneBy(RegistryDataset, {
        id: 'current',
      });
      if (!dataset)
        throw new ServiceUnavailableException(
          'Public entity data is not ready. Please contact your administrator.',
        );
      const rows = await manager.find(RegistryEntity, {
        take: 3001,
        order: { lei: 'ASC' },
      });
      if (rows.length > 3000)
        throw new ServiceUnavailableException(
          'Snapshot exceeds the review workspace limit',
        );
      const reviews = await manager.find(RegistryReview);
      return {
        metadata: dataset.metadata,
        records: rows.map((r) => r.record),
        reviews,
      };
    });
  }
  private matching(
    records: RegistryRecord[],
    reviews: RegistryReview[],
    query: RegistryQueryDto,
    now = Date.now(),
  ) {
    const reviewById = new Map(reviews.map((v) => [v.lei, v.state]));
    const selected = selectRecords(records, query, now).filter((r) => {
      const state = reviewById.get(r.lei);
      const flag = query.workflow;
      if (!flag || flag === 'all') return true;
      if (flag === 'active') return !!state && state.status !== 'reviewed';
      if (flag === 'unassigned') return !state;
      if (flag === 'stale') return !!state && reviewIsStale(state, r);
      if (flag === 'overdue')
        return (
          !!state &&
          state.status !== 'reviewed' &&
          state.dueDate < new Date(now).toISOString().slice(0, 10)
        );
      return (
        state?.status === flag &&
        (flag !== 'reviewed' || !reviewIsStale(state, r))
      );
    });
    if (query.sort === 'renewal')
      selected.sort((a, b) => {
        const timestamp = (r: RegistryRecord) =>
          r.entityStatus === 'ACTIVE' && r.nextRenewal
            ? Date.parse(r.nextRenewal)
            : Number.MAX_SAFE_INTEGER;
        return timestamp(a) - timestamp(b) || a.lei.localeCompare(b.lei);
      });
    if (query.sort === 'review-due')
      selected.sort((a, b) => {
        const due = (r: RegistryRecord) =>
          reviews.find((v) => v.lei === r.lei && v.state.status !== 'reviewed')
            ?.state.dueDate ?? '9999-12-31';
        return due(a).localeCompare(due(b)) || a.lei.localeCompare(b.lei);
      });
    return selected;
  }
  private metadataSummary(metadata: import('./registry.types').SnapshotMeta) {
    return {
      ...metadata,
      changes: metadata.changes
        ? {
            comparedAt: metadata.changes.comparedAt,
            previousFetchedAt: metadata.changes.previousFetchedAt,
            currentFetchedAt: metadata.changes.currentFetchedAt,
            initial: metadata.changes.initial,
            added: metadata.changes.added,
            removed: metadata.changes.removed,
            changed: metadata.changes.changed,
          }
        : undefined,
    };
  }
  async companyOptions() {
    const { records, metadata } = await this.load();
    return { total: records.length, items: companyOptions(records, metadata.seeds) };
  }
  async changes() {
    const { metadata, records, reviews } = await this.load();
    return {
      changes: metadata.changes ?? null,
      orphanedReviews: reviews
        .filter((v) => !records.some((r) => r.lei === v.lei))
        .map((v) => ({
          lei: v.lei,
          owner: v.state.owner,
          status: v.state.status,
          dueDate: v.state.dueDate,
        })),
    };
  }
  async list(query: RegistryQueryDto) {
    const now = Date.now();
    const { metadata, records, reviews } = await this.load();
    const levels = relativeLevels(records, query.root);
    const matching = this.matching(records, reviews, query, now);
    const countryCounts = new Map<string, number>();
    for (const r of matching)
      countryCounts.set(r.country, (countryCounts.get(r.country) ?? 0) + 1);
    return {
      metadata: this.metadataSummary(metadata),
      portfolios: metadata.seeds.map((seed) => {
        const members = portfolioMembers(records, [seed.lei]);
        const subset = records.filter((r) => members.has(r.lei));
        return {
          ...seed,
          total: subset.length,
          overdue: subset.filter((r) => renewalBucket(r, now) === 'overdue')
            .length,
          upcoming: subset.filter((r) =>
            ['due-30', 'due-90'].includes(renewalBucket(r, now)),
          ).length,
          review: subset.filter((r) => reviewFlags(r, now).length).length,
        };
      }),
      leiStatuses: [...new Set(matching.map((r) => r.registrationStatus))]
        .sort()
        .map((status) => ({
          status,
          count: matching.filter((r) => r.registrationStatus === status).length,
        })),
      orphanedReviews: reviews
        .filter((v) => !records.some((r) => r.lei === v.lei))
        .map((v) => ({
          lei: v.lei,
          owner: v.state.owner,
          status: v.state.status,
          dueDate: v.state.dueDate,
        })),
      total: matching.length,
      overview: managementSummary(matching, records, reviews, now),
      page: query.page,
      limit: query.limit,
      items: matching
        .slice((query.page - 1) * query.limit, query.page * query.limit)
        .map((r) => ({
          ...r,
          hierarchyLevel: levels.get(r.lei) ?? null,
          reviewFlags: reviewFlags(r, now),
          renewal: renewalBucket(r, now),
          review: (() => {
            const state = reviews.find((v) => v.lei === r.lei)?.state;
            return state
              ? {
                  version: state.version,
                  status: state.status,
                  owner: reviewPresentation(state).owner,
                  dueDate: state.dueDate,
                  updatedAt: state.updatedAt,
                  demo: state.demo ?? null,
                }
              : null;
          })(),
          reviewStale: reviews.some(
            (v) => v.lei === r.lei && reviewIsStale(v.state, r),
          ),
        })),
      summary: {
        entities: matching.length,
        overdueRenewals: matching.filter(
          (r) => renewalBucket(r, now) === 'overdue',
        ).length,
        due30: matching.filter((r) => renewalBucket(r, now) === 'due-30')
          .length,
        due90: matching.filter((r) =>
          ['due-30', 'due-90'].includes(renewalBucket(r, now)),
        ).length,
        unknownRenewals: matching.filter(
          (r) => renewalBucket(r, now) === 'unknown',
        ).length,
        unassigned: matching.filter(
          (r) => !reviews.some((v) => v.lei === r.lei),
        ).length,
        openReviews: matching.filter((r) =>
          reviews.some((v) => v.lei === r.lei && v.state.status !== 'reviewed'),
        ).length,
        overdueReviews: matching.filter((r) =>
          reviews.some(
            (v) =>
              v.lei === r.lei &&
              v.state.status !== 'reviewed' &&
              v.state.dueDate < new Date(now).toISOString().slice(0, 10),
          ),
        ).length,
        staleReviews: matching.filter((r) =>
          reviews.some((v) => v.lei === r.lei && reviewIsStale(v.state, r)),
        ).length,
        reviewed: matching.filter((r) =>
          reviews.some(
            (v) =>
              v.lei === r.lei &&
              v.state.status === 'reviewed' &&
              !reviewIsStale(v.state, r),
          ),
        ).length,
        jurisdictions: new Set(matching.map((r) => r.jurisdiction)).size,
        review: matching.filter((r) => reviewFlags(r, now).length).length,
        parentExceptions: matching.filter(
          (r) => r.parents.direct.kind === 'exception',
        ).length,
      },
      distribution: [...countryCounts]
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count),
      options: {
        countries: [...new Set(records.map((r) => r.country))].sort(),
        cities: [
          ...new Set(
            records
              .filter(
                (r) =>
                  !query.country?.length || query.country.includes(r.country),
              )
              .map((r) => r.city),
          ),
        ].sort(),
        registrationStatuses: [
          ...new Set(records.map((r) => r.registrationStatus)),
        ].sort(),
        groups: metadata.seeds,
      },
      snapshotAgeDays: Math.max(
        0,
        Math.floor((Date.now() - Date.parse(metadata.fetchedAt)) / 86400000),
      ),
    };
  }
  async detail(lei: string) {
    const { metadata, records, reviews } = await this.load();
    const record = records.find((r) => r.lei === lei);
    if (!record) throw new NotFoundException('Entity not in this snapshot');
    const hierarchy = ancestorsOf(lei, records);
    return {
      record,
      evidenceVersion: recordFingerprint(record),
      review: (() => { const state = reviews.find((v) => v.lei === lei)?.state; return state ? reviewPresentation(state) : null; })(),
      reviewStale: reviews.some(
        (v) => v.lei === lei && reviewIsStale(v.state, record),
      ),
      metadata: this.metadataSummary(metadata),
      reviewFlags: reviewFlags(record),
      ...hierarchy,
      directParent:
        records.find((r) => r.lei === publishedParent(record.parents.direct)) ??
        null,
      ultimateParent:
        records.find(
          (r) => r.lei === publishedParent(record.parents.ultimate),
        ) ?? null,
      children: records.filter(
        (r) => publishedParent(r.parents.direct) === lei,
      ),
      coverage: metadata.coverage.find((c) => c.lei === lei) ?? null,
    };
  }
  async updateReview(lei: string, dto: UpdateReviewDto, actor: string) {
    const date = new Date(dto.dueDate);
    if (
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dto.dueDate
    )
      throw new BadRequestException('Invalid calendar date');
    return this.db.transaction(async (manager) => {
      // Serialize with snapshot imports before taking a record fingerprint.
      await manager.query(
        "SELECT id FROM registry_dataset WHERE id = 'current' FOR UPDATE",
      );
      const row = await manager.findOneBy(RegistryEntity, { lei });
      if (!row) throw new NotFoundException('Entity not in current snapshot');
      if (recordFingerprint(row.record) !== dto.evidenceVersion)
        throw new ConflictException(
          'Source evidence changed since you opened this record. Reload and re-check before saving.',
        );
      await manager.query(
        'INSERT IGNORE INTO registry_reviews (lei, state) VALUES (?, ?)',
        [lei, JSON.stringify({ version: 0, history: [] })],
      );
      const review = await manager.findOneOrFail(RegistryReview, {
        where: { lei },
        lock: { mode: 'pessimistic_write' },
      });
      if (review.state.version !== dto.version)
        throw new ConflictException('Review changed. Reload before saving.');
      const recordHash = recordFingerprint(row.record);
      const at = new Date().toISOString();
      const entry = { ...dto, version: dto.version + 1, actor, at, recordHash };
      const state: ReviewState = {
        ...dto,
        version: entry.version,
        recordHash,
        updatedAt: at,
        history: [...review.state.history, entry],
        ...(review.state.demo ? { demo: review.state.demo } : {}),
      };
      await manager.save(RegistryReview, { lei, state });
      return state;
    });
  }
  async export(query: RegistryQueryDto) {
    const now = Date.now();
    const { metadata, records, reviews } = await this.load();
    const levels = relativeLevels(records, query.root);
    const rows = this.matching(records, reviews, query, now).map((r) => [
      levels.get(r.lei) ?? '',
      r.lei,
      r.legalName,
      r.country,
      r.city,
      r.entityStatus,
      r.registrationStatus,
      publishedParent(r.parents.direct) ?? '',
      r.parents.direct.kind,
      reviewFlags(r, now).join('; '),
      r.lastUpdate,
      r.retrievedAt ?? metadata.fetchedAt,
      r.sourceUrl,
      r.nextRenewal ?? '',
      renewalBucket(r, now),
      reviews.find((v) => v.lei === r.lei)?.state.status ?? 'unassigned',
      (() => { const state = reviews.find((v) => v.lei === r.lei)?.state; return state ? reviewPresentation(state).owner : ''; })(),
      reviews.find((v) => v.lei === r.lei)?.state.dueDate ?? '',
      reviews.some((v) => v.lei === r.lei && reviewIsStale(v.state, r))
        ? 'Re-review required'
        : '',
    ]);
    return (
      '\uFEFF' +
      [
        [
          'Relative level (selected root)',
          'LEI',
          'Legal name',
          'Legal address country',
          'City',
          'Entity status',
          'LEI status',
          'Published direct parent LEI',
          'Parent evidence',
          'Review flags',
          'Source updated',
          'Entity retrieved',
          'Source URL',
          'Next renewal',
          'Renewal bucket',
          'Review status',
          'Owner',
          'Review due date (UTC)',
          'Changed since review',
        ],
        ...rows,
      ]
        .map((row) => row.map(csvCell).join(','))
        .join('\r\n')
    );
  }
}
