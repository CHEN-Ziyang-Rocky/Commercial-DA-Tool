import { AppDataSource } from '../config/typeorm.config';

async function main() {
  await AppDataSource.initialize();
  try {
    const tables: unknown[] = await AppDataSource.query('SHOW TABLES');
    if (tables.length) {
      throw new Error(
        'Database is not empty. Refusing schema synchronization; use reviewed migrations for upgrades.',
      );
    }
    await AppDataSource.synchronize();
    console.log('Initial schema created in an empty database.');
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Initialization failed',
  );
  process.exitCode = 1;
});
