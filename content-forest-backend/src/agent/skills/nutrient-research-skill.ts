import { ApplicationError } from "../../shared/errors/application-error.js";
import { NETWORKED_RESEARCH_TOOL_NAME } from "../tools/networked-research-tool.js";
import type { AgentTaskOutput, AgentTaskType } from "../runtime/agent-task.js";
import type { ToolCaller } from "../runtime/tool-contract.js";
import type { SkillContract, SkillExecutionInput } from "./skill-contract.js";
import { buildStructuredNutrientResearchOutput } from "./nutrient-research-structured-output.js";
import type { NutrientResearchOutput } from "./nutrient-research-output.js";

export class NutrientResearchSkill implements SkillContract {
  public readonly name = "nutrient_research";
  public readonly description = "Built-in nutrient research skill with controlled platform evidence.";
  public readonly supportedTaskTypes: AgentTaskType[] = ["nutrient_research"];

  public async execute(input: SkillExecutionInput): Promise<AgentTaskOutput> {
    const userMessage = readRequiredString(input.context.input.message, "研究问题不能为空");
    input.trace.record("skill_progress", "Nutrient research started", {
      stage: "nutrient_research_started",
      seedId: readOptionalString(input.context.input.seedId),
    });

    const research = await readToolRecord(input.tools, NETWORKED_RESEARCH_TOOL_NAME, {
      mode: "research",
      request: userMessage,
      seedTitle: readOptionalString(input.context.input.seedTitle),
      nutrientCardTitle: readOptionalString(input.context.input.nutrientCardTitle),
      maxResults: inferRequestedMaxResults(userMessage),
    });
    await input.emit?.({
      type: "tool_progress",
      stage: "network_research_completed",
      message: "联网研究完成，开始组织回复与可沉淀营养",
      metadata: {
        queryCount: readQueryCount(research),
        resultCount: Array.isArray(research.results) ? research.results.length : 0,
      },
    });
    input.trace.record("skill_progress", "Nutrient research network package completed", {
      stage: "network_research_completed",
      queryCount: readQueryCount(research),
      resultCount: Array.isArray(research.results) ? research.results.length : 0,
      providerFailures: Array.isArray(research.failures) ? research.failures.length : 0,
      restrictedStatuses: Array.isArray(research.restrictedStatuses)
        ? research.restrictedStatuses.length
        : 0,
      resultQualitySummary: summarizeResultQuality(research.results),
    });

    const plannedOutput = buildPlannedOutputIfPossible(userMessage, research);
    if (plannedOutput !== null) {
      input.trace.record("skill_progress", "Nutrient research planned output built", {
        stage: "nutrient_research_planned_output",
        blockCount: plannedOutput.depositableBlocks.length,
      });
      return {
        taskType: "nutrient_research",
        content: plannedOutput,
        metadata: {
          skillName: this.name,
          networkResultCount: Array.isArray(research.results) ? research.results.length : 0,
        },
      };
    }

    const output = await buildStructuredNutrientResearchOutput({
      llm: input.llm,
      trace: input.trace,
      promptContext: buildPromptContext({
        taskInput: input.context.input,
        userMessage,
        research,
      }),
      maxRepairAttempts: 1,
      onStreamEvent: input.emit,
    });

    return {
      taskType: "nutrient_research",
      content: output,
      metadata: {
        skillName: this.name,
        networkResultCount: Array.isArray(research.results) ? research.results.length : 0,
      },
    };
  }
}

async function readToolRecord(
  tools: ToolCaller,
  name: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const output = await tools.callTool(name, input);
  if (
    typeof output.content !== "object" ||
    output.content === null ||
    Array.isArray(output.content)
  ) {
    throw new ApplicationError("AGENT_TOOL_ERROR", `Tool ${name} 返回格式不正确`, 500);
  }
  return output.content as Record<string, unknown>;
}

