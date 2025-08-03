# <u>01. Project Description</u>

## Backend Task:

```
Import the two CSV files (companies.csv and relationships.csv) into the database, create a table, create the nest.js project, and create the company and user modules under modules.

1. Complete the company dimension + filter combination search API. The request and response formats are as follows:
request form:
    {
        dimension: level, country, city
        filter:{
            level:[1, 2, 3],
            country:[],
            city:[],
            founded_year:{
                start:,
                end:,
            },
            annual_revenue:{
                min:,
                max:,
            }
            employees:{
                min:,
                max:,
            }
        }
    }

return form:
    {
        dimension: level/country/city
        data(level):{
            level1:[{},{}, ....],
            level2:[{}, {}, ...]
        }
        （or）//根据维度决定
        data(country);{
            china:[{},{}, ....]
            US:[{},{}, ....]
        }
        filter(optional but recommend):...
    } 

2. Create a new user table in the database.

Complete the user module (placed alongside the company module) and related CRUD APIs (select request types as needed). Design user parameters and request formats independently.

(Using UUID to generate user IDs is recommended.)

3. Complete the auth module, wrap the existing API routes with JWT protection, and test the API response results.
POST /auth/register
{
  "name": "test test",
  "email": "test@teste.com",
  "password": "test"
}

POST /auth/login
{
  "email": "test@test.com",
  "password": "test"
}

{
  "access_token": "your_token"
}

4. Complete the redis caching function of the company module
```

## Frontend Task

```
1. Using NextJS (React) and Material-UI, complete the login page and experimented with the homepage layout (the layout can be referenced from Mira UI. The style can be customized, but try to maintain a business-like appearance).

  User Table:
      Name
      Email
      Title/Role
      Status
      Edit
      Operation

  Company Table:
      Name
      Level
      Country
      Profitability (background coloring)
      Annual Revenue/Employees

  Secondary Table:
      City
      Foundation Year
      Annual Revenue
      Number of Employees


2. Complete the navigation bar (expandable), complete the user and company tables, and consider page layout and aesthetics.

3. Complete the development of the following components for the data dashboard page.

  Data Card:
      Number of Companies
      Total Revenue
      Countries Covered
      Number of Employees

  Data Circle: Company Tier Percentage (mouseover state + data table)

  Line Chart: Year * Number of Companies (cumulative figures)
  
4. Create a dynamic bar chart component for the company. Use drop-downs and buttons to control/filter content. For example, add filters or dimension drop-downs to adjust the data users see. Use your imagination and creativity to complete this part. You can use database data:

  Dimensions: Company Level, Country, City
  Filters:
      Company Level Dropdown
      Country
      City
      Founding Date (Range) (founded_year) (start, end)
      Annual Revenue (Range) (min, max)
      Number of Employees (Range) (min, max)

    request form:
    {
        dimension: level, country, city
        filter:{
            level:[1, 2, 3],
            country:[],
            city:[],
            founded_year:{
                start:,
                end:,
            },
            annual_revenue:{
                min:,
                max:,
            }
            employees:{
                min:,
                max:,
            }
        }
    }
```

companies.csv:

| company_code | company_name                    | level | country | city     | founded_year | annual_revenue | employees |
| ------------ | ------------------------------- | ----- | ------- | -------- | ------------ | -------------- | --------- |
| C0           | Rodriguez, Figueroa and Sanchez | 1     | China   | Beijing  | 1994         | 317736         | 4606      |
| C01          | Doyle Ltd                       | 2     | Japan   | Nagoya   | 1917         | 429408         | 889       |
| C02          | Mcclain, Miller and Henderson   | 2     | China   | Hangzhou | 1954         | 894345         | 310       |

relationships.csv:

| company_code | parent_company |
| ------------ | -------------- |
| C0           |                |
| C01          | C0             |
| C02          | C0             |
| C03          | C0             |
| C04          | C0             |
| C05          | C0             |
| C06          | C0             |
| C07          | C0             |
| C08          | C0             |
| C09          | C0             |
| C10          | C0             |
| C11          | C0             |



# <u>02. 后端 Nest</u>

## ⓪ 环境配置

- **新建 Nest 项目**

  ```bash
  nest new nest-project
  cd nest-project
  ```

- **添加环境变量文件**：创建 `.env.dev`、`.env.prod`，填写数据库、端口等配置

- **安装基础依赖**

  ```bash
  npm install @nestjs/config @nestjs/typeorm typeorm mysql2
  npm install -D ts-node tsconfig-paths
  ```

- .env ➡️ app.config.ts ➡️ typeorm.config.ts ➡️ app.modules (实时更新) 
  ➡️ entity.ts ➡️ dto ➡️ service ➡️ controller ➡️ module ➡️ app.modules (实时更新)



## ① init 数据库&实体 + CSV 导入

1. **目标**：把本地的两份 CSV 文件（`companies.csv` 和 `relationships.csv`）导入到 MySQL 里，并用 TypeORM 定义好对应的 `Company` 实体，表示公司及其母子结构。
2. **为什么这样做？**
   - **TypeORM**：用 TypeScript 类来映射数据库表，少写 SQL、可自动建表。
   - **配置拆分**：把数据库连接放在 `config`，通过环境变量（`.env`）管理敏感信息，方便开发/生产环境切换。
   - **Seed 脚本**：专门的脚本把 CSV 导入数据库，保持主程序简洁，也便于重新执行导入。

### 1. app.config.ts：读取 .env 配置

```ts
// src/config/app.config.ts

// —— 问题 1 ——
// import * as dotenv from 'dotenv'; 是什么？
// 这是一个 npm 库，用来读取项目根目录下的 `.env` 文本文件。
// 它会把文件里的每一行 "KEY=VALUE" 加载到 Node.js 全局的 process.env 对象里。
// 例如 .env:
//   DB_HOST=127.0.0.1
//   DB_PORT=3306
// 调用 dotenv.config() 后，就能在代码中通过 process.env.DB_HOST 拿到 "127.0.0.1"。
import * as dotenv from 'dotenv';
dotenv.config();  // 立刻加载 .env 文件里的所有 KEY=VALUE，挂到 process.env 上

// 导出一个函数，返回我们需要的所有配置项给 NestJS 或其他模块使用
export default () => ({
  // 应用启动端口，从环境变量 PORT 读，没提供就用 3000
  port: parseInt(process.env.PORT ?? '3000', 10),

  // 数据库连接信息都从环境变量里来，保证不写死在源码中
  db: {
    host: process.env.DB_HOST,                            // DB_HOST=127.0.0.1
    port: parseInt(process.env.DB_PORT ?? '3306', 10),    // DB_PORT=3306
    username: process.env.DB_USER,                        // DB_USER=root
    password: process.env.DB_PASS,                        // DB_PASS=MyLocal@1234
    database: process.env.DB_NAME,                        // DB_NAME=nest_company_db
  },
});
```

> **`dotenv.config()` 做了什么？**
>
> 1. 它读取 `.env` 文件；
> 2. 把每一行 `KEY=VALUE`，都挂到 Node.js 全局的 `process.env` 里。`process.env` 是 Node.js 提供的全局对象，用于访问环境变量。所以执行完 `dotenv.config()` 后，你就可以在代码里用 `process.env.DB_HOST` 拿到 `"127.0.0.1"`。

------

### 2. typeorm.config.ts：连接+实体映射

在 `config/typeorm.config.ts` 中，我们新建了一个 `DataSource` 实例，告诉 TypeORM 要连哪个数据库，用哪些实体来建表。  为什么要分开写？
  1. 单一职责：app.config.ts 专注读取环境变量并组织配置对象；
  2. typeorm.config.ts 专注把配置映射到 TypeORM DataSource；
  3. 解耦：业务代码仅依赖 DataSource，不关心具体环境变量结构；
  4. 可测性：在测试环境只替换 app.config.ts 即可，不必改动 ORM 配置。

```ts
// src/config/typeorm.config.ts

import { DataSource } from 'typeorm';              // TypeORM 核心类，用来建立连接
import appConfig from './app.config';              // 我们刚写的配置函数
import { Company } from '../modules/company/company.entity';  // Company 实体

// 调用 appConfig()，取出 db 对象
const { db } = appConfig();

export const AppDataSource = new DataSource({
  type: 'mysql',               // 数据库类型：MySQL
  host: db.host,               // 从 .env 中读取
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.database,
  entities: [Company],         // 告诉 TypeORM 哪些实体要映射到表，后续要加入user
  synchronize: false,
  logging: false,              // 不输出 SQL 日志
});
```

> **补充说明**
>
> - 当 `synchronize: true` 时，TypeORM 会根据实体类自动在数据库创建空表（只有列结构）。
>
> - **开发环境**（你自己在本地写代码、调试时），常常希望改了实体就能马上看到效果，就可以临时开 `synchronize: true`。
>
> - **生产环境**（部署上线的服务器），千万不能让程序自动改表，因为可能误删数据或报错。所以要保持 `synchronize: false`，并用 **迁移脚本** 或 DBA 来管理表结构变更。
>
> - 当你第一次启动并且 `synchronize: true` 时，如果数据库里还没有 `companies` 表，TypeORM 会自动新建一个。此时表里是空的，只有表结构。后续你再调用 Seed 脚本往表里插入数据，才会看到行数据。
>
> - Nest 启动时，TypeORM 连接数据库，然后看到 `synchronize: true`，会自动对比实体定义和数据库当前表结构，自动生成或修改表格来“同步”到实体的最新状态。
>
>   ```
>   npm run typeorm:schema:sync
>   ```

------

### 3. company.entity.ts：定义实体

```ts
// src/modules/company/company.entity.ts

import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

/**
 * @Entity({ name: 'companies' })
 * 把这个类标记为实体，对应数据库里名为 companies 的表
 */
@Entity({ name: 'companies' })
export class Company {
  /** companyCode 主键，映射到列 company_code */
  @PrimaryColumn({ name: 'company_code', type: 'varchar', length: 10 })
  companyCode: string;

  /** companyName 对应 company_name 列 */
  @Column({ name: 'company_name', type: 'varchar', length: 255 })
  companyName: string;

  /** 问题 3：为什么这里没有写 name？
   *  如果不写 name，TypeORM 默认把字段名当作列名，
   *  也就是列名 level。如果需要不同名才写 name 字段。
   */
  @Column({ type: 'tinyint', unsigned: true })
  level: number;

  /** country、city 同理，不写 name 则列名与字段名保持一致 */
  @Column({ type: 'varchar', length: 100 })
  country: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  /** 如果想要列名是 founded_year，就写 name */
  @Column({ name: 'founded_year', type: 'int', unsigned: true })
  foundedYear: number;

  @Column({ name: 'annual_revenue', type: 'bigint', unsigned: true })
  annualRevenue: number;

  @Column({ type: 'int', unsigned: true })
  employees: number;

  /** —— 问题 4：自关联（父子公司）解释 —— */

  /** 一个公司可以有一个母公司（多对一） */
  // ManyToOne，Many = Company，One = 👇
  // () => Company,  “告诉 TypeORM：关联的目标实体也是 Company”
  // (parent目标实体对象) => parent.children,  “告诉 TypeORM：在父公司对象上，存子公司的属性叫 children”
  // 如果是 @OneToOne(() => Company)就ok了
  @ManyToOne(() => Company, (c) => c.children, { nullable: true })
  // 在数据库表上，用 parent_company 这列存父公司主键
  @JoinColumn({ name: 'parent_company' })
  parentCompany?: Company;

  /** 反过来，一个公司可以有多个子公司（一对多） */
  @OneToMany(() => Company, (c) => c.parentCompany)
  children: Company[];
}
```

