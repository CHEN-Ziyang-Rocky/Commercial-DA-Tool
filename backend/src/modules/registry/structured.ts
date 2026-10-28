import { EntityManager } from 'typeorm';
import { RegistryEntity } from './registry.entity';
import { relationship, RegistryRecord } from './registry.types';
export function structured(record: RegistryRecord) {
  return {
    lei: record.lei,
    legalName: record.legalName,
    country: record.country,
    city: record.city,
    registrationStatus: record.registrationStatus,
    entityStatus: record.entityStatus,
    nextRenewal: record.nextRenewal ? new Date(record.nextRenewal) : null,
    sourceDirectParentLei:
      relationship(record.parents.direct)?.endNode.id ?? null,
    directParentLei: null,
    record,
  };
}
export async function replaceEntities(
  manager: EntityManager,
  records: RegistryRecord[],
) {
  // Break old references before replacement; reviews deliberately have no cascading FK.
  await manager
    .createQueryBuilder()
    .update(RegistryEntity)
    .set({ directParentLei: null })
    .execute();
  await manager.createQueryBuilder().delete().from(RegistryEntity).execute();
  for (let i = 0; i < records.length; i += 100)
    await manager.insert(
      RegistryEntity,
      records.slice(i, i + 100).map(structured),
    );
  await manager.query(`UPDATE registry_entities child JOIN registry_entities parent
    ON child.sourceDirectParentLei = parent.lei SET child.directParentLei = parent.lei
    WHERE JSON_UNQUOTE(JSON_EXTRACT(child.record,'$.parents.direct.record.attributes.relationship.status'))='ACTIVE'
    AND JSON_UNQUOTE(JSON_EXTRACT(child.record,'$.parents.direct.record.attributes.registration.status'))='PUBLISHED'`);
}