function buildPromptContext(input: {
  taskInput: Record<string, unknown>;
  userMessage: string;
  research: Record<string, unknown>;
}): string {
  return [
    "## 当前种子",
    JSON.stringify(
      {
        seedId: input.taskInput.seedId ?? null,
        seedTitle: input.taskInput.seedTitle ?? "",
      },
      null,
      2,
    ),
    "## 历史对话摘要",
    JSON.stringify(input.taskInput.recentMessages ?? [], null, 2),
    "## 用户本次问题",
    input.userMessage,
    "## 联网研究上下文包",
    [
      "说明：resultQuality=candidate_lead 只代表候选线索，不能称为已验证真实案例；",
      "resultQuality=observed_case 或 complete_observed_case 才代表 Provider 读取过平台详情或观察证据；",
      "平台 complete_observed_case 至少应具备可复查 ID/URL、标题、作者、正文或摘要，以及任一互动数据。",
      "小红书实采证据来自 xiaohongshu-cli；非小红书社媒实采证据来自 TikHub MCP；Codex external research 只能作为候选线索、背景补盲或综合分析。",
      "restrictedStatuses 表示验证码、登录墙、Cookie 过期、IP 限制、布局变化、MCP 工具不可用、平台能力不足、Provider 不可用等限制，必须如实说明限制，不得基于这些内容编造帖子、作者或互动数据。",
      "可沉淀营养块要服务创作迁移，优先提炼标题钩子、封面策略、正文结构、用户痛点、评论语言和互动信号；每个关键结论应能回溯到具体 result 标题、URL、平台 ID 或明确说明证据不足。",
      "Codex external research 若出现在 deepExploration/qualityGate 中，只能作为补盲、背景或候选线索，不能替代平台实采证据。",
      "营养分类方法：先判断用户明确要求沉淀哪几类营养，再只输出这些类别，避免把一个明确任务拆成许多零散策略块。",
      "evidence_case_library：用于原帖、原文、帖子详情、案例、样本、封面、作者、互动数据等要求；必须保留单个案例的原始结构。",
      "factor_patterns：用于原因、条件、爆款因素、规律、共性、总结等要求；应与案例库分开，并引用已观察案例。",
      "method_templates：用于怎么做、SOP、模板、流程、复用打法等要求。",
      "risk_constraints：用于限制、成本、登录态、验证码、API 消耗、合规、证据不可得等要求。",
      "opportunity_directions：用于趋势、机会、赛道、选题、产品方向等要求。",
      "若用户已经明确输出形态，应优先服从该形态；例如用户要原帖结构，就不要把原帖案例拆成多个策略型营养。",
    ].join("\n"),
    JSON.stringify(input.research, null, 2),
  ].join("\n\n");
}

function readRequiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", message, 400);
  }
  return value.trim();
}

function readOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

interface NutrientOutputPlan {
  evidenceCaseLibrary: boolean;
  factorPatterns: boolean;
  methodTemplates: boolean;
  riskConstraints: boolean;
  opportunityDirections: boolean;
}

function buildPlannedOutputIfPossible(
  userMessage: string,
  research: Record<string, unknown>,
): NutrientResearchOutput | null {
  const plan = inferNutrientOutputPlan(userMessage);
  if (!plan.evidenceCaseLibrary && !plan.factorPatterns) {
    return null;
  }

  const results = readObservedCaseResults(research)
    .slice(0, inferRequestedMaxResults(userMessage));
  if (results.length === 0) {
    return null;
  }

  const keyword = readQueryPlanContentObject(research) || "平台内容案例";
  const blocks: NutrientResearchOutput["depositableBlocks"] = [];
  if (plan.evidenceCaseLibrary) {
    blocks.push({
      title: `${inferCaseLibraryTitle(results)}：${keyword}`,
      markdown: buildRawCaseMarkdown(keyword, results),
    });
  }
  if (plan.factorPatterns) {
    blocks.push({
      title: `${inferFactorPatternTitle(userMessage)}：${keyword}`,
      markdown: buildFactorPatternMarkdown(keyword, results),
    });
  }

  if (blocks.length === 0) {
    return null;
  }
  return {
    type: "nutrient_research_result",
    message: buildPlannedOutputMessage(results.length, blocks, plan),
    depositableBlocks: blocks,
  };
}