> - **`@ManyToOne`**：在“子公司”这一端，**多对一**，即「多个子公司」指向「同一个母公司」。
>   - `() => Company` 告诉 TypeORM：关联的目标实体也是 `Company`。
>   - `(c) => c.children`：这是反向关系，指向对方类里哪个属性存储「它的子公司」；`c` 就代表“目标实体的实例”，也就是另一个 `Company` 对象。`.children` 则是那个对象上的属性名，正是由下面的 `@OneToMany` 装饰的那一行。
>   - `parentCompany?: Company;` 这个字段就是用来表示“当前这个公司实例到底是谁的子公司”。
>     - **“当前实例”**：假设你在代码里拿到一个 `Company` 对象，叫它 `company`。
>     - **`company.parentCompany`**：就是指向它的“母公司”（Parent Company），也就是说，**`company` 是子公司**，而 `company.parentCompany` 指向的那一条记录，则是它的母公司。
>   - `{ nullable: true }`：母公司可以为空，顶层公司没有父公司时就是 `null`。
>   - `@JoinColumn({ name: 'parent_company' })`：在数据库表里，会有一列 `parent_company` 存放母公司的主键。
> - **`@OneToMany`**：在“母公司”端，**一对多**，即「一个母公司」可以有「多个子公司」。
>   - `() => Company` 同样关联到自己，`(c) => c.parentCompany` 指向对方类里哪个属性存「它的母公司」。
>   - TypeORM 会自动把两者关联起来，不需要你手动写外键。
>   - `children: Company[]`（子公司列表）
>   - `(c) => c.parentCompany`：告诉系统，“每个子公司”身上，都有一个 `parentCompany` 字段指向它的母公司。
> - `nullable: true` 允许顶级公司无父公司。

------

### 4. seed.ts：CSV 导入数据库

return new Promise<Company[]>((resolve, reject) => { … }) 是什么？

- Promise 是用于处理异步操作的一种“容器”或“占位符”。它表示一个尚未完成但将来会完成（或失败）的异步任务，并最终“兑现（fulfill）”出一个值，或者“拒绝（reject）”一个错误。Promise 有三种状态：
  - **Pending（等待）**：刚创建，还没完成也没失败
  - **Fulfilled（已完成）**：操作成功，生成了一个值
  - **Rejected（已拒绝）**：操作失败，产生了一个错误
- 使用者可以对它调用 `.then()` 来拿成功值，或 `.catch()` 拿错误：在 `async/await` 语法中，`await p` 会等待 Promise 完成并返回它 `resolve` 的值，或抛出它 `reject` 的错误。
- 为什么这里要 `new Promise<Company[]>`？在 Node.js 里，`fs.createReadStream(...).pipe(csv())` 这种**基于事件**（`.on('data')` / `.on('end')`）的接口，**本身不是** Promise；它是通过回调或事件来通知“什么时候读完”，不方便直接用 `await`。
   我们把它**手动“包装”**到一个 Promise 里，这样调用方就可以用 `await importCompanies()` 得到一个 `Company[]` 数组，而不用写一堆回调。
- `<Company[]>` 是什么？这是 TypeScript 的**泛型**（Generic）语法，告诉编译器：“这个 Promise 最终 `resolve(...)` 出来的值，一定是 `Company[]`（公司实体组成的数组）。”

- `(resolve, reject) => { … }` 是什么？这是给 `new Promise()` 的**执行器函数**（executor function）。读文件过程中：如果出错，直接调用 reject(err)，如果一切读完，就调用 resolve(companiesArray)

```ts
/**
 * Seed 脚本分三步：
 * 1. importCompanies(): 读取 companies.csv → 生成 Company 实例列表
 * 2. importRelationships(): 读取 relationships.csv → 给对象设置 parentCompany
 * 3. main(): 初始化 DB → save 第一次（只插入空关联数据） → save 第二次（写入 parent_company 外键）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parser';       // CSV 解析库
import { AppDataSource } from '../config/typeorm.config';
import { Company } from '../modules/company/company.entity';

// CSV 假设放在项目根的 /data 文件夹
const DATA_DIR = path.resolve(__dirname, '../../data');

// ─── 1⃣️ 读取 companies.csv ───
async function importCompanies() {
  const file = path.join(DATA_DIR, 'companies.csv');
  const companies: Company[] = [];

  return new Promise<Company[]>((resolve, reject) => {
    // fs.createReadStream(file)：打开文件读流
    // .pipe(csv())：把每行内容交给 csv-parser 解析，自动把每行 CSV 文本转成 JS 对象
    fs.createReadStream(file)
      .pipe(csv())
      // —— 问题 5：.on('data', ...) 是什么意思？每读到一行，就会得到一个 row 对象
      // 'data' 事件：当解析器读到一行数据，就触发一次 data，参数 row 是这一行的字段对象
      // 例如 row = { company_code: 'C0', company_name: '...', level: '1', ... }
      .on('data', (row) => {
      	// 每行 CSV 都构造一个新的实体对象并收集到数组，最后 `resolve(companies)` 时这个数组就包含所有行对应的对象。
        const company = new Company(); 

        // 按列赋值，并把字符串转成数字
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
      .on('end', () => resolve(companies))  // 读完触发 'end'，返回 companies 列表
      .on('error', reject);                 // 读文件或解析出错时触发 'error'
  });
}

// ─── 2⃣️ 读取 relationships.csv ───
async function importRelationships(allCompanies: Company[]) {
  /** 问题 6：把数组转成 Map，方便 fast lookup
   * allCompanies.map(c => [c.companyCode, c]) 会生成 [ ['C0', Company], ['C01', Company], ... ]
   * new Map(...) 则变成从 code 到 Company 的映射，
   * 之后用 map.get(code) 即可 O(1) 找到对象。
   */
  const map = new Map(allCompanies.map((c) => [c.companyCode, c]));
  const file = path.join(DATA_DIR, 'relationships.csv');

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csv())
      .on('data', (row) => {
        // —— 问题 7：这段把父子关系建立在对象上
        const child = map.get(row['company_code']);      // 拿到子公司实例
        const parentCode = row['parent_company'];        // 读到母公司的 code
        // 如果子公司和母公司 code 都存在，就把 child.parentCompany 指向该母公司对象
        if (child && parentCode) {
          child.parentCompany = map.get(parentCode)!;
        }
      })
      .on('end', () => resolve())
      .on('error', reject);
  });
}

// ─── 3⃣️ 主函数：把一切连接起来 ───
async function main() {
  await AppDataSource.initialize();                // 初始化 DataSource，建立与数据库的连接
  const repo = AppDataSource.getRepository(Company); // 拿到 Company 实体对应的 Repository 命名 repo 来做增删改查
  // AppDataSource 内部持有了数据库连接、实体映射等配置。拿到仓库后，我们就可以写 repo.save()、repo.find()、repo.delete() 等，来对 companies 表做增删改查。

  const companies = await importCompanies();       // 1. 导入公司基本信息
  //  先保存实体，写入表（无 parent_company）执行 INSERT INTO companies (...)
  await repo.save(companies);                     

  await importRelationships(companies);            // 2. 建立对象间的父子引用
  await repo.save(companies);                      // 再保存一次，写入 parent_company 外键

  console.log(`✔️  Imported ${companies.length} companies.`);
  await AppDataSource.destroy();                   // 断开 DB 连接
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

> **`'data'` 事件**：流（stream）每处理完一段数据，就会发一个 `data`，在这里对应 CSV 的「一行」。
>
> **`'error'` 事件**：当读取文件或解析过程中出现任何错误，就会触发 `error`，我们把它 `reject(error)`，让 Promise 失败。
>
> **`'end'` 事件**：数据流读完了，触发 `end`，我们在这儿 `resolve`，告诉外面「数据已全部准备好」。

------

### 5. app.module.ts：启动时初始化

在 `app.module.ts` 中，我们把 `config/typeorm.config.ts` 中的 `AppDataSource.options` 传给 `TypeOrmModule.forRoot()`，让 NestJS 在启动时把 TypeORM 初始化起来并执行同步。

Nest 启动时，TypeORM 连接数据库，然后看到 `synchronize: true`，会自动对比实体定义和数据库当前表结构，自动生成或修改表格来“同步”到实体的最新状态。当 NestJS 启动时，它会：

1. 读入 `AppDataSource.options`，
2. 调用 TypeORM 的 `DataSource.initialize()` 去 **建立连接**，
3. 如果 `synchronize: true`，就 **扫描所有实体**（`entities` 数组），
4. 对比数据库当前结构，**自动生成或更新表和字段**，使之匹配实体定义。

```ts
// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import { AppDataSource } from './config/typeorm.config'; // 注意到 config/typeorm.config.ts 建立连接 & 创建实体
import { CompanyModule } from './modules/company/company.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
    // 这里会把 DataSource.options 应用到 TypeORM 实例：
    TypeOrmModule.forRoot(AppDataSource.options),
    CompanyModule,
  ],
})
export class AppModule {}
```

### 6. package.json：辅助脚本

```jsonc
{
  "scripts": {
    "start": "nest start",
    // 同步实体到数据库（开发时可用），会创建空的 companies 表
    "typeorm:schema:sync": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js schema:sync",
    // 运行 seed 脚本，把 CSV 导入数据库
    "seed": "ts-node -r tsconfig-paths/register src/scripts/seed.ts"
  },
  "dependencies": {
    "@nestjs/common": "...",
    "@nestjs/core": "...",
    "@nestjs/typeorm": "...",
    "typeorm": "...",
    "mysql2": "...",
    // CSV 解析库
    "csv-parser": "^3.0.0"
  },
  "devDependencies": {
    // 让我们能直接用 ts-node 跑脚本，并支持 tsconfig-paths
    "ts-node": "^10.0.0",
    "tsconfig-paths": "^4.0.0"
  }
}
```

1. **安装新增依赖**

   ```bash
   npm install csv-parser ts-node tsconfig-paths --save-dev
   ```

2. **同步表结构**（开发阶段）：会自动在数据库里创建 `companies` 表（空表，仅结构）。

   ```bash
   npm run typeorm:schema:sync
   ```

3. **导入数据**

   ```bash
   npm run seed
   ```

   - 从 `data/companies.csv` 和 `data/relationships.csv` 读取，写入数据库。

4. **验证**：查看行数和父子关联是否正确。

   ```sql
   SELECT COUNT(*) FROM companies;
   SELECT * FROM companies WHERE parent_company IS NOT NULL LIMIT 5;
   ```



## ② Company 模块

1. **为什么要用 Module/Controller/Service/DTO？** NestJS 借鉴了 Angular 的分层架构，
   - **Module**：把相关组件（Controller、Service、Entity）组织在一起；
   - **Controller**：负责接收 HTTP 请求、调用 Service、返回响应；
   - **Service**：执行业务逻辑，如拼 SQL；
   - **DTO**（Data Transfer Object）：定义请求参数格式并校验，保证进入 Service 的数据合法。
2. **“维度 × 过滤”查询怎么做？**
   - 前端告诉我们“按哪个字段分组”（`dimension`），以及可选的多个筛选条件（`filter`）；
   - 在 Service 里利用 TypeORM 的 **QueryBuilder** 动态构造 SQL：
     - `WHERE …` 部分对应 filter；
     - `GROUP BY dimension` + `JSON_ARRAYAGG(JSON_OBJECT(...))` 实现分组聚合并把每组记录打包成 JSON 数组；
   - 最后把查询结果整理成题目要求的 `{ dimension, data: { … }, filter? }` 格式返回。

### 1. DTO 定义请求参数结构+校验

- **数据校验**：保证前端传来的参数符合我们预期的格式和类型，避免 Service 收到错误数据造成崩溃。
- **自动转换**：结合 `class-transformer`，可以把原生的 JSON（`req.body`）转换成我们定义的类实例，便于后续代码中使用面向对象的方式访问属性。
  - `dimension`：告诉后端要按哪一列分组（level／country／city）。决定按照什么分类显示。
  - `filter`：可选的多种条件，用来做 WHERE … AND … 之类的过滤。决定只显示哪些符合条件的数据。

**`@IsIn(['level','country','city'])`**：运行时，若请求体中的 `dimension` 字段不是这三者之一，Nest 会直接返回 `400 Bad Request`，并告诉你“dimension must be one of …”。这样可以第一时间拦截拼写错误或恶意请求。

1. **请求进来**，Nest 的 `ValidationPipe` 会扫描所有 DTO。
2. **class-transformer**：把 `req.body` 里的 JSON 从 `{ founded_year: { start: "1990" } }` 转成 `{ founded_year: RangeNumberDtoInstance }`（`start` 会被转换成 number 类型）。
3. **class-validator**：先看 `@IsOptional`：有就校，不带就跳过。再看 `@IsArray`、`@IsInt`、`@Min`、`@ValidateNested`……一条一条跑校验。`class-validator`/`class-transformer` 联合使用，可在 Controller 接收到请求体时自动校验并转换成对应类实例。
4. **校验结果**：每个字段上用装饰器声明“我期望它是什么样子”，Nest 会在进入 Controller 前跑一遍校验，出错自动 400。全部通过 → 进入 Controller；任一失败 → Nest 自动抛 400 错误，响应里会列出“哪个字段”“为什么不合法”。

```ts
// src/modules/company/dto/search-company.dto.ts

