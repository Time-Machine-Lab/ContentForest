## 1. 顶层文档与依赖确认

- [x] 1.1 确认 `add-media-asset-backend` 已提供 Media Asset 保存、读取和果实挂载能力
- [x] 1.2 更新 `docs/design/内容森林Agent架构设计文档.md`，补充 Skill 工具媒体产物接管边界
- [x] 1.3 更新 `docs/design/domain/生成器领域模块设计文档.md`，明确不限制生成器媒体能力
- [x] 1.4 更新 `docs/design/domain/枝化生长领域模块设计文档.md`，补充媒体产物封装语义、`payload.attachments` 兼容边界和 usedResourceRefs 禁写规则

## 2. Agent Runtime 工具产物收集

- [x] 2.1 扩展 Skill 工具执行结果模型，支持 candidate media artifact 摘要
- [x] 2.2 实现候选媒体产物临时登记和边界校验
- [x] 2.3 确保 Agent Runtime 不直接写媒体数据库事实
- [x] 2.4 确保 Agent 输出不暴露本机绝对路径
- [x] 2.5 确保生成出来的新媒体产物不写入 `usedResourceRefs` 或 actual reference usage

## 3. 枝化生长封装对接

- [x] 3.1 扩展枝化生长 AgentPort 输出，包含候选媒体产物摘要
- [x] 3.2 在枝化生长结果封装阶段调用 Media Asset 能力接管媒体产物
- [x] 3.3 将接管成功的媒体资源随果实候选交付果实领域挂载
- [x] 3.4 对非必要媒体接管失败记录 warning，对必要媒体失败按 attempt 失败处理
- [x] 3.5 保留 `payload.attachments` 兼容读取，但正式果实媒体挂载只使用接管成功的 Media Asset

## 4. 验证

- [x] 4.1 补充纯文本生成器不返回媒体时的回归测试
- [x] 4.2 补充图片候选产物接管和果实挂载测试
- [x] 4.3 补充媒体接管失败 warning 和 attempt 失败测试
- [x] 4.4 补充生成媒体不进入 usedResourceRefs / referenceUsage 的测试
- [x] 4.5 补充 `payload.attachments` 中本机路径不会外露为正式媒体资产的测试
- [x] 4.6 运行后端测试、类型检查、lint 和 OpenSpec 严格校验