function inferNutrientOutputPlan(userMessage: string): NutrientOutputPlan {
  const text = userMessage.toLowerCase();
  const asksCaseLibrary =
    shouldPreserveRawCases(userMessage) ||
    containsAny(userMessage, [
      "原帖",
      "原文",
      "原内容",
      "原本结构",
      "帖子详情",
      "详细内容",
      "具体内容",
      "封面",
      "作者",
      "互动数据",
      "点赞",
      "收藏",
      "评论",
      "浏览",
      "案例",
      "样本",
      "帖子数据",
    ]) ||
    (containsAny(userMessage, ["帖子", "笔记", "内容"]) &&
      containsAny(userMessage, ["返回", "获取", "收集", "保留"]));
  return {
    evidenceCaseLibrary: asksCaseLibrary,
    factorPatterns: containsAny(userMessage, [
      "总结",
      "爆款条件",
      "爆款因素",
      "关键因素",
      "共性",
      "规律",
      "原因",
      "为什么",
      "特征",
      "洞察",
      "模式",
    ]),
    methodTemplates: containsAny(userMessage, [
      "怎么做",
      "如何做",
      "方法",
      "模板",
      "SOP",
      "流程",
      "打法",
      "复用",
    ]),
    riskConstraints: containsAny(userMessage, [
      "限制",
      "风险",
      "成本",
      "登录",
      "验证码",
      "合规",
      "收费",
      "不可用",
    ]),
    opportunityDirections: containsAny(userMessage, [
      "趋势",
      "机会",
      "方向",
      "赛道",
      "选题",
      "产品方向",
    ]) || text.includes("opportunity"),
  };
}

function readObservedCaseResults(research: Record<string, unknown>): RawCaseResearchResult[] {
  return readResearchResults(research)
    .filter((result) => isObservedCaseQuality(result.resultQuality))
    .filter((result) => (result.rawExcerpt || result.snippet).length > 0);
}

function isObservedCaseQuality(value: string): boolean {
  return value === "observed_case" || value === "complete_observed_case";
}

function inferCaseLibraryTitle(results: RawCaseResearchResult[]): string {
  const platforms = new Set(results.map((result) => result.platform || result.source).filter(Boolean));
  if (platforms.size === 1) {
    return `${[...platforms][0]}原帖案例库`;
  }
  return "原帖案例库";
}

function inferFactorPatternTitle(userMessage: string): string {
  return userMessage.includes("爆款") ? "爆款关键因素" : "跨案例关键因素";
}

function buildPlannedOutputMessage(
  resultCount: number,
  blocks: NutrientResearchOutput["depositableBlocks"],
  plan: NutrientOutputPlan,
): string {
  const names = blocks.map((block) => `「${block.title}」`).join("、");
  const suffix = plan.factorPatterns && plan.evidenceCaseLibrary
    ? "案例库保留原始帖子结构，关键因素单独沉淀，避免把原帖拆碎成策略摘要。"
    : "已优先按用户明确要求的营养形态组织，避免过度拆分。";
  return `已基于 ${resultCount} 条实采案例生成 ${blocks.length} 类营养：${names}。\n${suffix}`;
}

function buildFactorPatternMarkdown(
  keyword: string,
  results: RawCaseResearchResult[],
): string {
  const signals = buildFactorSignals(results);
  const lines = [
    `# 爆款关键因素：${keyword}`,
    "",
    `> 基于 ${results.length} 条已观察案例归纳。以下结论只引用已采集到标题、正文/摘要和互动数据的案例。`,
    "",
    "## 证据样本",
    ...results.map((result, index) =>
      `${index + 1}. ${formatCaseReference(result)}：点赞 ${formatMetric(result.engagement.likes)} / 收藏 ${formatMetric(result.engagement.favorites)} / 评论 ${formatMetric(result.engagement.comments)}`,
    ),
    "",
  ];
  for (const signal of signals) {
    lines.push(`## ${signal.title}`, "", signal.summary, "", ...signal.evidence, "");
  }
  return lines.join("\n");
}

interface FactorSignal {
  title: string;
  summary: string;
  evidence: string[];
}

