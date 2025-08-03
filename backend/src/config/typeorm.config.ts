// src/config/typeorm.config.ts：连接+实体映射
import { DataSource } from 'typeorm';
import appConfig from './app.config';
import { Company } from '../modules/company/company.entity';
import { User } from '../modules/user/user.entity';

const { db } = appConfig();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.database,
  entities: [Company, User],
  synchronize: false,   // true 时，TypeORM 会根据实体类自动在数据库创建空表（只有列结构）。
  logging: false,
});

/** 兼容 “默认导出” 写法（给其他文件用） */
export default AppDataSource;
