## 1. 顶层契约

- [x] 1.1 更新 `docs/api/nutrient.yaml`，补充种子级营养研究会话列表接口
- [x] 1.2 更新 `docs/api/nutrient.yaml`，补充营养研究 SSE 的 thought、tool、message、nutrient、done、error、cancelled 事件契约
- [x] 1.3 确认本变更不需要新增数据库表；如会话列表仅依赖现有会话表，则不修改 `docs/sql/`

## 2. Agent 流式事件链路

- [x] 2.1 扩展 Agent stream event 类型，覆盖工具生命周期、取消和最终完成语义
- [x] 2.2 让 LLM Adapter 支持接收 abort signal，并在流式请求中传递给 fetch
- [x] 2.3 让 Tool Runtime 在工具开始、完成、失败时发出脱敏可观察事件
- [x] 2.4 让营养研究 Skill 将 LLM 的普通输出和 thinking/reasoning 输出映射为对应流式事件
- [x] 2.5 确保 Agent 最终仍返回可校验的结构化营养研究输出

## 3. 营养研究会话服务

- [x] 3.1 在 storage port 和 SQLite/In-memory adapter 中增加按种子查询研究会话能力
- [x] 3.2 在 NutrientService 中增加按种子列出研究会话的应用能力
- [x] 3.3 调整 `streamResearchMessage`，在 Agent 执行中持续转发 thought、tool、message 和 nutrient 事件
- [x] 3.4 调整 `streamResearchMessage`，在请求取消或连接断开时尽力中止下游执行并保留可恢复事实
- [x] 3.5 保持非流式 `submitResearchMessage` 行为兼容

## 4. HTTP 路由与测试

- [x] 4.1 在 nutrient Controller/main route 中增加种子级会话列表接口
- [x] 4.2 为 SSE 事件类型、取消语义和最终持久化结果增加单元测试
- [x] 4.3 为种子级会话列表和刷新恢复场景增加后端测试
- [x] 4.4 运行后端测试，确认营养库、Agent 和 SSE 相关测试通过