function buildFactorSignals(results: RawCaseResearchResult[]): FactorSignal[] {
  const signals: FactorSignal[] = [];
  const numbered = results.filter((result) => /\d|w\+|k\+|万|用户|上线|增长|达成/i.test(
    `${result.title}\n${result.rawExcerpt || result.snippet}`,
  ));
  if (numbered.length > 0) {
    signals.push({
      title: "具体结果先行",
      summary: "标题或正文先给出时间、用户量、上线结果、增长结果，会把读者的注意力从抽象经验拉到可验证成果上。",
      evidence: numbered.slice(0, 5).map((result) => `- ${formatCaseReference(result)}`),
    });
  }

  const toolStack = results.filter((result) => /vibe|cursor|claude|gpt|codex|工具|模型|AI 编程|AI编程/i.test(
    `${result.title}\n${result.rawExcerpt || result.snippet}`,
  ));
  if (toolStack.length > 0) {
    signals.push({
      title: "工具栈和过程可复用",
      summary: "高收藏内容通常不只展示结果，还交代工具、模型、流程或开发原则，让读者能迁移到自己的项目。",
      evidence: toolStack.slice(0, 5).map((result) => `- ${formatCaseReference(result)}`),
    });
  }

  const discussion = results.filter((result) =>
    /吗|什么|如何|怎么|求|分享|你们|\?/.test(result.title) ||
    readNumberMetric(result.engagement.comments) >= 100
  );
  if (discussion.length > 0) {
    signals.push({
      title: "开放式问题驱动讨论",
      summary: "提问、求案例、求反馈类内容降低评论门槛，适合收集真实需求、案例和反向观点。",
      evidence: discussion.slice(0, 5).map((result) => `- ${formatCaseReference(result)}`),
    });
  }

  const favoriteHeavy = results.filter((result) =>
    readNumberMetric(result.engagement.favorites) >= readNumberMetric(result.engagement.likes)
  );
  if (favoriteHeavy.length > 0) {
    signals.push({
      title: "收藏价值要独立成立",
      summary: "当收藏数接近或超过点赞数时，说明读者把内容当作清单、教程、案例库或后续行动参考，而不仅是情绪认同。",
      evidence: favoriteHeavy.slice(0, 5).map((result) => `- ${formatCaseReference(result)}`),
    });
  }

  if (signals.length === 0) {
    signals.push({
      title: "先保留案例，再做轻量归纳",
      summary: "当前样本没有形成足够稳定的单一模式，应先沉淀完整案例，后续扩大样本后再抽象爆款条件。",
      evidence: results.slice(0, 5).map((result) => `- ${formatCaseReference(result)}`),
    });
  }
  return signals;
}

function formatCaseReference(result: RawCaseResearchResult): string {
  const title = result.title || result.platformItemId || result.url || "未命名案例";
  const idPart = result.platformItemId !== null ? `，ID ${result.platformItemId}` : "";
  const authorPart = result.author.name !== undefined ? `，作者 ${result.author.name}` : "";
  return `《${title}》${authorPart}${idPart}`;
}

function readNumberMetric(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function containsAny(value: string, markers: string[]): boolean {
  return markers.some((marker) => value.includes(marker));
}

interface RawCaseResearchResult {
  platformItemId: string | null;
  title: string;
  url: string;
  author: {
    id?: string;
    name?: string;
    url?: string;
  };
  coverUrl: string | null;
  source: string;
  platform: string;
  snippet: string;
  rawExcerpt: string;
  publishedAt: string | null;
  engagement: Record<string, unknown>;
  providerName: string;
  resultQuality: string;
}

function readResearchResults(research: Record<string, unknown>): RawCaseResearchResult[] {
  if (!Array.isArray(research.results)) {
    return [];
  }
  return research.results
    .map((item) => readResearchResult(item))
    .filter((item): item is RawCaseResearchResult => item !== null);
}

function readResearchResult(value: unknown): RawCaseResearchResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  return {
    platformItemId: readNullableString(record.platformItemId),
    title: readOptionalString(record.title),
    url: readOptionalString(record.url),
    author: readAuthor(record.author),
    coverUrl: readNullableString(record.coverUrl),
    source: readOptionalString(record.source),
    platform: readOptionalString(record.platform),
    snippet: readOptionalString(record.snippet),
    rawExcerpt: readOptionalString(record.rawExcerpt),
    publishedAt: readNullableString(record.publishedAt),
    engagement: readRecord(record.engagement),
    providerName: readOptionalString(record.providerName),
    resultQuality: readOptionalString(record.resultQuality),
  };
}

function buildRawCaseMarkdown(
  keyword: string,
  results: RawCaseResearchResult[],
): string {
  const grouped = groupRawCases(results);
  const title = inferCaseLibraryTitle(results);
  const lines = [
    `# ${title}：${keyword}`,
    "",
    `> 共 ${results.length} 条。以下内容保留原帖标题、正文、封面链接和互动数据；不做策略拆解。`,
  ];
  let index = 1;
  for (const [category, cases] of grouped) {
    lines.push("", `## ${category}`);
    for (const item of cases) {
      const content = sanitizeMarkdownFence(item.rawExcerpt || item.snippet || "（未获取到正文）");
      lines.push(
        "",
        `### 案例 ${index}：${item.title || content.slice(0, 40)}`,
        "",
        `- 平台 ID：${item.platformItemId ?? "未获取"}`,
        `- 链接：${item.url || "未获取"}`,
        `- 作者：${item.author.name ?? "未获取"}${item.author.id !== undefined ? `（${item.author.id}）` : ""}`,
        `- 发布时间：${item.publishedAt ?? "未获取"}`,
        `- 封面：${item.coverUrl ?? "未获取"}`,
        `- 数据：点赞 ${formatMetric(item.engagement.likes)} / 收藏 ${formatMetric(item.engagement.favorites)} / 评论或回复 ${formatMetric(item.engagement.comments)} / 分享或转发 ${formatMetric(item.engagement.shares ?? item.engagement.retweets)} / 引用 ${formatMetric(item.engagement.quotes)} / 浏览 ${formatMetric(item.engagement.views)}`,
        `- 证据质量：${item.resultQuality || "unknown"}`,
        "",
        "**原帖内容**",
        "",
        "```text",
        content,
        "```",
      );
      index += 1;
    }
  }
  return lines.join("\n");
}

