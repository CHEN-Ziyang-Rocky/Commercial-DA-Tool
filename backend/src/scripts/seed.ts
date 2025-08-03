/**
 * 将 companies.csv & relationships.csv 导入数据库
 * 1. 读取 company 主数据 → 插入
 * 2. 读取 relationships → 更新 parentCompany
 *
 * 运行：npm run seed
 */
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';
import { AppDataSource } from '../config/typeorm.config';
import { Company } from '../modules/company/company.entity';

const DATA_DIR = path.resolve(__dirname, '../../data'); // CSV 放在 /data

async function importCompanies() {
  const file = path.join(DATA_DIR, 'companies.csv');
  const companies: Company[] = [];

  return new Promise<Company[]>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csv())
      .on('data', (row) => {
        const company = new Company();
        company.companyCode   = row['company_code'];
        company.companyName   = row['company_name'];
        company.level         = parseInt(row['level'], 10);
        company.country       = row['country'];
        company.city          = row['city'];
        company.foundedYear   = parseInt(row['founded_year'], 10);
        company.annualRevenue = parseInt(row['annual_revenue'], 10);
        company.employees     = parseInt(row['employees'], 10);
        companies.push(company);
      })
      .on('end', () => resolve(companies))
      .on('error', reject);
  });
}

async function importRelationships(allCompanies: Company[]) {
  const map = new Map(allCompanies.map((c) => [c.companyCode, c]));
  const file = path.join(DATA_DIR, 'relationships.csv');

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csv())
      .on('data', (row) => {
        const child = map.get(row['company_code']);
        const parentCode = row['parent_company'];
        if (child && parentCode) {
          child.parentCompany = map.get(parentCode);
        }
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

async function main() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Company);

  const companies = await importCompanies();
  await repo.save(companies);              // 先保存自身

  await importRelationships(companies);    // 再更新父子关系
  await repo.save(companies);              // 二次保存

  console.log(`✔️  Imported ${companies.length} companies.`);
  await AppDataSource.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
