import { appendSnapshot } from './append-snapshot';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { replaceEntities } from './structured';
import { snapshotDiff, ChangeSet } from './snapshot-diff';
import { RegistryDataset, RegistryEntity } from './registry.entity';
import { RegistrySnapshot } from './registry.types';
import { validateSnapshot } from './validate-snapshot';
export async function importSnapshot(
  db: DataSource,
  snapshot: RegistrySnapshot,
  mode: 'replace' | 'append' = 'replace',
) {
  validateSnapshot(snapshot);
  let imported = snapshot;
  const { entities: _initialEntities, ...initialMetadata } = snapshot;
  await db.transaction(async (manager) => {
    // Serialize importers; never let concurrent snapshot replacements interleave.
    await manager.query(
      "INSERT IGNORE INTO registry_dataset (id, metadata) VALUES ('current', ?)",
      [JSON.stringify(initialMetadata)],
    );
    await manager.query(
      "SELECT id FROM registry_dataset WHERE id = 'current' FOR UPDATE",
    );
    const previous = await manager.findOneBy(RegistryDataset, {
      id: 'current',
    });
    const previousRows = await manager.find(RegistryEntity);
    if (mode === 'append' && previous && previousRows.length)
      imported = appendSnapshot({ ...previous.metadata, entities: previousRows.map(r => r.record) }, snapshot);
    const { entities, ...metadata } = imported;
    const entries = snapshotDiff(
      previousRows.map((r) => r.record),
      entities,
    );
    const changes: ChangeSet = {
      comparedAt: new Date().toISOString(),
      previousFetchedAt: previousRows.length
        ? (previous?.metadata.fetchedAt ?? null)
        : null,
      currentFetchedAt: metadata.fetchedAt,
      initial: previousRows.length === 0,
      added: entries.filter((e) => e.kind === 'added').length,
      removed: entries.filter((e) => e.kind === 'removed').length,
      changed: entries.filter((e) => e.kind === 'changed').length,
      entries,
    };
    // Keep the latest material comparison on an identical re-import.
    metadata.changes =
      entries.length || !previous?.metadata.changes
        ? changes
        : previous.metadata.changes;
    await replaceEntities(manager, entities);
    await manager.save(RegistryDataset, {
      id: 'current',
      metadata,
      version: randomUUID(),
    });
  });
  return { entities: imported.entities.length, fetchedAt: imported.fetchedAt };
}