function groupRawCases(
  results: RawCaseResearchResult[],
): Array<[string, RawCaseResearchResult[]]> {
  const groups = new Map<string, RawCaseResearchResult[]>();
  for (const item of results) {
    const category = categorizeRawCase(`${item.title}\n${item.rawExcerpt || item.snippet}`);
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return [...groups.entries()];
}

function categorizeRawCase(text: string): string {
  const normalized = text.toLowerCase();
  if (normalized.includes("vibe") || normalized.includes("cursor") || normalized.includes("claude")) {
    return "Vibe Coding / AI 开发实践";
  }
  if (/用户|上线|下载|月|增长|达成/.test(text)) {
    return "产品里程碑与增长复盘";
  }
  if (/赛道|赚钱|创业|变现|商业化/.test(text)) {
    return "AI 赛道与商业化判断";
  }
  if (/工具|套餐|开发栈|openclaw|next\.js|tailwind/i.test(text)) {
    return "工具清单与开发栈";
  }
  return "独立开发者 AI 项目案例";
}

function shouldPreserveRawCases(userMessage: string): boolean {
  const normalized = userMessage.toLowerCase();
  const mentionsPlatform =
    userMessage.includes("小红书") ||
    normalized.includes("xhs") ||
    normalized.includes("xiaohongshu");
  if (!mentionsPlatform) {
    return false;
  }
  return [
    "原帖",
    "原文",
    "原内容",
    "具体内容",
    "帖子详细",
    "帖子详情",
    "保留",
    "营养数据",
  ].some((marker) => userMessage.includes(marker));
}

function readQueryPlanContentObject(research: Record<string, unknown>): string {
  const queryPlan = readRecord(research.queryPlan);
  return readOptionalString(queryPlan.contentObject);
}

function readAuthor(value: unknown): RawCaseResearchResult["author"] {
  const record = readRecord(value);
  return {
    id: readOptionalString(record.id) || undefined,
    name: readOptionalString(record.name) || undefined,
    url: readOptionalString(record.url) || undefined,
  };
}

function readNullableString(value: unknown): string | null {
  const text = readOptionalString(value);
  return text.length > 0 ? text : null;
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function formatMetric(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "未获取";
}

function sanitizeMarkdownFence(value: string): string {
  return value.replace(/```/g, "'''");
}

function inferRequestedMaxResults(value: string): number {
  const range = /(\d+)\s*(?:~|-|到|至)\s*(\d+)\s*(?:条|篇|个)?/u.exec(value);
  if (range !== null) {
    return clampResultCount(Number.parseInt(range[2] ?? range[1] ?? "", 10));
  }
  const single = /(\d+)\s*(?:条|篇|个)/u.exec(value);
  if (single !== null) {
    return clampResultCount(Number.parseInt(single[1] ?? "", 10));
  }
  return 8;
}

function clampResultCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 8;
  }
  return Math.min(Math.max(Math.trunc(value), 1), 15);
}

function readQueryCount(research: Record<string, unknown>): number {
  const queryPlan = research.queryPlan;
  if (typeof queryPlan !== "object" || queryPlan === null || Array.isArray(queryPlan)) {
    return 0;
  }
  const queries = (queryPlan as Record<string, unknown>).queries;
  return Array.isArray(queries) ? queries.length : 0;
}

function summarizeResultQuality(value: unknown): Record<string, number> {
  const summary: Record<string, number> = {};
  if (!Array.isArray(value)) {
    return summary;
  }
  for (const item of value) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      continue;
    }
    const quality = (item as Record<string, unknown>).resultQuality;
    if (typeof quality !== "string") {
      continue;
    }
    summary[quality] = (summary[quality] ?? 0) + 1;
  }
  return summary;
}
