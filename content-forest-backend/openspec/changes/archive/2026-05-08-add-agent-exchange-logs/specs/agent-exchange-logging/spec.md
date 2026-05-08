## ADDED Requirements

### Requirement: Agent 交流日志默认关闭并可通过环境配置开启
系统 SHALL 提供 Agent 交流日志开关，默认不产生日志文件。系统 MUST 允许开发者通过后端本地环境配置开启日志，并配置日志输出目录。

#### Scenario: 默认不写入交流日志
- **WHEN** 后端未配置开启 Agent 交流日志
- **THEN** Agent 任务 MUST 按现有流程执行
- **AND** 系统 MUST NOT 在日志目录中写入 Agent 交流日志文件

#### Scenario: 通过本地环境开启交流日志
- **WHEN** 后端 `.env.local` 配置开启 Agent 交流日志
- **THEN** 系统 MUST 在 Agent 任务执行后写入任务级交流日志
- **AND** 系统 MUST 使用配置中的日志目录或默认 `logs` 目录

### Requirement: 每次 Agent 任务生成独立日志文件
系统 SHALL 为每次 Agent 任务提交生成一份独立交流日志文件。日志文件名 MUST 以任务开始时间为主，精确到秒，并且 MUST 避免覆盖同一秒内已经存在的日志文件。

#### Scenario: 成功任务写入独立日志
- **WHEN** Agent 任务成功完成且交流日志已开启
- **THEN** 系统 MUST 写入一份该任务独立的日志文件
- **AND** 文件名 MUST 包含精确到秒的任务开始时间

#### Scenario: 失败任务写入独立日志
- **WHEN** Agent 任务执行失败且交流日志已开启
- **THEN** 系统 MUST 写入一份该任务独立的日志文件
- **AND** 日志 MUST 包含失败阶段和失败原因

#### Scenario: 同秒任务不覆盖日志
- **WHEN** 同一秒内多个 Agent 任务需要写入日志
- **THEN** 系统 MUST 为后续任务生成不冲突的文件名
- **AND** 系统 MUST NOT 覆盖已存在的日志文件

### Requirement: Agent 交流日志记录关键输入输出
系统 SHALL 在 Agent 交流日志中结构化记录任务运行过程中的关键输入和输出。日志 MUST 至少覆盖任务输入、Skill 执行输入输出、Tool 调用输入输出、LLM 调用输入输出摘要、输出校验结果和最终任务结果。

#### Scenario: 记录 Tool 输入输出
- **WHEN** Agent Skill 调用受控 Tool
- **THEN** 日志 MUST 记录 Tool 名称、调用输入摘要和输出摘要
- **AND** 日志 MUST 保留事件发生顺序

#### Scenario: 记录 LLM 输入输出
- **WHEN** Agent Runtime 通过 LLM Adapter 调用模型
- **THEN** 日志 MUST 记录模型调用输入摘要和模型输出摘要
- **AND** 日志 MUST 不包含真实 API Key

#### Scenario: 记录结构化校验结果
- **WHEN** Agent 输出经过结构化校验或修复流程
- **THEN** 日志 MUST 记录校验通过、校验失败或修复失败结果
- **AND** 日志 MUST 包含可用于定位问题的错误摘要

### Requirement: Agent 交流日志必须脱敏与裁剪
系统 SHALL 在写入 Agent 交流日志前对内容执行脱敏与裁剪。日志 MUST NOT 泄露真实 API Key、鉴权 Header、明显密钥、真实本地绝对路径或超出配置上限的长正文。

#### Scenario: 脱敏密钥信息
- **WHEN** Agent 任务输入、模型配置、错误信息或模型交互中包含密钥形态文本
- **THEN** 日志 MUST 将该内容替换为脱敏占位
- **AND** 日志 MUST NOT 包含真实密钥原文

#### Scenario: 脱敏真实本地路径
- **WHEN** Tool 或错误信息中包含真实本地绝对路径
- **THEN** 日志 MUST 将该路径替换为脱敏占位或相对摘要
- **AND** 日志 MUST NOT 暴露开发者本机绝对路径

#### Scenario: 裁剪超长正文
- **WHEN** 任务输入、Tool 输出或 LLM 输出正文超过配置上限
- **THEN** 日志 MUST 裁剪正文内容
- **AND** 日志 MUST 保留原始长度或被裁剪标记

### Requirement: 日志写入失败不得影响 Agent 任务结果
系统 SHALL 将 Agent 交流日志作为旁路可观测能力处理。日志目录创建失败、文件写入失败或单条事件序列化失败时，系统 MUST NOT 因日志问题改变 Agent 任务本身的成功或失败结果。

#### Scenario: 日志写入失败但任务成功
- **WHEN** Agent 任务成功完成但交流日志写入失败
- **THEN** Agent 任务 MUST 仍返回成功结果
- **AND** 系统 MUST 记录可诊断的日志写入警告

#### Scenario: 日志写入失败但任务失败
- **WHEN** Agent 任务本身失败且交流日志写入也失败
- **THEN** Agent 任务 MUST 保留原始失败原因
- **AND** 日志写入失败 MUST NOT 覆盖 Agent 任务失败原因

### Requirement: Agent 交流日志属于本地运行产物
系统 SHALL 将 Agent 交流日志视为本地运行产物。日志目录 MUST 被 Git 忽略，示例环境文件 MUST 只包含日志配置占位或默认值，不得包含真实密钥或真实用户内容。

#### Scenario: 日志目录不进入 Git
- **WHEN** 开发者开启 Agent 交流日志并产生日志文件
- **THEN** 生成的日志文件 MUST 不会被 Git 作为待提交业务文件跟踪

#### Scenario: 示例配置不包含敏感内容
- **WHEN** 开发者查看环境变量示例文件
- **THEN** 示例文件 MUST 只包含日志开关、日志目录和裁剪上限的示例值
- **AND** 示例文件 MUST NOT 包含真实 API Key 或真实 Agent 交流日志内容
