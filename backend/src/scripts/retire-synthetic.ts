import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { AppDataSource } from '../config/typeorm.config';
async function main() {
  if (process.env.CONFIRM_RETIRE_SYNTHETIC !== '1')
    throw new Error(
      'Set CONFIRM_RETIRE_SYNTHETIC=1 to back up and empty the retired companies table.',
    );
  await AppDataSource.initialize();
  try {
    const tables: unknown[] = await AppDataSource.query(
      "SHOW TABLES LIKE 'companies'",
    );
    if (!tables.length) {
      console.log('No retired companies table.');
      return;
    }
    await AppDataSource.transaction(async (manager) => {
      const rows: Record<string, unknown>[] = await manager.query(
        'SELECT * FROM companies FOR UPDATE',
      );
      if (!rows.length) {
        console.log('Retired companies table already empty.');
        return;
      }
      const folder = resolve(__dirname, '../../../backups');
      mkdirSync(folder, { recursive: true, mode: 0o700 });
      const file = resolve(folder, `retired-companies-${Date.now()}.json`);
      writeFileSync(
        file,
        JSON.stringify(
          {
            database: process.env.DB_NAME,
            exportedAt: new Date().toISOString(),
            rows,
          },
          null,
          2,
        ),
        { flag: 'wx', mode: 0o600 },
      );
      await manager.query('UPDATE companies SET parent_company = NULL');
      await manager.query('DELETE FROM companies');
      console.log(
        `Backed up ${rows.length} retired records to ${file}; removed from active database. Users and registry untouched.`,
      );
    });
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : 'Retirement failed');
  process.exitCode = 1;
});
