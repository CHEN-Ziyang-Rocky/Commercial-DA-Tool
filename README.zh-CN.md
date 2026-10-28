# Historical development notes (Chinese)

The English README is the current entry point for this public source release. Machine-specific deployment records and local acceptance artifacts are not included. Some historical relative documentation links below refer to the private development workspace.

# Commercial DA · Entity Governance

面向集团管理、公司秘书、财务控制与数据运营的**法人资料治理工作台**。用 GLEIF 公开真实法人数据回答：哪些实体资料需要更新、哪些集团关系有来源证据、哪些复核工作需要跟进、最近一次导入改变了什么。

旧的 2,000 条模拟公司、模拟收入/员工数、Demo 页面、`/company` 接口及数据生成器已移除。所有业务列表和图表来自真实公开快照；复核记录由实际操作生成，不预置虚构处理结果。

这是原实习项目的独立扩展版本，不证明任何企业实际采用了此系统。公开实体不等于本公司的客户或子公司。面试中请区分当时实习职责与现在完成的产品改进。

## 面试演示与公司选择（2026-10-27）

完整讲稿与操作顺序见 Bilibili 场景演示手册，本轮改动与验证见 演示版本验收。

Hierarchy root 和 Review portfolio 都可搜索当前快照的全部公司；15 家精选起点只是快捷入口。层级根保持单选，Review portfolio 支持最多 10 家、按 LEI 去重的两代有效关系并集。公开营销案例只在演示文档中提供业务背景，不认定合同主体。首页使用默认收起的 How to use this workspace，不展示大块案例卡片。

## 使用流程

1. **Management overview**：选择集团查询范围，查看续期、资料状态、未分配/逾期复核工作；指标直接跳转对应清单。
2. **Entities & reviews**：名称/历史名称/LEI 检索，集团、地区、实体状态、资料检查、续期、复核状态组合筛选；导出全部匹配记录，复制视图链接共享筛选与当前页。
3. **实体详情**：查看原始记录、直接/最终会计合并母公司及已采集子实体，检查关系或报告例外来源。
4. **复核台账**：管理员选择负责人/团队、快捷设定期限、记录核查依据与下一步；普通用户只读。状态为 Open → In progress → Reviewed，可重新打开。
5. **Source changes**：比较相邻导入的业务字段。旧结论对应的实体证据改变时，提示重新复核，不自动抹掉旧记录。

## 研究与业务说明

- 真实需求、管理指标与迁移方案
- **从零理解到面试讲清楚：中文学习与面试合一手册**（主阅读入口，含通俗原理、28 个追问、演示与 40 小时练习计划）
- 本次升级与验证
- 部署到 analytics.imrocky.com

## 数据口径

来源：GLEIF 官方 API。采集配置见 `backend/registry-data/seeds.json` 和 `scope.json`。

- 15 个公司查询起点（原 8 个加京东集团、京东物流、京东健康、建设银行、苹果、阿里巴巴、Burberry）、两代报告中的直接下属实体，以及直接/最终母公司上下文。
- 香港法定地址、ACTIVE、GENERAL 类别的法人参考样本，按 LEI 排序，配置限制采集页数。它不是随机样本、全香港企业名单或本公司的业务名单。
- 页面显示采集日期、源端符合条件总数、实际采集数、采集截断说明与来源链接。2026-10-23 基础样本为 2,430 个唯一法人；2026-10-27 第一轮补充后为 2,476 个；再加入美国、英国、新加坡和中国内地参考样本后为 2,708 个，原有实体全部保留。基础采集日期没有改写为今天；详情和 CSV 标明实体自己的采集日期。后续总量由来源决定。
- 关系是**会计合并关系**，不是持股比例、最终受益人或完整所有权结构；报告例外不等于资料错误。
- LEI LAPSED 表示登记维护状态，不表示破产。续期逾期仅对 ACTIVE 实体按公开日期计算。
- 30 天包含在 90 天内，两项不能相加；集团查询范围可能重叠，不能把集团数量相加当作全局数量。
- 数据变更中的新增/移除仅表示进出采集范围，不等于新设/注销或收购事件。
- 复核日期按 UTC 日历日；续期按来源时间戳。审核完成只代表内部资料评估，不改变源端状态。

## 已有本地版本升级

先停止原前后端。在项目根目录确认数据库运行：

```bash
docker compose up -d --wait
cd backend
npm ci
npm run registry:init
npm run registry:upgrade
npm run registry:import
CONFIRM_RETIRE_SYNTHETIC=1 npm run db:retire-synthetic
npm run start:dev
```

`registry:init` 只增建 registry 三张表。`registry:import` 校验并事务替换公开快照、记录变化；不会覆盖用户和复核历史。`db:retire-synthetic` 备份旧 companies 表到忽略提交的 `backups/` 后清空，重复执行安全；只用于确认旧表是原模拟数据的数据库。它不创建旧源代码备份。

另开终端：

```bash
cd /Users/chenziyang/Desktop/Project/Commercial-DA-Tool/frontend
npm ci
npm run dev
```

访问 http://localhost:3000 。已有 `.env` 与 `.env.local` 不必覆盖。默认后端 3001、MySQL 3307。日常启动无需再导入数据。

## 全新环境

启动根目录 Compose，后端复制 `.env.example` 为 `.env`，设置随机 `JWT_SECRET` 与管理员凭证。执行：

```bash
cd backend
npm ci
npm run db:init
npm run registry:import
npm run seed:admin
npm run start:dev
```

`db:init` 只允许空数据库。前端复制 `.env.example` 为 `.env.local`，安装依赖后启动。公开注册默认关闭；需要访客时设置 `VISITOR_EMAIL`、`VISITOR_PASSWORD` 后运行 `npm run seed:visitor`。

