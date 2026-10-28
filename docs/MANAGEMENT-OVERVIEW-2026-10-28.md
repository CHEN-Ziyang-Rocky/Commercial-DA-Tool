# Management overview 与复核演示更新

**最新复核扩充与显示调整见 复核更新记录。以下保留该轮发布时的历史结果。**

已发布到 https://analytics.imrocky.com/ 。本轮发布目录 `/home/ubuntu/commercial-overview-release.ILcQPs`，前端构建号 `uoIgHKx-6Yq7nvVfW9i-Q`。仅涉及 Commercial DA 应用与用户要求的四条演示复核记录。

## 为什么替换原图

旧图来自采集配置中的 15 个参考集团。它与当次选择的范围不同，集团大小、采集深度和重叠也不同，不适合作为管理大局比较。

新首页先展示当前范围实体总数、法定地址国家/地区、连接到当前快照内母公司的实体数和已分配复核数。续期图改为互不重叠的六个时间桶，恰好覆盖当前范围每个实体；注册状态环图与地区覆盖均使用相同筛选范围。未选择 portfolio 时统计全部资料，选择后按合并去重范围计算。

复核区域增加最多六条的工作队列，先展示需要重新核对证据和逾期任务，再展示进行中任务与当前评估，直接链接到实体详情。

## 公司选择

Hierarchy root 与 Review portfolio 均取消固定 Common starting points。新用户直接看到完整 A–Z 列表；选择过的公司进入 Recently used，最多 8 家。最近记录按账号分别存于当前浏览器，可清除，不会取代其他任何公司。保留中文/英文、法定名称、其他名称和 LEI 搜索；未恢复 80 条截断。

## 演示任务

| 场景 | 法人 LEI | 状态与说明 |
|---|---|---|
| 进行中 | 549300HVTWB0GJZ16V92（京东集团） | 未来期限、虚构 Entity operations 团队 |
| 任务逾期 | 5493001KQW6DM7KEDR62（建设银行） | 进行中，初始化日前 7 天到期 |
| 证据待重核 | 254900OM3MAXYK8PCC84（京东健康） | 用模拟旧指纹演示重新评估；当前公开证据不修改 |
| 当前证据已复核 | HWUPKR0MPOU8FGXBT394（苹果） | 当前指纹对应的演示结论 |

任务在概览、队列、实体列表、详情和 CSV 中标明 Demo。负责人/结论不代表真实员工分工或实际业务审批。通过正常管理员表单推进任务；保存重新核对的证据后，待重核标记正常消失，审计历史追加，演示标记继续保留。

初始化脚本在事务中只插入缺少的场景，跳过已有任务，不覆盖历史；重复执行不会将已经推进的任务重置。

```bash
cd backend
npm run seed:demo-reviews
npm run seed:demo-reviews -- --apply
```

## 实际验证

- 后端单元测试 34 项通过。
- 独立 Docker MySQL 8.4 / Redis 集成测试 20 项通过，包含创建演示、重复初始化、保留既有复核、导出标记，以及通过管理员 API 重新核对证据和追加审计历史。
- 前端列表及最近公司逻辑 7 项通过，包含 2,708 家实际记录逐一 LEI 搜索、无截断、无固定精选优先、顺序/去重/损坏存储处理。
- 本轮总计 61 项通过，0 项失败；前端 ESLint、TypeScript、本地 Nest 构建和 Ubuntu 前后端生产构建通过。集成测试进程仍打印既有的退出句柄提示，最终正常退出 0；不将此称为已排查完毕。
- 公网 Commercial 首页/API health、主页、Shop 和 Finance 均返回 HTTP 200。
- 发布前后逐条比较公开资料指纹，2,708 条全部保留；账号仍为 2 个。发布前 1 条复核的完整状态摘要不变，新增 4 条后共有 5 条。
- 线上业务检查：53 个法定地址国家/地区，438 个实体连接到快照内直接母公司；Open/in progress 2、Overdue 1、Stale 1、Reviewed/current 2。复核卡片存在交集，不能相加。
- 后端进一步验证四个工作流过滤均有匹配结果，续期桶合计等于全范围实体数，重复初始化无待插入项。
- 本轮浏览器自动化在页面刷新后再次出现超时/不完整窗口状态，应用内浏览器连接也超时。未把新界面视觉、跨选择器历史同步或移动端验收标记为通过；这些由源码/逻辑测试覆盖的部分不等同于实际视觉验收。

## 变更文件

- 前端：`ManagementCharts.tsx`、`CompanyPicker.tsx`、`ReviewPanel.tsx`、`WorkspaceHelp.tsx`、`pages/index.tsx`、`pages/entities/index.tsx`、`registry-types.ts`，新增 `recent-companies.ts`、`useRecentCompanies.ts` 及历史记录测试。
- 后端：`registry.service.ts`、`governance.ts`、`package.json`；新增 `management-summary.ts`、`demo-reviews.ts`、`seed-demo-reviews.ts`、概览与演示逻辑测试，扩展 HTTP 集成测试。
- 文档：本文件、README、`INTERVIEW-DEMO.zh-CN.md`。

无需数据库表结构变更。Nginx、证书、端口、PM2 服务定义、共享基础设施和其他项目代码未改；没有提交 Git。发布保留旧构建于该版本目录 `rollback/backend` 和 `rollback/frontend`；若回退应用，无需删除新增演示任务或覆盖现有复核数据。