// 来自 class-validator 的装饰器，用于在 DTO 上声明校验规则
import {
  IsIn,           // 验证值必须在指定数组内
  IsOptional,     // 验证字段可省略
  IsArray,        // 验证值是数组
  ArrayMaxSize,   // 验证数组最大长度
  ValidateNested, // 验证嵌套对象
  IsInt,          // 验证整数
  Min,            // 验证数值最小值
} from 'class-validator';

// 来自 class-transformer，用于把 JSON 转成 DTO 类实例
import { Type } from 'class-transformer';

/** 定义一个“区间”类型，有可选的 start、end */
export class RangeNumberDto {
  @IsOptional()         // 可不传
  @IsInt()              // 如果传了，必须是整数
  @Min(0)               // 而且 ≥ 0
  start?: number;

  @IsOptional()					// 装饰器（Decorator），来源：class-validator
  @IsInt()
  @Min(0)
  end?: number;
}

/** 定义一个“最小-最大”类型，有可选的 min、max */
export class MinMaxDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  min?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  max?: number;
}

/** 定义所有可用的过滤条件 */
export class FilterDto {
  @IsOptional()
  @IsArray()            // 必须是数组
  @ArrayMaxSize(10)     // 最多 10 个元素
  level?: number[];     // 例如 [1,2,3]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  country?: string[];   // 例如 ["China","Japan"]

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  city?: string[];      // 例如 ["Beijing","Nagoya"]

  // 嵌套验证：founded_year 要符合 RangeNumberDto 规则
  @IsOptional()
  @ValidateNested() // 告诉验证器“这是一个嵌套的 DTO，要把它里面的字段（如 start、end）也按照对应的 DTO 类来再校验一次”。
  // 在把“纯 JSON”转换成类实例时，指定把这块 JSON 转成 RangeNumberDto 类的实例。
  @Type(() => RangeNumberDto) // 来源：class-transformer，转换时先 new RangeNumberDto()
  // 看到元数据告诉它“founded_year 应该是 RangeNumberDto 类型”，
  // 这一步就生成了一个 RangeNumberDto 实例，它的构造函数把 start, end 属性先赋给实例，再按类型（number）做转换。
  // class-transformer 默认能把字符串 '1990' 转成数字 1990，因为属性在 RangeNumberDto 上声明为 start: number;
  founded_year?: RangeNumberDto;

  // annual_revenue 要符合 MinMaxDto
  @IsOptional()
  @ValidateNested()
  @Type(() => MinMaxDto)
  annual_revenue?: MinMaxDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => MinMaxDto)
  employees?: MinMaxDto;
}

/** 最终前端发来的 DTO 总结构 */
export class SearchCompanyDto {
  // dimension 必须是 'level' 或 'country' 或 'city'
  @IsIn(['level', 'country', 'city'])
  dimension: 'level' | 'country' | 'city';

  // filter 整体可省略，省略时不做任何过滤
  @IsOptional()
  @ValidateNested()
  @Type(() => FilterDto)
  filter?: FilterDto;
}
```

------

### 2. Service：CURD SQL + 整理结果

- 整个 nestjs 都是 依赖注入（需要去复用的实体类实例化后，想要用的时候直接在DI容器里用） 的项目。

- **DI容器：重点关注 modules 里的 providers: [xxxService]，在xxxService里的constructor的Repository进行实例化，实例化后全部存在容器里，然后按需进行调用**

  - 注册所有 @Injectable() 注解的类
  - 通过 Constructor 了解类与类之前的依赖关系：Nest 就知道 “要想 new 出一个 `CompanyService`，首先需要拿到一个 `Repository<Company>` 的实例”。同理，在 `CompanyController` 里 Nest 知道 “要实例化 `CompanyController`，需要先有一个 `CompanyService` 实例”。
  - NestJS 自动创建 @Injectable() 注解的类实例（自动实例化）
  - NestJS 自动创建依赖关系的实例
  - 按需进行调用：当有 HTTP 请求到达 `/company/search` 时，Nest 会找到对应的 `CompanyController` 实例，调用它的 `search()` 方法。该方法内部调用已经注入好的 `CompanyService.search()`，执行业务逻辑并返回结果。

- 在 Service 中注入 Repository 就可以进行 CURD 操作了，CURD 都封装到了 typeorm 里。为了方便查看typeorm语句，可以在app.module.ts里写入 logging: true，typeorm语句会在运行时返回对应SQL到日志里。下面是QueryBuilder

  - ```ts
    // service.ts
    // 也可以写成 return this.logsRepository.query('SELECT * FROM logs');
    findLogsByGroup(id: number) {
        // SELECT logs.result as result, COUNT(logs.result) as count from logs, user 
      	// WHERE user.id = logs.userId AND user.id = 2 GROUP BY logs.result;
        return this.logsRepository
        .createQueryBuilder('logs')
        .select('logs.result', 'result') // result 就是 alias 别名
        .addSelect('COUNT("logs.result")', 'count')
        .leftJoinAndSelect('logs.user', 'user')
        .where('user.id = :id', { id })
        .groupBy('logs.result')
      	// .orderBy('count', 'DESC') 从小到大排列
      	// .addorderBy('result', 'DESC')
      	// .limit(3) 只查3条
        .getRawMany();
    }
    
    // controller.ts
    @Get('/logsByGroup')
    async getLogsByGroup(): Promise<any> {
        const res = await this.userService.findLogsByGroup(2);
        return res.map((o) => ({
            result: o.result,
            count: o.count,
        }));
    }
    ```

  - ```ts
    // 理解：
    return {
      dimension: dto.dimension,
      data,                 // 相当于 data: data
      ...(dto.filter ? { filter: dto.filter } : {}), 
    // 三元表达式，如果 dto.filter 存在，就把 { filter: dto.filter } 里的属性展开进来，否则展开一个空对象（什么都不加）
    };
    
    const base = { a: 1, b: 2 };
    
    const withC = { ...base, c: 3 }; // 如果要加上 c:3，就可以写
    // → { a:1, b:2, c:3 }
    
    // 也可以先动态生成一个对象
    const condition = true;
    const extra = condition ? { c: 3 } : {};
    const result = { ...base, ...extra };
    // → { a:1, b:2, c:3 }
    
    // 如果 condition = false
    const extra2 = false ? { c: 3 } : {};
    const result2 = { ...base, ...extra2 };
    // → { a:1, b:2 }
    ```
    
  - `.getRawMany<{ dimension_value: string; items: any }>()` 
    
    - **`.getRawMany()` 方法**：来自 TypeORM 的 `QueryBuilder`。它会执行之前拼好的 SQL，然后**直接把数据库返回的“原始行”**以数组形式返回——每一行就是一个 JavaScript 对象，键对应 SQL 里 `AS` 别名的名称。与之相对的是 `.getMany()`，后者会把结果“映射成实体对象”（比如 `Company` 实例），而 `.getRawMany()` 不做任何实体映射。
    
    - **`< { dimension_value: string; items: any } >` ** 是 TypeScript 的**泛型（Generics）**语法。它告诉编译器：**“我期望这批原始行，每个对象都有两个字段——`dimension_value`（字符串）和 `items`（任意类型）”**。这样做的好处是：
      1. **类型检查**：后续在代码里访问 `row.dimension_value` 或 `row.items` 时，编辑器和编译器会知道它们的类型，不会报错。
      2. **自动补全**：写 `row.` 时就能看到 `dimension_value`、`items`，提高开发效率。

```ts
// src/modules/company/company.service.ts

import { Injectable } from '@nestjs/common';          // Nest 的依赖注入装饰器
import { InjectRepository } from '@nestjs/typeorm';    // 注入 TypeORM 仓库
import { Repository, SelectQueryBuilder } from 'typeorm'; // ORM 的核心类型
import { Company } from './company.entity';            // 我们定义的实体映射
import { SearchCompanyDto, FilterDto } from './dto/search-company.dto';