## 更新公开数据

```bash
cd backend
npm run registry:fetch
npm run registry:import
```

采集使用固定官方域名、分页、重试、三个并发任务；全批成功后才发布快照。导入校验唯一 LEI、内容摘要、关系方向/类型、父级引用和环路。保留原始响应便于溯源。最大 3,000 个实体，超过明确报错，不静默截断。调大采集范围前应评估完整分页和负载；不得把有限范围声称为完整集团。

## API

| 方法与路径 | 用途 | 权限 |
|---|---|---|
| GET `/health` | 数据库连通检查 | 公开 |
| POST `/auth/login` | 登录 | 公开 |
| GET `/auth/me` | 当前身份 | 登录 |
| GET `/registry` | 组合筛选、分页、指标与对比数据 | 登录 |
| GET `/registry/export` | 全部匹配记录 CSV，包含负责人/期限 | 登录 |
| GET `/registry/aggregate` | 公开国家×LEI状态×相对层级 SQL 聚合 | 登录 |
| GET `/registry/cache-status` | 缓存计数与当前进程资源 | 管理员 |
| GET `/registry/changes` | 最近一次有效变化明细与范围外复核提示 | 登录 |
| GET `/registry/:lei` | 实体、关系、来源和审核历史 | 登录 |
| PUT `/registry/:lei/review` | 带版本检查的审核记录更新 | 管理员 |
| `/user`、`/user/:id` | 账号管理 | 管理员 |

## 架构与实际能力

Next.js / MUI → NestJS DTO + JWT → MySQL。`registry_entities` 存公开快照；`registry_dataset` 存范围、来源与最近一次有效对比；`registry_reviews` 存内部评估和追加历史。导入与写复核共享数据集行锁，防止针对替换中的证据保存；审核版本或用户打开时的证据版本不一致时返回 409，防止丢失更新及对过时页面作结论。用户角色每次请求从数据库读取。

当前公开结构聚合使用 TypeORM 自关联 JOIN 与 SQL GROUP BY，支持根相对三层、国家、城市、法人状态、LEI 状态和续期条件。实体页实际展示此聚合。工作流清单仍保留有界内存规则作为对照。可选 Redis 缓存只覆盖稳定公开聚合，版本随导入事务发布；续期条件旁路缓存。默认 CACHE_ENABLED=false，启用前参考测量。大规模上线需 SQL 筛选/索引、独立事件表、分页审核历史、按机构隔离、访问审计和监控；本仓库不宣称已完成这些能力。

## 检查

```bash
cd backend
npm test
npm run lint
npm run build
```

集成测试仅允许显式启用、`test_` 前缀的专用库，**会重建测试库**。根目录首次建立测试库：

```bash
docker compose exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot' < backend/test/setup.sql
```

在后端运行：

```bash
TEST_ALLOW_DB_RESET=1 DB_NAME=test_commercial_da REDIS_URL=redis://127.0.0.1:6380/15 npm run test:e2e
```

前端检查：`npm run typecheck`、`npm run lint`、`npm run build`。历史验证文档保留作为旧版本记录，不作为当前功能或性能承诺。

## 2026-10-23 技术对齐

新增 SQL 聚合、自关联、版本化可选缓存和账号列表响应遮盖。详情编辑仍有权限地取得完整联系方式。已有库必须先停止 API，执行 `npm run registry:upgrade`；此命令只增列/索引/外键并事务回填，不清空用户或审核。MySQL DDL 不具备整批事务回滚，升级脚本可重复执行。启动与验收见 技术验收报告。

### 按业务范围扩展，而不是只支持精选公司

`backend/registry-data/reference-expansion.json` 配置四个地区的普通法人样本。`scope.json` 同步包含这些地区；它们按 LEI 排序、有采集上限，不是完整国家名录。需要其他公司时，可由管理员在 GLEIF 核实 LEI，再建立类似 `demo-seeds.json` 格式的独立种子文件；`--supplement-seeds` 接受任意符合格式的公司列表，并不只识别演示公司。

```bash
python3 backend/src/scripts/fetch-registry.py --supplement-scope backend/registry-data/reference-expansion.json
# 审查采集内容后，在已配置目标环境的 backend 目录追加导入：
REGISTRY_IMPORT_MODE=append npm run registry:import
```

追加模式在事务中读取目标库，保留已有实体证据，只加入缺少的实体；重叠 LEI 不被本地旧记录覆盖，复核历史和账号不被改动。它不用于刷新已有公司的最新资料；定期全量更新仍需单独审查差异、备份后执行。当前工作台上限 3,000 个实体，超限明确失败。若要长期服务更大的公司范围，应进一步把列表/选项查询改成服务端分页，再评估增加规模，不能直接取消上限。


## 管理概览与复核演示（2026-10-28）

概览按当前全部资料或选择的 portfolio 统计，展示实体、地区、已连接父实体、已分配复核及互不重叠的续期时间分布，替代固定公司范围的对比图。公司选择器使用当前账号在本浏览器的最近使用记录（最多 8 家，可清除），不再显示固定 Common starting points。

需要演示复核时，先在 backend 运行 `npm run seed:demo-reviews` 预览，确认后 `npm run seed:demo-reviews -- --apply`。默认将四种工作流场景各补至 10 条，已有复核不覆盖。证据变化例子使用模拟旧指纹，当前公开记录不修改。页面和 CSV 使用统一业务展示，初始化来源保留在内部元数据、原始审计和文档中。

具体讲解和操作见 面试演示文档。
