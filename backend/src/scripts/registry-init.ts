import { AppDataSource } from '../config/typeorm.config';
async function main() {
  await AppDataSource.initialize();
  try {
    // Additive initialization only; never synchronizes or alters existing application tables.
    await AppDataSource.query(`CREATE TABLE IF NOT EXISTS registry_entities (
      lei varchar(20) NOT NULL PRIMARY KEY, legalName varchar(512) NOT NULL,
      country varchar(2) NOT NULL, city varchar(255) NOT NULL,
      registrationStatus varchar(40) NOT NULL, record json NOT NULL,
      entityStatus varchar(40) NOT NULL DEFAULT 'ACTIVE', nextRenewal datetime(3) NULL,
      sourceDirectParentLei varchar(20) NULL, directParentLei varchar(20) NULL,
      FOREIGN KEY (directParentLei) REFERENCES registry_entities(lei) ON DELETE SET NULL,
      INDEX idx_registry_country (country), INDEX idx_registry_status (registrationStatus)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await AppDataSource.query(`CREATE TABLE IF NOT EXISTS registry_dataset (
      id varchar(20) NOT NULL PRIMARY KEY, metadata json NOT NULL, version varchar(36) NOT NULL DEFAULT 'initial'
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await AppDataSource.query(`CREATE TABLE IF NOT EXISTS registry_reviews (
      lei varchar(20) NOT NULL PRIMARY KEY, state json NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    console.log(
      'Registry tables ready; existing company/user tables were not modified.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}
main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