@Injectable()  // 标记这是一个可注入的“服务”
export class CompanyService {
  constructor(
    // ① 把 Company 实体对应的 Repository 注入进来，方便后续做 CRUD
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  /**
   * ② 主方法：根据前端传来的 DTO，返回“维度 + 聚合数据 + （可选）过滤条件”
   */ // 内部有 await 就要用 async
  async search(dto: SearchCompanyDto) {
    // 2.1) createQueryBuilder('c') → 相当于 SQL: FROM companies AS c
    // this：指向当前的 CompanyService 实例，你可以通过 this.repo 拿到注入进来的 Repository<Company>。
    const qb = this.repo.createQueryBuilder('c');

    // 2.2) 如果前端传了 filter，就拼接 WHERE … 条件
    // dto 的类型是我们定义的 SearchCompanyDto，它有两个属性：export class SearchCompanyDto { dimension filter?
		// dto.filter 就是前端在请求体里可能附带的 “过滤条件” 对象
    this.applyFilters(qb, dto.filter);

  /* 2.3) SELECT 子句：分两部分
       a) c.${dto.dimension} AS dimension_value  ← 分组字段。
    			 ${dto.dimension} 会被替换成 'level'、'country' 或 'city'。
       b) JSON_ARRAYAGG(JSON_OBJECT(...)) AS items ← 把多行一次性打包成 JSON 数组，减少后端多次查询与合并。
    			 等于 JSON_OBJECT('company_code', c.company_code, 'company_name', c.company_name) */
    const rows = await qb
      .select([
        `c.${dto.dimension} AS dimension_value`,
        'JSON_ARRAYAGG(JSON_OBJECT(' +
          '"company_code", c.company_code,' +
          '"company_name", c.company_name,' +
          '"level", c.level,' +
          '"country", c.country,' +
          '"city", c.city,' +
          '"founded_year", c.founded_year,' +
          '"annual_revenue", c.annual_revenue,' +
          '"employees", c.employees' +
        ')) AS items',
      ])
      .groupBy(`c.${dto.dimension}`) // 2.4) 按 dimension 字段分组
      .getRawMany<{ dimension_value: string; items: any }>();
      // getRawMany(): 不把结果映射成实体，直接给我们原始行数据。执行 SQL 并把结果原生返回给 TypeScript。
    	// 不做实体映射：返回的是“原始行结构”，便于我们自行解析 items 字段。

    // 2.5) 把数据库返回的 rows（例如 [{dimension_value:'China',items:'[...]'}, …]）
    //      整理成 { China: [...], Japan: [...], … } 这种键值对
    // 			Record<string, any[]>：TS 类型，意思是：键（key）是字符串 string，值（value）是任意类型数组 any[] 的对象
    // 			Record<K,V> 是 TS 内置的一个映射类型（mapped type），等价于写 { [key: K]: V }。
    const data: Record<string, any[]> = {};
		// 遍历 rows 数组，把每一行的结果处理后放入 data
    rows.forEach((row) => {
      if (row.items == null) return; // 某组无数据就跳过

      // items 有时是字符串，需要 JSON.parse；有时已经是 JS 对象，直接用
      const items = typeof row.items === 'string' ? (JSON.parse(row.items) as any[]) : row.items;
    	
      // 把这一组的数组，存到 data 对象里，key 用 row.dimension_value（比如 "China"、"Japan"）
      data[row.dimension_value] = items;
    });

    // 2.6) 最终返回给 Controller，Controller 再给前端
    return {
      dimension: dto.dimension,       // echo 回去分组字段
      data,                           // 各个分组下的数组
      ...(dto.filter ? { filter: dto.filter } : {}), // 可选把 filter 回显
    };
  }

  /**
   * ③ applyFilters：把 FilterDto 动态拼成 SQL WHERE 条件
   TypeORM 的 QueryBuilder 支持链式写法，每次调用 andWhere()，它就把新的条件用 AND 接在已有的 WHERE 子句后面。
   */
  private applyFilters(qb: SelectQueryBuilder<Company>, f?: FilterDto) {
    if (!f) return; // 没传 filter → 不加任何 WHERE

    // 数组类型的直接 IN 查询，如果 f.level 有值，就加上 AND c.level IN (:...levels)
    if (f.level?.length)
      qb.andWhere('c.level IN (:...levels)', { levels: f.level });

    if (f.country?.length)
      qb.andWhere('c.country IN (:...cts)', { cts: f.country });

    if (f.city?.length)
      qb.andWhere('c.city IN (:...cities)', { cities: f.city });

    // 区间类型：start/end
    if (f.founded_year?.start !== undefined)
      qb.andWhere('c.founded_year >= :fyStart', { fyStart: f.founded_year.start });
    if (f.founded_year?.end   !== undefined)
      qb.andWhere('c.founded_year <= :fyEnd',   { fyEnd:   f.founded_year.end });

    // 最小-最大类型：min/max
    if (f.annual_revenue?.min !== undefined)
      qb.andWhere('c.annual_revenue >= :revMin', { revMin: f.annual_revenue.min });
    if (f.annual_revenue?.max !== undefined)
      qb.andWhere('c.annual_revenue <= :revMax', { revMax: f.annual_revenue.max });

    if (f.employees?.min !== undefined)
      qb.andWhere('c.employees >= :empMin', { empMin: f.employees.min });
    if (f.employees?.max !== undefined)
      qb.andWhere('c.employees <= :empMax', { empMax: f.employees.max });
  }
}
```

- **`createQueryBuilder('c')`**：相当于 SQL 里的 `FROM companies AS c`；

- **`andWhere(sql, params)`**：拼接 `AND WHERE`，`params` 会自动替换到 `:...` 占位符；

- **`JSON_ARRAYAGG` / `JSON_OBJECT`**：MySQL 内置函数，用于把多行聚合成 JSON 数组；

- **`getRawMany()`**：拿到未经 ORM 转换的“原生”数据，方便我们自己解析。

- ```sql
  SELECT
    c.country AS dimension_value,
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'company_code', c.company_code,
        'company_name', c.company_name,
        'level', c.level,
        'country', c.country,
        'city', c.city,
        'founded_year', c.founded_year,
        'annual_revenue', c.annual_revenue,
        'employees', c.employees
      )
    ) AS items
  FROM companies c
  WHERE c.level IN (1,2)
  GROUP BY c.country;
  ```

  ```sql
  WHERE # applyFilters 会拼出：
    c.country IN ('China','Japan')
    AND c.founded_year >= 1950
    AND c.founded_year <= 2000
    AND c.employees >= 100
    AND c.employees <= 500
  ```

------

### 3. Controller：暴露 HTTP 接口

```ts
// src/modules/company/company.controller.ts

import { Body, Controller, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { SearchCompanyDto } from './dto/search-company.dto';

@Controller('company') // 所有路由都以 /company 开头
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  /** POST /company/search */
  @Post('search')
  async search(
    @Body() dto: SearchCompanyDto, // Nest 会自动把请求体解析成 SearchCompanyDto 并校验
  ) {
    // 调用 Service，并把它返回的 Promise 结果直接当成 HTTP 响应
    return this.service.search(dto);
  }
}
```

- `@Controller('company')`：定义路由前缀。
- `@Post('search')`：对应 POST `/company/search`。
- `@Body()`：注入请求体并自动校验 DTO。

------

### 4. Module：把 Controller/Service/Entity 串联起来

```ts
// src/modules/company/company.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './company.entity';           // 实体
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]), // 在本模块里注册 Company 实体的 Repository
  ],
  controllers: [CompanyController],      // 注册 Controller
  providers:   [CompanyService],         // 注册 Service
  exports:     [CompanyService],         // 若别的模块要用也能导出
})
export class CompanyModule {}
```

- `TypeOrmModule.forFeature([Company])`：告诉 Nest，本模块要用 Company 实体对应的 Repository，注入时才会找到。

------

### 5. 全局挂载：app.module.ts

```ts
// src/app.module.ts （关键片段）

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';           // 环境变量
import { TypeOrmModule } from '@nestjs/typeorm';         // TypeORM 全局
import appConfig from './config/app.config';
import { AppDataSource } from './config/typeorm.config';
import { CompanyModule } from './modules/company/company.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),  // 全局加载 .env
    TypeOrmModule.forRoot(AppDataSource.options),                // 连接数据库
    CompanyModule,                                               // 挂载我们的 Company 功能
  ],
})
export class AppModule {}
```

1. **Module** 负责组织；
2. **Controller** 负责接 HTTP 请求并参数校验；
3. **Service** 用 TypeORM 的 **QueryBuilder** 动态构造 SQL，实现“任意维度分组” + “可选多条件过滤”；
4. **DTO** 保证前端请求数据合法、易维护。

这样，通过分层，每个部分职责清晰：要改校验规则只改 DTO，要改 SQL 逻辑只改 Service，要改路由只改 Controller。



## ③ User 模块

1. **定义数据结构（实体 Entity）**
   - 在数据库里我们要有一张 `users` 表，对应到程序里就是一个 `User` 类（Entity）。
   - 用 TypeORM 提供的装饰器（Decorator）标记：表名、列名、主键、自动生成时间戳等。
   - 主键选用 UUID，让前后端更安全、不容易冲突。
2. **输入校验（DTO）**
   - 所有进到后端的请求体（body）都用 DTO（Data Transfer Object）来定义格式。
   - 用 `class-validator` 提供的注解做格式校验，比如 `@IsEmail()`、`@Length()`。
   - 对更新操作，我们用 `PartialType()` 一次性把所有字段都变成可选。
3. **业务逻辑层（Service）**
   - Service 里注入 TypeORM 的 `Repository<User>`，提供基础的 ORM 方法：`create`、`save`、`find`、`findOne`、`remove` 等。
   - 根据不同的 CRUD 操作，写对应的异步函数（`async`），并在找不到数据时抛出 `NotFoundException`。
4. **控制器层（Controller）**Controller 接收 HTTP 请求，用装饰器把 URL 和方法对应到 Service。
5. **模块化（Module）**上面三层统一注册成一个模块：`UserModule`，在 `AppModule` 里导入，让整套 CRUD API 能被全局识别。
   - **Controller** 关心“哪个 URL、哪个方法”
   - **Service** 关心“要对数据做什么操作”
   - **DTO/Entity** 关心“数据长什么样”

### 1. user.entity.ts

```ts
import {
  Entity,             // 标记一个类为数据库表
  PrimaryGeneratedColumn, // 标记主键，并自动生成
  Column,             // 标记普通列
  CreateDateColumn,   // 自动写入创建时间
  UpdateDateColumn,   // 自动写入更新时间
} from 'typeorm';

@Entity({ name: 'users' }) // 对应数据库里名为 'users' 的表
export class User {
  // 主键 — UUID 格式，TypeORM 会在插入时，自动生成符合 RFC4122 的唯一标识符 
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  fullName: string;

  // 唯一邮箱，unique: true 会在数据库层面添加唯一索引，防止重复
  @Column({ unique: true, length: 120 })
  email: string;

  // 手机号（可选），nullable: true 允许该列为 NULL
  @Column({ length: 20, nullable: true })
  phone?: string;

  // 角色字段，默认值 'user'，可以根据业务扩展成 'admin' / 'editor' 等
  @Column({ length: 30, default: 'user' })
  role: string;

  // 自动生成创建时的时间戳，在插入新行时，TypeORM 会自动填充当前时间
  @CreateDateColumn()
  createdAt: Date;

  // 自动生成每次更新时的时间戳，在更新行时，TypeORM 会自动改成当前时间
  @UpdateDateColumn()
  updatedAt: Date;
}
```

- `@Entity()` 告诉 TypeORM 这是张表。
- `@PrimaryGeneratedColumn('uuid')` 让 TypeORM 用 UUID 做主键。
- `@Column()` 定义列属性：长度、是否唯一、是否可空、默认值等。时间戳字段用专门的装饰器自动维护。

------

### 2. 输入校验 DTO

**DTO（Data Transfer Object）** 的作用

- **对象化**：把前端发过来的 JSON 自动转换成一个有类型、有校验规则的类实例。
- **统一校验**：利用 `class-validator`，在进入 Service 之前就能拦截非法数据，保证业务逻辑里拿到的 DTO 已经是“干净”的。

**为什么只要 2 个 DTO？**

- **创建用户**（Create）需要必填字段：`fullName`、`email`，以及可选的 `phone`、`role`。所以有一个 `CreateUserDto`。
- **更新用户**（Update）和创建几乎一样，只不过所有字段都可选——前端只想改哪个就传哪个。所以我们用 Nest 提供的 `PartialType()`，自动把 `CreateUserDto` 里的所有字段标记为可选，就得到 `UpdateUserDto`，而不需要把同样的注解再抄一遍一遍地写一遍。

#### 新增用户：create-user.dto.ts

```ts
import {
  IsEmail,    // 验证字段是合法 email
  IsOptional, // 可选字段
  IsString,   // 验证字段是 string
  Length,     // 验证字符串长度范围
} from 'class-validator';

export class CreateUserDto {
  @IsString()              // fullName 必须是字符串
  @Length(2, 120)          // 长度在 2 到 120 之间
  fullName: string;

  @IsEmail()               // email 必须满足 email 格式
  @Length(5, 120)          // 长度在 5 到 120 之间
  email: string;

