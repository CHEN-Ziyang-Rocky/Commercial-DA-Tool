import { readFileSync } from 'fs';
import { resolve } from 'path';
import { AppDataSource } from '../config/typeorm.config';
import { RegistrySnapshot } from '../modules/registry/registry.types';
import { importSnapshot } from '../modules/registry/import-snapshot';
async function main() {
  const file =
    process.env.REGISTRY_SNAPSHOT ??
    resolve(__dirname, '../../registry-data/gleif-snapshot.json');
  const snapshot = JSON.parse(readFileSync(file, 'utf8')) as RegistrySnapshot;
  await AppDataSource.initialize();
  try {
    const mode = process.env.REGISTRY_IMPORT_MODE ?? 'replace';
    if (mode !== 'replace' && mode !== 'append') throw new Error('Invalid import mode');
    const result = await importSnapshot(AppDataSource, snapshot, mode);
    console.log(
      `Imported ${result.entities} GLEIF entities atomically. Snapshot ${result.fetchedAt}`,
    );
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Import failed');
  process.exitCode = 1;
});
