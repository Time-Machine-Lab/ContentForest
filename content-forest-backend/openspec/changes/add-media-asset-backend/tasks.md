## 1. 顶层文档与契约先行

- [x] 1.1 更新 `docs/内容森林第二期开发规划文档.md`，确认媒体资源底座、果实挂载和枝化输入引用边界
- [x] 1.2 更新 `docs/design/内容森林架构设计文档.md`，补充媒体资源内容本体、存储适配和运行时目录
- [x] 1.3 更新 `docs/design/domain/果实领域模块设计文档.md`，补充果实媒体挂载语义
- [x] 1.4 更新 `docs/design/domain/枝化生长领域模块设计文档.md`，补充媒体引用输入、Reference Planner 对接和输入/输出分流语义
- [x] 1.5 新增 `docs/api/media.yaml`，定义媒体上传、详情和内容读取接口
- [x] 1.6 更新 `docs/api/fruit.yaml`、`docs/api/growth.yaml`、`docs/api/workspace.yaml`，补充媒体挂载、mediaRefs、媒体摘要、媒体类 ReferenceAtom 和 planned/actual usage
- [x] 1.7 新增 `docs/sql/media.sql`，并按需更新 `docs/sql/fruit.sql`、`docs/sql/growth.sql`，保持兼容当前 content search map、reference atoms、planned/actual usage JSON 结构

## 2. 媒体资源后端能力

- [x] 2.1 实现 Media Asset 存储模型、Repository 和内容位置生成规则
- [x] 2.2 实现媒体上传、详情读取和内容读取 Controller
- [x] 2.3 实现内容访问层媒体保存和读取能力，避免暴露绝对路径
- [x] 2.4 实现媒体 MIME 类型、大小和基础安全校验

## 3. 果实与枝化生长对接

- [x] 3.1 实现果实媒体挂载关系保存和详情返回
- [x] 3.2 实现枝化生长 `mediaRefs` 请求解析、授权校验和失败处理
- [x] 3.3 将媒体引用和用途说明纳入枝化生长授权范围、Reference Planner、ReferenceAtom 和 AgentPort 授权上下文
- [x] 3.4 扩展 actual reference usage 派生逻辑，允许授权输入媒体被记录为本轮使用过的参考资源
- [x] 3.5 将媒体摘要聚合到工作区快照

## 4. 验证

- [x] 4.1 补充媒体上传、读取和错误类型测试
- [x] 4.2 补充果实媒体挂载和详情返回测试
- [x] 4.3 补充枝化生长媒体引用授权测试
- [x] 4.4 补充媒体引用进入 ReferenceAtom、planned usage 和 actual usage 的测试
- [x] 4.5 补充跨平台路径边界测试，验证响应不包含本机绝对路径
- [x] 4.6 运行后端测试、类型检查、lint 和 OpenSpec 严格校验