  @IsOptional()            // phone 字段可以不传
  @IsString()              // 但如果传了，一定要是字符串
  @Length(5, 20)           // 长度在 5 到 20
  phone?: string;

  @IsOptional()            // role 也是可选
  @IsString()
  @Length(3, 30)           // 例如 "user"、"admin"
  role?: string;
}
```

> **原理：** Nest 在接收到请求后，会把 JSON 自动转换成 DTO 实例，然后跑一遍校验，若不通过就会返回 400 错。

#### 更新用户：update-user.dto.ts

```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

/**
 * PartialType() 会把 CreateUserDto 里的所有字段自动变成
 *   @IsOptional()
 *   <原校验规则>
 * 这样就不用手动重复写一遍
 */
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

------

### 3. 业务逻辑层：user.service.ts

| 方法                          | 用途 & 说明                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `repo.create(data)`           | 根据传入的普通对象（`Partial<User>`）构造出一个 `User` 实例，**不写库**。 |
| `repo.save(entity)`           | 如果实体有主键就 `UPDATE`，没主键就 `INSERT`；完成后返回“最新”的实体（带自增 ID、时间戳等）。 |
| `repo.insert(data)`           | 直接执行 `INSERT`，不会检查或返回完整实体，性能上略优于 `save()`（适合大量数据）。 |
| `repo.update(criteria, data)` | 直接执行 `UPDATE ... SET ... WHERE criteria`，不返回更新后的实体，只返回结果元信息。 |
| `repo.delete(criteria)`       | 直接执行 `DELETE FROM ... WHERE criteria`。                  |
| `repo.remove(entity)`         | 接受一个或数组实体，执行 `DELETE`，并会触发实体上的生命周期钩子（如果有的话）。 |
| `repo.find(options?)`         | 相当于 `SELECT *`，常用于列表查询。可以传 `where`、`order`、`relations` 等选项。 |
| `repo.findOne(options)`       | `SELECT ... WHERE ... LIMIT 1`，返回单个实体或 `undefined`。 |
| `repo.findOneBy(where)`       | 与 `findOne({ where })` 类似，但参数更简洁：只接收 `where` 条件。 |
| `repo.findBy(where)`          | `findBy({ age: 18 })` → `SELECT * WHERE age = 18`。          |
| `repo.count(options?)`        | 返回符合条件行数，等效 `SELECT COUNT(*) ...`。               |
| `repo.exist(options?)`        | 返回 `boolean`，判断某条记录是否存在。                       |
| `repo.merge(entity, ...dto)`  | 把若干个“源”对象拷贝到已存在实体上（类似于 `Object.assign`，但它会保持实体的原型链）。 |
| `repo.createQueryBuilder()`   | 构建更灵活的 SQL 查询，比如分页、复杂关联、聚合等。使用前需要 `import { SelectQueryBuilder } from 'typeorm'`。 |

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';                     // 我们刚才定义的实体
import { CreateUserDto } from './dto/create-user.dto';    // 请求校验类
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable() // 标记这个类可以被 NestDI（依赖注入）管理
export class UserService {
  constructor(
    /** 注入 TypeORM 的 Repository<User>，提供增删改查方法 */
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  /** 创建新用户 */
  async create(dto: CreateUserDto) {
    const user = this.repo.create(dto); // repo.create() 只是把 dto 转为 User 实例，还没存库
    return this.repo.save(user);  // save() 才会真正写入数据库，并返回完整的 user（含 id、时间戳）
  }

  /** 查所有用户 */
  async findAll() {
    return this.repo.find(); // find() 返回 User[]，相当于 SELECT * FROM users
  }

  /** 根据 id 查单个 */
  async findOne(id: string) {
    const user = await this.repo.findOne({ where: { id } }); // 相当于 SELECT * WHERE id = ?
    if (!user) // 如果找不到，抛出 404 异常，Nest 会自动转成 HTTP 404
      throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  /** 更新用户：Object.assign(target, source); 会把 source 所有字段复制到原 target 对象上，覆盖同名字段。
  const target = { a: 1, b: 2 };
  const source = { b: 20, c: 30 };
  Object.assign(target, source);
  console.log(target); // { a:1, b:20, c:30 }
  */
  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id); // 先查一次，确保用户存在
    Object.assign(user, dto); // 把 dto 里的字段拷贝到 user 对象上
    return this.repo.save(user); // 保存修改，TypeORM 会执行 UPDATE
  }
  
  /** 删除用户 */
  async remove(id: string) {
    const user = await this.findOne(id); // 同样先查一次，抛 404
    await this.repo.remove(user); // remove() 会执行 DELETE
    return { deleted: true }; // 返回一个简单对象，告诉前端删除成功
  }
}
```

------

### 4. 控制器层：user.controller.ts

```ts
import {
  Body,       // 从请求体中取数据
  Controller, // 标记控制器
  Delete,     // HTTP DELETE
  Get,        // HTTP GET
  Param,      // 从 URL 参数取数据
  Patch,      // HTTP PATCH
  Post,       // HTTP POST
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user') // 所有路由前缀都是 /user
export class UserController {
  constructor(private readonly service: UserService) {}

  /** POST /user — 创建用户 
  1. create(@Body() dto: CreateUserDto)：@Body()=前端JSON → JavaScript 对象 → DTO 类（CreateUserDto）的实例
	2. return this.service.create(dto)：Service 层会把这个 dto 转成 Entity、写库，然后把新用户对象返回给前端。*/
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  /** GET /user — 获取所有用户 */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  // GET /user/:id — 根据 id 查用户。@Param('id')：把 URL 里的 :id 赋值给方法参数 id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** PATCH /user/:id — 更新用户：@Body() dto: UpdateUserDto 把请求体 JSON 转成 UpdateUserDto 
    @Post('update/:id')
    update(@Param('id') id: string,@Body() dto: UpdateUserDto,) {
      return this.service.update(id, dto);
    }*/
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  /** DELETE /user/:id — 删除用户 
  @Post('delete/:id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }*/
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

- `@Controller('user')`：基础路径
- `@Post()`, `@Get()`, `@Patch()`, `@Delete()`：对应不同 HTTP 方法
- `@Body() dto`：自动把 JSON 转成 DTO 并校验
- `@Param('id')`：拿 URL 里 `/user/123` 的 `123`

------

### 5. 模块注册：user.module.ts

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';           // 实体
import { UserService } from './user.service';   // 服务
import { UserController } from './user.controller'; // 控制器

@Module({
  imports: [
    TypeOrmModule.forFeature([User]), // 注册 User 实体到 TypeORM
  ],
  providers: [UserService],           // 注入到 DI 容器
  controllers: [UserController],      // 控制器也注入
})
export class UserModule {}
```

安装额外依赖：`class-validator` / `class-transformer` 已在阶段 ② 装过，无需重复。

```bash
npm i @nestjs/mapped-types          # PartialType 用
```

同步表结构并启动

```bash
npm run typeorm:schema:sync
npm run start
```



## ④ Auth 模块 + JWT 保护

新增依赖

```bash
npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt passport-local
npm i -D @types/bcrypt          # 类型声明（可选）
```

env 追加 JWT 密钥，生产请放到安全位置

```
JWT_SECRET=secretkey
JWT_EXPIRES=3600s
```

### 0. Pipe

- **Pipe** 是 Nest 提供的一种“请求数据处理”机制，既能做 **数据转换**（Transform），也能做 **验证／过滤**（Validation/Filtering），Nest 内置了一个非常常用的 `ValidationPipe`，它正是用来配合 `class-transformer`+`class-validator` 做 DTO 校验和自动类型转换的。它接收方法参数里的原始值（来自 `@Body()`、`@Param()`、`@Query()` 等），然后：

  1. **转换**：比如把字符串 `"123"` 变成数字 `123`；
  2. **校验／过滤**：比如借助 `class-validator` 把 DTO 里不合法的字段拦下、或者丢弃额外的字段。

- **请求验证（DTO - Validation）**：接收→ 先把 JSON → DTO 类实例 → 校验 → 你的业务逻辑

  - 当客户端发来一个 JSON（plain object）时，NestJS 会用 `class-transformer` 的 **`plainToInstance()`** 把它转换成你定义的 DTO 类实例。
  - 然后再用 `class-validator` 校验这些实例上的装饰器，如 `@IsEmail()`、`@Length()` 是否都满足。
  - 如果你不做转换，就拿不到类上定义的校验规则，校验管道就没法工作。

- **响应序列化（Serialization）**：返回→ 类实例 → 转成 JSON → 发给客户端

  - 当你在控制器里直接 `return userEntity`（一个 TypeORM 实体实例）时，Nest 会用 `class-transformer` 的 **`instanceToPlain()`** 自动把它转成普通 JSON，才能发到客户端。
  - 在这个过程中，你可以用装饰器（`@Expose()`、`@Exclude()`、`@Transform()`）精细控制哪些字段要展示／隐藏，以及它们的输出格式。
  - `@Exclude()` 只对 **序列化** 有作用：**在最终的 HTTP 响应 JSON 里，**要把它过滤掉，**不要包含在输出里。**

- 管道三个层级：

  - **控制器级别：**把 `MyPipe` 装到控制器类上，这个控制器下的每个路由都会先经过 `MyPipe`。

    ```ts
    @Controller()
    @UsePipes(MyPipe)      // ← 把管道应用到整个控制器中，所有路由都走这个管道
    export class UsersController { … }
    ```

  - **参数级别：**仅对某一个参数（如 `@Body('username')`）启用 `SomePipe`，其他参数不受影响。

    ```ts
    @Controller()
    export class UsersController {
      @Get('/users')
      findAllUsers(
        @Body('username', SomePipe) username: string  // ← 只对 body.username 这个参数用管道
      ) { … }
    }
    ```

  - **全局级别：**最顶层、最通用：应用内所有控制器、所有路由、所有参数默认都会走这个管道。

    ```ts
    async function bootstrap() {
      const app = await NestFactory.create(AppModule);
      app.useGlobalPipes(new MyPipe()); // ← 把管道注册为全局后，所有进到应用的请求都会先经过它
      await app.listen(3000);
    }
    ```

- **我们项目里**：只用了**全局级**的 `ValidationPipe` + `ClassSerializerInterceptor`，没有在单个控制器或参数上额外挂管道。一个请求到Controller Route Handler分为三步：

  1. 请求 POST /auth/signin {"username": "toimc", "password": "123456"}
  2. Validation Pipe = DTO =「类实例」和「普通 JSON 对象」之间互转 = NestJS 推荐用 **面向对象** 的方式来定义 DTO 和实体，而不是直接操作松散的 JS 对象
     - class-transformer：转化请求数据为 DTO 类的实例
     - class-validator：使用正则等逻辑进行校验
     - return 结果：如果校验失败，立即响应前端
  3. Controller Route Handler



### 1.  user.entity.ts 加入密码哈希列

**同步表结构**：`npm run typeorm:schema:sync`（开发）生产库请使用迁移或手动 ALTER。

```ts
// src/modules/user/user.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { Exclude } from 'class-transformer';   // ← add this line
  
  @Entity({ name: 'users' })
  export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    // @Exclude() 是来自 class-transformer 库的一个装饰器
    // class-transformer 专门负责在 TypeScript/JavaScript DTO 类实例 和 普通 JSON 对象 之间做相互转换的库
		// npm run typeorm:schema:sync 会生成这个column
    // 但用于告诉序列化器（serializer）在把对象转换为纯 JSON 时，跳过这个属性
    @Exclude()
    @Column({ name: 'password_hash', select: false })
    passwordHash: string;
  }
```

### 2. user.service.ts 新增 findByEmail

```ts
async findByEmail(email: string, withPassword = false) {
  return this.repo.findOne({
    where: { email },
    select: withPassword ? ['id', 'email', 'fullName', 'role', 'passwordHash'] : undefined,
  });
}
```

### 3. auth/dto 

```ts
// src/auth/dto/register.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';

export class RegisterDto {
  @IsString() 
  @Length(2, 120) 
  name: string;
  
  @IsEmail()  
  @Length(5, 120) 
  email: string;

  @IsString() 
  @Length(4, 50)  
  password: string;
}
```

```ts
// src/auth/dto/login.dto.ts
import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail() 
  @Length(5, 120) 
  email: string;

  @IsString()
  password: string;
}
```



### 4. strategy.ts 策略类

- **LocalStrategy（我能登陆吗，这是我的帐号和密码，给我JWT通行证）**：只在登录这一步被触发。

  - **登录阶段（Local）**：Client 发 `POST /auth/login { username, password }`

    **LocalStrategy**

    1. 拆出 `username`、`password`
    2. 调用 `AuthService.validateUser()` 去数据库比对密码
    3. 成功后返回一个 `user` 对象 → 挂到 `req.user`（req.user用于生成token）

    **Controller** 再调用 `AuthService.login(req.user)`，用 `JwtService.sign()` 生成一个 JWT，返回给客户端 Client

    **注册**接口会直接给你颁发一个 Token，和登录接口返回的效果是一样的。

    ```ts
    async register(name: string, email: string, rawPwd: string) {
      // ...省略邮箱重复校验和哈希逻辑...
      const user = await this.users.create({ /* user data */ } as any);
      return this.login(user); // 注册完成后，直接复用 login() 来签发 token
    }
    async login(user: { id: string; email: string; role: string }) {
      const payload = { sub: user.id, email: user.email, role: user.role };
      return { access_token: this.jwt.sign(payload) };
    }
    ```

- **JwtStrategy（我已经登陆了，给你看我没过期的有效JWT，我要访问）**：有`@UseGuards(AuthGuard('jwt'))`的触发

  - **后续调用（JWT）：**Client 存好 token 后，发 `GET /user` 并 HTTP Header 带上 JWT

    ```
    Authorization: Bearer <your_jwt_token>
    ```

    **JwtAuthGuard** 拦截请求，触发 **JwtStrategy**

    1. `ExtractJwt.fromAuthHeaderAsBearerToken()` 从头部取出 token

    2. 用 `secretOrKey` 验签，检查签名 & 过期时间

    3. 通过后调用 `validate(payload)`，返回解码后的 `payload`：

       ```
       { sub: userId, email: userEmail, role: userRole }
       ```

       后续控制器里你可以通过 `req.user.sub` 拿到用户 ID，或用 `req.user.role` 做权限判断；不必每次都去数据库查用户，只要在 Token 签发时把必要的信息放入 `payload`，就能快速读取。

    4. Nest 挂载结果到 `req.user`

    **Controller** 收到经过鉴权的请求，`req.user` 就是已认证用户的信息，可以安全地执行业务



#### Local 策略 = 用户名+密码校验

和官网一模一样

```ts
// src/auth/local.strategy.ts
import { Strategy } from 'passport-local';              // 引入 passport-local 策略
import { PassportStrategy } from '@nestjs/passport';    // Nest 对 Passport 的封装
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }
  // 这个方法是 Passport-local 策略的核心：
  // 当用户调用登录接口（被 AuthGuard('local') 保护）时，Passport 会自动调用这个方法，并传入用户名和密码
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    return user; // 返回值会被挂到 request.user 上，供 Controller / 后续 Guard 使用
  }
}
```



#### JWT 策略 = Token 验签

负责 **Token 验签 = 过没过期 & payload 提取**，与 Local 策略分离：一个负责凭证校验，一个负责签名校验

```ts
// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }               from '@nestjs/passport';
import { ExtractJwt, Strategy }           from 'passport-jwt';
import { ConfigService }                  from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  // 1. 通过 ConfigService 读取环境变量（密钥）
  constructor(cfg: ConfigService) {
    const secret = cfg.get<string>('JWT_SECRET'); // cfg.get('JWT_SECRET') 拿到 .env 里的密钥。
    if (!secret) throw new UnauthorizedException('Missing JWT_SECRET'); // 如果没有密钥报错
    super({
      // 2. jwtFromRequest 指定从请求头的 Authorization: Bearer <token> 抽取 Token
      // 3. ignoreExpiration: false 不允许过期 Token 通过
      // 4. secretOrKey 用来验签的密钥，必须和 JwtModule 注册时用的密钥一致
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), 
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Token 验签通过后会继续运行validate：payload === decode(token). 你可以再去数据库查全量用户信息
  // 如果验签失败，Passport-JWT 在内部就会直接抛出一个 UnauthorizedException 并中断调用链，不会执行你的 validate()，Nest 会最终返回 HTTP 401 Unauthorized 给客户端。
  // 如果你想在 Token 被证明合法后，再做些额外操作，就在这里实现 validate()
  // validate() 是覆写 PassportStrategy 提供的钩子
  validate(payload: { sub: string; email: string; role: string }) {
    return payload;  // 若要查库：return this.usersService.findById(payload.sub);
  }
}
```



### 5. 守卫：拦截/跳过鉴权

**NestJS 中用来做路由鉴权／跳过鉴权**：全局 JWT 守卫（Guard） 和 公有路由标记（Decorator）

- **策略** (`JwtStrategy`)：实现了该怎么**解读**并**校验**Token
- **守卫** (`JwtAuthGuard`)：实现了在每次请求进来时，要不要校验 Token，如果要，就用名字 `'jwt'` 去调用策略”。
  - **跳过**：碰到 `@Public()` 的路由，直接 `return true`，不触发后续的 JWT 验证。
  - **验证**：否则把请求交给 `passport-jwt`（也就是你实现的 `JwtStrategy`），做 Token 解码、验签、过期检查。
- 守卫 **无需** 也 **不应该** 直接 `import JwtStrategy`，模块负责连接它们，它只需指定策略名（'jwt'），剩下的由 Nest 与 Passport 自动衔接完成。
  - **JwtAuthGuard**：继承了 `AuthGuard('jwt')`，在运行时调用 Passport 去执行名为 `'jwt'` 的策略。

```ts
// app.module.ts 
providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },  // 全局启用 Guard
  ],
