import { AppDataSource as db } from '../config/typeorm.config';
import { randomUUID, createHash } from 'crypto';
import {
  RegistryEntity,
  RegistryDataset,
} from '../modules/registry/registry.entity';
import { structured } from '../modules/registry/structured';
async function main() {
  await db.initialize();
  try {
    const runner = db.createQueryRunner();
    // MySQL DDL commits implicitly. Additive, restartable DDL precedes transactional backfill.
    for (const [table, name, definition] of [
      [
        'registry_entities',
        'entityStatus',
        "varchar(40) NOT NULL DEFAULT 'ACTIVE'",
      ],
      ['registry_entities', 'nextRenewal', 'datetime(3) NULL'],
      ['registry_entities', 'sourceDirectParentLei', 'varchar(20) NULL'],
      ['registry_entities', 'directParentLei', 'varchar(20) NULL'],
      ['registry_dataset', 'version', "varchar(36) NOT NULL DEFAULT 'initial'"],
    ]) {
      if (!(await runner.hasColumn(table, name)))
        await runner.query(
          `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`,
        );
    }
    const table = await runner.getTable('registry_entities');
    if (
      !table?.foreignKeys.some((f) => f.columnNames.includes('directParentLei'))
    )
      await runner.query(
        'ALTER TABLE registry_entities ADD CONSTRAINT fk_registry_parent FOREIGN KEY (directParentLei) REFERENCES registry_entities(lei) ON DELETE SET NULL',
      );
    for (const [name, col] of [
      ['idx_registry_parent', 'directParentLei'],
      ['idx_registry_entity_status', 'entityStatus'],
      ['idx_registry_renewal', 'nextRenewal'],
      ['idx_registry_city', 'city'],
    ])
      if (!table?.indices.some((i) => i.name === name))
        await runner.query(
          `CREATE INDEX ${name} ON registry_entities (${col})`,
        );
    await runner.release();
    await db.transaction(async (m) => {
      await m.query(
        "SELECT id FROM registry_dataset WHERE id='current' FOR UPDATE",
      );
      const rows = await m.find(RegistryEntity);
      const before = createHash('sha256')
        .update(
          JSON.stringify(
            rows
              .map((r) => r.record)
              .sort((a, b) => a.lei.localeCompare(b.lei)),
          ),
        )
        .digest('hex');
      for (const r of rows)
        await m.update(RegistryEntity, { lei: r.lei }, structured(r.record));
      await m.query(
        `UPDATE registry_entities c JOIN registry_entities p ON c.sourceDirectParentLei=p.lei SET c.directParentLei=p.lei
        WHERE JSON_UNQUOTE(JSON_EXTRACT(c.record,'$.parents.direct.record.attributes.relationship.status'))='ACTIVE'
        AND JSON_UNQUOTE(JSON_EXTRACT(c.record,'$.parents.direct.record.attributes.registration.status'))='PUBLISHED'`,
      );
      await m.update(
        RegistryDataset,
        { id: 'current' },
        { version: randomUUID() },
      );
      const after = createHash('sha256')
        .update(
          JSON.stringify(
            (await m.find(RegistryEntity))
              .map((r) => r.record)
              .sort((a, b) => a.lei.localeCompare(b.lei)),
          ),
        )
        .digest('hex');
      if (before !== after) throw Error('Evidence changed during backfill');
      console.log(
        JSON.stringify({
          entities: rows.length,
          evidenceHash: after,
          evidencePreserved: true,
        }),
      );
    });
  } finally {
    await db.destroy();
  }
}
main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'Upgrade failed');
  process.exitCode = 1;
});