```

- 这里把 `JwtAuthGuard` 当作 **全局守卫（APP_GUARD）** 注册，Nest 会在每一次 HTTP 请求时都先执行它。

  - **请求进来** → 进入全局守卫 `JwtAuthGuard.canActivate()`

    **检查 @Public()**

    - 有标记 → `return true` → 控制器执行，不校验 Token
    - 没标记 → `super.canActivate()` → 走 **JwtStrategy** 验证 Token

    **JwtStrategy** 验证通过 → 调用它的 `validate()` → `req.user` 被赋值 → 控制器执行

    如果 Token 验证失败，一路抛出 `UnauthorizedException` → 最终返回 HTTP 401

```ts
// src/auth/jwt-auth.guard.ts 全局守卫
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { // 指定策略名 'jwt'
  constructor(private reflector: Reflector) {
    super();
  }

  /** 跳过 @Public() 标记的路由 */
  canActivate(ctx: ExecutionContext) {
    const isPublic = this.reflector.get<boolean>('isPublic', ctx.getHandler());
    return isPublic ? true : super.canActivate(ctx);
  }
}
```

```ts
// src/auth/public.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const Public = () => SetMetadata('isPublic', true);
```



### 6. `auth/auth.service.ts`

- **凭证校验**（validateUser）：接收用户名/邮箱和密码，查库取出哈希后的密码并用 `bcrypt.compare` 比对，校验通过后剔除敏感字段返回用户对象，否则返回 `null`。

  - **请求到达** `/auth/login`，Nest 先看 `@UseGuards(AuthGuard('local'))`，执行 `AuthGuard('local').canActivate()`

    ```
    AuthGuard('local')` 会触发 Passport 的 `passport-local` 策略，也就是你的 `LocalStrategy.validate()
    ```

    `LocalStrategy.validate()` 调用 `AuthService.validateUser()` 校验用户名和密码

    如果返回非空用户，Guard 放行并把那个用户挂到 `req.user`，然后你的 Controller `login()` 就能拿着它去签 JWT

- **用户注册**（register）：检查邮箱唯一性，将纯文本密码用 `bcrypt.hash` 加密后存入数据库，然后复用登录逻辑直接签发 JWT。

- **JWT 签发**（login）：接收一个用户对象，构造包含用户 ID、邮箱和角色的 JWT Payload，通过 `JwtService.sign(payload)` 生成 `access_token`，并返回给客户端。

```ts
// src/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../modules/user/user.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserService, // UserService：用于对用户表做增删改查，注册时保存新用户、登录时查找用户。
    private readonly jwt: JwtService, // JwtService：Nest 封装的 JWT 工具，用来生成（sign）和验证 Token。
  ) {}

  // LocalStrategy 调用此方法做凭证校验
  // ① 根据用户名（或邮箱）查找用户，withPassword = true 表示连密码哈希也取出来
  // ② 如果找到了用户，再用 bcrypt.compare() 将用户输入的纯文本密码与数据库里的哈希比对
  // ③ 验证通过：把 user 对象里的 passwordHash 字段剔除（安全考虑），返回剩下的属性
  async validateUser(username: string, password: string) {
    const user = await this.users.findByEmail(username, true);
    if (user && (await bcrypt.compare(password, user.passwordHash))) {
      const { passwordHash, ...result } = user as any; // 成功：剔除 passwordHash 再返回
      return result;
    }
    return null;
  }

  /** 哈希 + 存库 + 生成 JWT */
  async register(name: string, email: string, rawPwd: string) {
    if (await this.users.findByEmail(email)) {
      throw new BadRequestException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(rawPwd, 10);
    const user = await this.users.create({
      fullName: name,
      email,
      passwordHash,
      role: 'user',
    } as any);
    return this.login(user);  // 注册后直接登录，二次重用 login()
  }

  /** JWT 签发：Local 登录或注册后调用 */
  async login(user: { id: string; email: string; role: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
    // 使用 JwtService.sign() 生成 Token，只有payload的原因是：
    // 我们都把密钥和统一的过期策略放在模块配置 auth/auth.module.ts 里，然后只在业务逻辑里传 payload 就行了。
    // 这样可以保证密钥集中管理，也不会在业务代码里不小心泄漏或写错。
      access_token: this.jwt.sign(payload),
    };
  }
}
```



### 7. `auth/auth.controller.ts`

```ts
import { Controller, Post, UseGuards, Request, Body } from '@nestjs/common';
import { AuthService }           from './auth.service';
import { Public }                from './public.decorator';
import { RegisterDto }           from './dto/register.dto';
import { LoginDto }              from './dto/login.dto';
import { AuthGuard }             from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 注册：公开路由
  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.email, dto.password);
  }

  // 登录：使用 LocalStrategy 校验用户名/密码，登录成功后，validate() 返回的 user 会被注入到 req.user
  // 如果没有 @Public()，当你访问 POST /auth/login 时，会先被 JwtAuthGuard 要求检查 Bearer Token，显然此时你还没拿到 Token——就会直接 401。
  @Public() // ① 跳过全局 JwtAuthGuard（即不用 Bearer Token）
  @UseGuards(AuthGuard('local'))
  @Post('login')
  login(@Request() req) {
    return this.auth.login(req.user); // 登录通过后，req.user = validate() 返回的 user 对象
  }
}
```



### 8. `auth/auth.module.ts`

```ts
import { Module }                from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule }             from '@nestjs/jwt';
import { PassportModule }        from '@nestjs/passport';

import { UserModule }            from '../modules/user/user.module';
import { AuthService }           from './auth.service';
import { AuthController }        from './auth.controller';
import { LocalStrategy }         from './local.strategy';
import { JwtStrategy }           from './jwt.strategy';

@Module({
  imports: [
    ConfigModule,  // 提供 ConfigService
    PassportModule,    // 提供 Passport 初始化
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      // 注册密钥
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET'),
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES') },
      }),
      inject: [ConfigService],
    }),
    UserModule,        // 导入 UserService
  ],
  providers: [
    AuthService,
    LocalStrategy,     // 本地策略
    JwtStrategy,       // JWT 策略
  ],
  controllers: [AuthController],
  exports: [PassportModule],
})
export class AuthModule {}
```



### 9. 额外

`app.module.ts` 追加 AuthModule + 全局 Guard

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
/* …其他 import… */
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    /* 原有模块 … */
    AuthModule,             // ← 新增
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },   // 全局启用
  ],
})
export class AppModule {}
```

在需要开放的路由加 `@Public()`，在 **CompanyController / UserController** 里，如果你想让「查看公司列表」保持公开，就在对应方法上加：除了我们显式标记 @Public() 的路由，其余全部受 JwtAuthGuard 保护。

我们在 app.module.ts 里已全局启用了 JwtAuthGuard，就不必再写 @UseGuards，可以显式标记 @Public() 的路由

```ts
@Public() // @UseGuards(AuthGuard('jwt')) 局部守卫：要求请求头带合法 JWT，已全局启用了 JwtAuthGuard，就不必再写 @UseGuards
@Get()
findAll() { … }
```

其余未标记的接口将自动需要 `Authorization: Bearer <token>`。

```bash
npm run typeorm:schema:sync # 同步新列
npm run start # 启动
```

### 10. 测试

- `Content-Type: application/json` 就是把这条信息带给后端，让它知道：请把我拿到的请求体当成 JSON 来解析
  - 在 **Postman** 里，在 **Body → raw → JSON** 下输入了 JSON，Postman 会**自动**在请求里加上这个。
  - 但在真实业务中，一定要显式地设置 Content-Type: application/json
  - 所有写操作（注册、登录、搜索、CRUD）都用 **JSON (`application/json`)**，因为它最简单、最灵活，和前端框架天然契合。
  - 如果业务需要（如文件上传、传统表单、XML 集成），可以改用其他 Content-Type，只要在 Nest 里配置对应的拦截器、管道或第三方解析器即可。

```ts
// axios
axios.post('/auth/login', { email, password }, {
  headers: { 'Content-Type': 'application/json' }
});
```

| 项目            | 值                                                           |
| --------------- | ------------------------------------------------------------ |
| Method / URL    | `POST http://localhost:3000/auth/register`                   |
| Headers         | `Content-Type: application/json`                             |
| Body (raw JSON) | `{"name":"Test User","email":"test@test.com","password":"test"}` |

| 项目         | 值                                            |
| ------------ | --------------------------------------------- |
| Method / URL | `POST http://localhost:3000/auth/login`       |
| Headers      | `Content-Type: application/json`              |
| Body         | `{"email":"test@test.com","password":"test"}` |

调用受保护接口（示例：获取所有用户）

| 项目         | 值                               |
| ------------ | -------------------------------- |
| Method / URL | `GET http://localhost:3000/user` |
| Headers      | Authorization<br />Bearer token  |

若 token 正确且接口未标记 `@Public()` → 返回 200 与数据；若缺少或无效 → 返回 401 Unauthorized





### 总结

想象你和朋友周末去夜店玩，整个认证流程就像是从门口到包厢的“入场+VIP通行”：

▶️ 1. 先办会员卡（Register 注册）

1. **你走到会员中心**（`POST /auth/register`）
2. 他们让你填表：`name`/`email`/`password` → 你给了信息
3. **AuthService.register()** 就像后台办卡工作人员：
   - 检查你是不是已经办过卡（`users.findByEmail(email)`）
   - 给你的密码做加密（`bcrypt.hash`），把“明文密码”存在档案里太危险
   - 存好你的档案（`users.create()`）
   - 最后直接给你一张“当天VIP入场券”（`return this.login(user)`）

------

▶️ 2. 办理入场凭证（Login 登录 + LocalStrategy）

1. **你带着身份证明**（填写好的 `email`+`password`）去门口保安处（`POST /auth/login`）
2. 门口有个**Local Guard**（`@UseGuards(AuthGuard('local'))`） ➡️ LocalStrategy ➡️ AuthService.validateUser() 成功就放行
   - 当客户端向 `/auth/login` 发送登录请求时，请求首先被路由上的 `@UseGuards(AuthGuard('local'))` 拦截
   - Nest 会调用 Passport 的 “local” 策略（`LocalStrategy`），它自动从请求体里读取 `email` 和 `password`，并执行 `LocalStrategy.validate()`，该方法内部调用 `AuthService.validateUser()`，到数据库查找用户并用 bcrypt 对比密码哈希；如果验证成功，它会返回一个去掉 `passwordHash` 的用户对象并挂载到 `req.user`，`AuthGuard` 于是放行。
   - 控制器的 `login()` 方法随后调用 `AuthService.login()`，通过 `JwtService.sign()` 用统一配置的密钥将用户 ID、邮箱和角色等信息打包成一个带签名的 JWT 令牌（`access_token`）返回给客户端；若在任何一步验证失败，Passport 会抛出 `UnauthorizedException`，最终返回 HTTP 401。
3. **LocalStrategy.validate() 取帐号密码** → 打电话给**AuthService.validateUser() 比对验证**：
4. 保安（`AuthGuard('local')`）收到“你是VIP”后，让你进到兑换处（Controller 的 `login()`），它把“你是谁”放到 `req.user`，可以继续后面的流程。

------

▶️ 3. 领取VIP通行证（JWT 签发）

1. 你在兑换处（`AuthController.login()`）对保安说：“给我通行证吧，我已经验证过身份证了。”
2. **AuthService.login()** 就是通行证制作师傅：
   - 拿到你的身份信息（`user.id`, `email`, `role`）→ 生成一个 **JWT**（签名的数字票证）
   - 把这张票（`access_token`）还给你
3. **为什么要票（JWT）？** 以后你只要拿着这张“当天VIP通行证”（Token）就可以直接在夜店各区域自由通行，不用每个门口都出示身份证。

------

▶️ 4. 后续各区域巡查（受保护路由 + JwtAuthGuard）

1. 你拿着通行证（HTTP Header `Authorization: Bearer <token>`）去夜店小包厢（任何受保护的 API，比如 `GET /user`）。
2. 门口有个**JWT Guard**（全局 `JwtAuthGuard`）：
   - 先看这条路由有没有打 `@Public()` 标记（不用验票）
   - 否则它会执行 `AuthGuard('jwt')` → 触发 **JwtStrategy** 去验票
3. **JwtStrategy** 会：
   - 拆开你的票（Token），用夜店总部的“秘钥”重新算一遍签名
   - 对比票面上的签名和自己算的签名是否一致，且票有没有过期
   - 如果没问题，就把票里的“谁是VIP”信息（`payload`）放到 `request.user`，让你进包厢
   - 否则直接 401，让你出示有效通行证

------

▶️ 5. `@Public()` —— 一些公共区域

- 有些地方不用验票，比如进“预检大厅”（`/auth/login`、`/auth/register`）
- 你在路由上加了 `@Public()`（用 `SetMetadata('isPublic', true)`），**JwtAuthGuard** 就看到“这是公共区域”，放你直接通过，不管有没有票。



## ⑤ Company 模块接入 Redis 缓存

```bash
npm i @nestjs/cache-manager cache-manager cache-manager-redis-store # 运行时
npm i -D @types/cache-manager # 类型声明（可选）
```

.env

```
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
```

### 1. config/cache.config.ts

对，**`cache-manager-redis-store`** 就是一个“把缓存读写操作交给 Redis”而不是放在当前进程内存里的适配器（store）。

- **默认的 Memory Store**
  - `cache-manager` 本身内置了一个内存模式：所有缓存都存在 Node.js 进程里的一个 JavaScript 对象中。
  - **局限**：一旦进程重启，缓存全丢；多进程/多实例间互不共享；对内存压力也难以控制。
- **Redis Store（`cache-manager-redis-store`）**
  - 安装并在 `CacheModule.register()` 里指定 `store: redisStore` 后，所有 `cache.get/set/del` 都会通过网络请求到你配置的 Redis 服务。
  - **好处**：缓存统一存到 Redis 这台独立的内存数据库里，进程重启也不丢（如果你启用了持久化），多实例共享一份缓存，可配置淘汰策略，不会占用应用进程内存。
- **不加 `cache-manager-redis-store`** → 缓存只能存「当前进程内存」，重启丢失、无法跨进程共享。
- **加了 `cache-manager-redis-store`** → 缓存存到 Redis 服务，可共享、可持久化、管理更灵活。

```ts
// dotenv 可以读取你项目根目录下的 .env 文件，并把里面的变量加载到 process.env 里，供后续代码使用。
// cache-manager-redis-store 是一个Redis 存储引擎（store），让 cache-manager 可以把缓存放到 Redis 而不是内存里。
import * as dotenv from 'dotenv'; 
import { CacheModuleOptions } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';     // NEW
dotenv.config(); // 立即执行 dotenv 的配置逻辑，读取 .env，把所有 KEY=VALUE 加到 process.env 中。

// Redis 缓存公共配置 isGlobal: true -> 让 CACHE_MANAGER 全局可注入
// 导出一个默认函数，这个函数返回我们给 NestJS CacheModule 用的配置对象。
// 把缓存“存储引擎”指定为我们刚才导入的 redisStore，as any 是告诉 TS “不要检查类型”，因为该包没有官方声明。
// 从 process.env.REDIS_URL（也就是 .env 里配的 REDIS_URL）读取，如果没有配置就退回到默认 redis://localhost:6379。
export default (): CacheModuleOptions => ({
  store: redisStore as any,  
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  ttl: parseInt(process.env.CACHE_TTL ?? '300', 10),
  isGlobal: true,
});
```

### 2. app.module.ts

```ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';        // 引入 NestJS 自带的缓存模块
import cacheConfig from './config/cache.config';            // 引入刚才写好的缓存配置函数。

/* 其他 import 保持不变 … */
import { CompanyModule } from './modules/company/company.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    // 让 NestJS 在应用启动时初始化 Redis 缓存，并提供一个全局的 CACHE_MANAGER Service。
    CacheModule.register(cacheConfig()),                     
    CompanyModule,
    UserModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
```

### 3. `src/types/cache-manager-redis-store.d.ts` 

(NEW，仅用于解决 TS 声明缺失警告)

```ts
declare module 'cache-manager-redis-store' {
  const value: any;
  export = value;
}
```

### 4. company.service.ts

```ts
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';   // NEW
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Company } from './company.entity';
import { SearchCompanyDto, FilterDto } from './dto/search-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,

    @Inject(CACHE_MANAGER)                                   // NEW
    private readonly cache: Cache,                           // NEW
  ) {}

  /* ---------- Key 生成工具 ---------- 
  1. 缓存所有公司列表，key('all') 输出：company:all
  2. 缓存单个公司，key('id', 'C0') 输出：company:id:C0
  3. 缓存搜索结果，传入一个简单 DTO
      const dto1 = { dimension: 'level', filter: { level: [1, 2] } };
      console.log(key('search', dto1));
   ➡️ JSON.stringify(dto1) => '{"dimension":"level","filter":{"level":[1,2]}}'
			encodeURIComponent(...) => '%7B%22dimension...'
			最终输出：company:search:%7B%22dimension...
  */
  private key(...args: any[]) {
    const prefix = 'company:'; // 1. 前缀，标识这是 Company 模块的缓存
    const parts = args.map((a) => { // 2. 遍历每个参数，分别处理
      if (typeof a === 'string') { // 如果是字符串，就直接用它
        return a;
      } else { // 否则（通常是对象），先转成 JSON 字符串，再 URI 编码
        const json = JSON.stringify(a);
        return encodeURIComponent(json);
      }
    });
    const key = prefix + parts.join(':'); // 3. 把处理后的各段用 “:” 连接起来，再拼回前缀
    return key;
    );
  }

  // 失效所有 Company 相关缓存，如果后台新增/修改/删除了公司数据，需要把这些旧缓存清掉，否则客户端会拿到“脏数据”。
  async clearCompanyCache() {                                // NEW
    const keys = await (this.cache as any).store.keys('company:*');
    await Promise.all(keys.map((k: string) => this.cache.del(k)));
  }

  /* ---------- 查询：全部 ---------- */	
  // get → 命中就走缓存；miss → 查 DB + set → 返回。
  async findAll() {
    const k = this.key('all');               // 1. 生成 key，比如 "company:all"
    const cached = await this.cache.get<Company[]>(k);  // 2. 先从 Redis 里取
    if (cached) return cached;               // 3. 如果有，一秒返回缓存

    const list = await this.repo.find();     // 4. 否则打数据库查所有公司
    await this.cache.set(k, list, 300);      // 5. 查到后写入缓存，TTL 300s
    return list;
	}

  /* ---------- 查询：单条 ---------- */
  async findCompany(code: string) {                          
    const k = this.key('id', code);                          // key: "company:id:C0"
    const cached = await this.cache.get<Company>(k);         
    if (cached) return cached;                               

    const company = await this.repo.findOne({ where: { companyCode: code } });
    if (!company) throw new NotFoundException(`Company ${code} not found`);
    await this.cache.set(k, company, 600);                   
    return company;
  }

  /* ---------- 搜索：维度 × 过滤 ---------- */
  async search(dto: SearchCompanyDto) {                      
    const k = this.key('search', dto);                       // key 包含整个 dto 的 JSON
    const cached = await this.cache.get<any>(k);             
    if (cached) return cached;                               

    /* …原 SQL 聚合逻辑保持不变… */

    await this.cache.set(k, result, 300);                   
    return result;
  }

  /* applyFilters 方法保持不变 … */
}
```

### 5. company.controller.ts

```ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CompanyService } from './company.service';
import { SearchCompanyDto } from './dto/search-company.dto';
import { Public } from '../../auth/public.decorator';        // 如果没有 auth 模块或 Public 装饰器，可去掉

@Controller('company')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}

  /** 🚀 公开：列表（便于测试缓存） */
  @Public()                                                 // 可移除
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** 🚀 公开：详情 */
  @Public()                                                 // 可移除
  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.service.findCompany(code);
  }

  /** 🔍 搜索（依然受 JWT 保护） */
  @Post('search')
  search(@Body() dto: SearchCompanyDto) {
    return this.service.search(dto);
  }
}
```

### 6. 测试

```bash
npm run start
```

若日志中 **不再出现 UnknownDependenciesException / Redis 连接失败** 等错误，说明缓存模块已挂载成功。

| 顺序 | 请求     | URL                           | Headers                                                      | Body                                                      | 说明                                          |
| ---- | -------- | ----------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------- |
| 1    | **GET**  | `{{BASE_URL}}/company`        | 无                                                           | –                                                         | 首次响应慢（走 DB），第二次极快（命中 Redis） |
| 2    | **GET**  | `{{BASE_URL}}/company/C0`     | 无                                                           | –                                                         | 测试单条缓存                                  |
| 3    | **POST** | `{{BASE_URL}}/auth/register`  | `Content-Type: application/json`                             | {"name":"Test","email":"test@test.com","password":"test"} | 获取 `access_token` 并存到环境变量 `TOKEN`    |
| 4    | **POST** | `{{BASE_URL}}/company/search` | `Content-Type: application/json`<br />`Authorization: Bearer {{TOKEN}}` | {"dimension":"level","filter":{"level":[1]}}              | 首次慢、第二次快（同理命中缓存）              |

打开 Postman Console 或在响应面板看 **response time**，即可直观看到缓存效果。

完成以上步骤后，Company 模块的 **findAll / findCompany / search** 三类查询全部具备 Redis 缓存能力，性能大幅提升；`clearCompanyCache()` 可供后续“增删改”时统一失效。

> 若要进一步做 **分页缓存、细粒度失效或分布式部署**，可在此基础上扩展键规则或引入消息队列。祝开发顺利!



# <u>03. 前端 Next</u>

- **Next 页面即路由**；对登录页用公共路由，不包 Layout。
- **MUI 主题**统一 `background.default/paper`，可深浅模式切换。
- **AuthContext** 解析 JWT、持久化、提供 `login/logout`。
- **axios** 单例放 `services/`，用拦截器附 token。
- **ProtectedRoute** 提前重定向以避免闪屏。
- **Charts**：`@mui/x-charts` 的 `PieChart / LineChart / BarChart`。
- **组件粒度**：StatCard / UserTable / CompanyDynamicBar 保持清晰职责。
- **后端对接**：全部走 `/company/search`、`/user`、`/auth/*` 等 Nest 路径。
- **CORS** 与 **端口**：前端 3000、后端 3001，`enableCors` 指向 3000。

## ⓪ 环境配置

```bash
# 1. 建立 Next.js + TypeScript 工程（采用 APP router）
$ npx create-next-app@latest frontend
✔ Would you like to use TypeScript? … Yes
✔ Would you like to use ESLint? … Yes
✔ Would you like to use Tailwind CSS? … No
✔ Would you like your code inside a `src/` directory? … Yes
✔ Would you like to use App Router? (recommended) … Yes
✔ Would you like to use Turbopack for `next dev`? … No
✔ Would you like to customize the import alias (`@/*` by default)? … Yes
✔ What import alias would you like configured? … @/*

$ cd frontend            # 进入工程

# 2. 安装 Material-UI、Emotion、DataGrid、Axios
$ npm i @mui/material @emotion/react @emotion/styled
$ npm i @mui/icons-material          # 图标
$ npm i @mui/x-data-grid             # 表格组件（社区版）
$ npm i axios                        # 前后端通信

# 3. 解决 SSR / CSS 问题需要额外依赖
$ npm i @emotion/server              # 服务端渲染样式抽取
$ npm i -D style-loader css-loader   # 让 Next 能加载 node_modules 内的全局 CSS
```

环境变量在 **`frontend/.env.local`**：

```typescript
NEXT_PUBLIC_API_URL=http://localhost:3000 # 后端 Nest 服务地址
```

后端 CORS（确保浏览器可访问）在 **Nest `main.ts`**：

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:3000' }); // 只放前端域名更安全
  await app.listen(3000);
}
```

### 技术栈总览

| 模块                        | 说明                                                    |
| --------------------------- | ------------------------------------------------------- |
| **Next.js 14 + TypeScript** | 基于 App Router（`pages/` 目录）模式；`next dev` → 3000 |
| **Material-UI 5**           | 主题 / 布局 / 所有 UI 组件                              |
| **@mui/x-data-grid**        | 高级表格（用户列表）                                    |
| **@mui/x-charts**           | 折线 & 环形 & 柱形图                                    |
| **axios**                   | REST 请求；拦截器注入 JWT                               |
| **jwt-decode**              | 解析 `access_token`                                     |
| **Emotion**                 | MUI 默认 CSS-in-JS                                      |

### 前端目录结构

```
.
├── pages/                       # Next 路由
│   ├── _app.tsx                 # 全局包装 & 主题 & Auth 守卫
│   ├── _document.tsx            # Emotion SSR
│   ├── index.tsx                # Dashboard
│   ├── auth/                    # 公共路由
│   │   └── login.tsx
│   └── companies/
│       ├── list.tsx             # 公司列表
│       └── chart.tsx            # 动态条形图
│   └── users/
│       └── list.tsx
├── components/
│   ├── Layout.tsx               # 顶栏+侧栏+主内容
│   ├── Sidebar.tsx              # Drawer / permanent
│   ├── NavItem.tsx              # 递归导航
│   ├── StatCard.tsx             # 仪表卡
│   ├── CompanyLevelDonut.tsx    # 环形图+表
│   ├── CompanyTrendLine.tsx     # 折线图
│   ├── CompanyDynamicBar.tsx    # 动态条形图
│   ├── UserTable.tsx
│   └── CompanyTable.tsx
├── contexts/
│   ├── AuthContext.tsx          # 登录状态 / token
│   └── ColorModeContext.tsx     # 深浅模式
├── services/
│   └── api.ts                   # axios 实例 + JWT 注入
├── theme.ts                     # MUI 深色主题
└── lib
    ├── api.ts                   # axios 实例 + JWT 注入
 		└── createEmotionCache.ts    # Emotion SSR
```

### 构建流程

| Step   | 操作                                                         | 说明 & 关键代码                            |
| ------ | ------------------------------------------------------------ | ------------------------------------------ |
| **1**  | `npx create-next-app@latest dashboard --ts`                  | 生成空项目                                 |
| **2**  | `npm i @mui/material @mui/icons-material @emotion/react @emotion/styled` | UI 依赖                                    |
| **3**  | **主题** `theme.ts` `ts palette.mode='dark'; background { default:'#0d1117'; paper:'#0d1117' }` | 统一深色背景                               |
| **4**  | **全局包装** `_app.tsx` Embed ➜ `<AuthProvider>` + `<ProtectedRoute>` + `<ThemeProvider>` | 登录守卫和主题生效                         |
| **5**  | **侧栏布局** `components/Layout.tsx` 抽屉在 `<Sidebar>`，主内容 `<Box ml={drawerWidth}>` | 响应式 permanent/temporary                 |
| **6**  | `NavItem.tsx` 递归导航                                       | 允许无限级 children                        |
| **7**  | **认证**  ① `AuthContext.tsx` 保存 token→localStorage ② `api.ts` 在请求头注入 `Authorization` | 登录后刷新仍持久化                         |
| **8**  | **登录页** `/auth/login`  (截图视觉)                         | 调 `POST /auth/login`，保存 `access_token` |
| **9**  | **用户列表** `UserTable` + `@mui/x-data-grid`                | 彩色 `status` Chip，复选框                 |
| **10** | **公司列表** `CompanyTable`                                  | 主表 + Collapse 二级行                     |
| **11** | **Dashboard 统计** `<Grid><StatCard/><StatCard/>…`折线 `CompanyTrendLine`、圆环 `CompanyLevelDonut` | 响应式 8+4 布局                            |
| **12** | `CompanyDynamicBar` 组件① Filter 表单 + Slider② 请求`ts const { data } = api.post('/company/search', body)`③ `BarChart` 渲染 | Dimension & Filter 全部动态                |
| **13** | 侧栏加路由 **Dynamic Chart**                                 | `Sidebar` 导航数组增项                     |
| **14** | **CORS** `main.ts` (Nest) `app.enableCors({ origin:'http://localhost:3000', allowedHeaders:'Content-Type,Authorization' })` | 浏览器跨域请求 OK                          |



