export const CONTENT_EVOLUTION_ALGORITHM_VERSION = "content-evolution-v2";

export interface ContentEvolutionEvidenceCard {
  sourceType: "source" | "nutrient" | "temporary_nutrient_card" | "gene" | "feedback";
  resourceType?: "nutrient" | "nutrient_card" | "gene";
  resourceId?: string;
  title: string;
  relevance: string;
  suggestedUse: string;
  excerpt: string;
  confidence: "high" | "medium" | "low";
  candidate?: boolean;
}

export interface ContentEvolutionExplorationSlot {
  key: string;
  name: string;
  hypothesis: string;
  mutationDirection: string;
  successCriteria: string;
}

export interface ContentEvolutionStrategy {
  algorithmVersion: typeof CONTENT_EVOLUTION_ALGORITHM_VERSION;
  attemptIndex: number;
  totalAttempts: number;
  explorationSlot: ContentEvolutionExplorationSlot;
  selectedRoute: Record<string, unknown> | null;
  referencePlan: Record<string, unknown> | null;
  referenceAtoms: Record<string, unknown>[];
  referenceRoutes: Record<string, unknown>[];
  plannedReferenceUsage: Record<string, unknown>[];
  mutationOperators: unknown[];
  platformInference: Record<string, unknown> | null;
  contentSearchMapSummary: Record<string, unknown> | null;
  fallbackUsed: boolean;
  fallbackReason: string | null;
  targetHypothesis: string;
  evidenceCards: ContentEvolutionEvidenceCard[];
  inheritedGeneUses: string[];
  avoidedGeneUses: string[];
}

const EXPLORATION_SLOTS: ContentEvolutionExplorationSlot[] = [
  {
    key: "pain-resonance",
    name: "痛点共鸣",
    hypothesis: "先命中用户当前困扰，再自然引出内容价值。",
    mutationDirection: "强化具体人群、具体场景和可感知痛点。",
    successCriteria: "标题和开头能让目标用户快速感到“这说的是我”。",
  },
  {
    key: "utility-save",
    name: "工具价值",
    hypothesis: "提供清单、步骤、模板或判断标准，提高收藏和复用价值。",
    mutationDirection: "把抽象观点压缩成可执行方法或可复制结构。",
    successCriteria: "正文包含明确步骤、清单、模板或决策标准。",
  },
  {
    key: "contrarian-angle",
    name: "反常识观点",
    hypothesis: "通过反常识或纠偏观点制造点击动机和讨论空间。",
    mutationDirection: "提出一个克制但鲜明的不同看法，并给出可信理由。",
    successCriteria: "标题或前三行包含清晰反差，但不制造虚假承诺。",
  },
  {
    key: "story-case",
    name: "案例故事",
    hypothesis: "用具体前后变化或小故事降低理解成本，提升代入感。",
    mutationDirection: "把产品或观点放进一个真实感更强的使用场景。",
    successCriteria: "读者能看到具体场景、行动和结果，而不是只有概念介绍。",
  },
  {
    key: "negative-feedback-avoidance",
    name: "负反馈规避",
    hypothesis: "优先避开已有失败教训，减少广告感、空泛感和目标错配。",
    mutationDirection: "弱化硬广、空泛表达和不可信承诺，强化边界与可信细节。",
    successCriteria: "正文能体现适用边界和可信表达，避免复现反向基因。",
  },
  {
    key: "platform-routing",
    name: "平台路由",
    hypothesis: "让标题、正文承诺和标签/平台格式对齐，提高分发匹配度。",
    mutationDirection: "强化平台关键词、受众标签和内容承诺一致性。",
    successCriteria: "标题关键词、正文首段和标签/格式服务于同一受众场景。",
  },
];

export function buildContentEvolutionStrategy(input: {
  taskInput: Record<string, unknown>;
  source: Record<string, unknown>;
  resources: Record<string, unknown>;
}): ContentEvolutionStrategy {
  const attemptIndex = readPositiveInteger(input.taskInput.attemptIndex, 1);
  const totalAttempts = readPositiveInteger(
    readRecord(input.taskInput.target).totalFruitCount,
    readPositiveInteger(readRecord(input.taskInput.target).fruitCount, 1),
  );
  const selectedRoute = readRoute(input.taskInput.selectedRoute);
  const mutationPlan = readRecord(input.taskInput.mutationPlan);
  const referencePlan =
    readRecordOrNull(input.taskInput.referencePlan) ??
    readRecordOrNull(mutationPlan.referencePlan) ??
    readRecordOrNull(selectedRoute?.referencePlan);
  const referenceAtoms = readArray(input.taskInput.referenceAtoms).length > 0
    ? readArray(input.taskInput.referenceAtoms).map((item) => readRecord(item))
    : readArray(referencePlan?.atoms).map((item) => readRecord(item));
  const referenceRoutes = readArray(referencePlan?.routes).map((item) => readRecord(item));
  const plannedReferenceUsage = readArray(input.taskInput.plannedReferenceUsage).length > 0
    ? readArray(input.taskInput.plannedReferenceUsage).map((item) => readRecord(item))
    : readArray(referencePlan?.plannedUsage).map((item) => readRecord(item));
  const mutationOperators = readArray(input.taskInput.mutationOperators).length > 0
    ? readArray(input.taskInput.mutationOperators)
    : readArray(mutationPlan.mutationOperators);
  const contentSearchMapSummary = summarizeSearchMap(input.taskInput.contentSearchMap);
  const platformInference =
    readRecordOrNull(input.taskInput.platformInference) ??
    readRecordOrNull(mutationPlan.platformInference) ??
    readRecordOrNull(contentSearchMapSummary?.platformInference);
  const routeSlot = selectedRoute === null
    ? null
    : buildExplorationSlotFromRoute(selectedRoute, attemptIndex);
  const slot =
    routeSlot ??
    buildExplorationSlotFromMutationPlan(input.taskInput.mutationPlan, attemptIndex) ??
    EXPLORATION_SLOTS[(attemptIndex - 1) % EXPLORATION_SLOTS.length] ??
    EXPLORATION_SLOTS[0];
  const fallbackUsed = routeSlot === null;
  const evidenceCards = buildEvidenceCards(input.source, input.resources);
  const geneCards = evidenceCards.filter((card) => card.sourceType === "gene");
  const sourceGeneTags = readArray(input.source.geneTags)
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => tag.trim());
  return {
    algorithmVersion: CONTENT_EVOLUTION_ALGORITHM_VERSION,
    attemptIndex,
    totalAttempts,
    explorationSlot: slot,
    selectedRoute,
    referencePlan,
    referenceAtoms,
    referenceRoutes,
    plannedReferenceUsage,
    mutationOperators,
    platformInference,
    contentSearchMapSummary,
    fallbackUsed,
    fallbackReason: fallbackUsed
      ? "缺少有效选中探索路线，使用 mutationPlan 或固定探索槽位兜底。"
      : null,
    targetHypothesis: buildTargetHypothesis(slot, selectedRoute, mutationOperators),
    evidenceCards,
    inheritedGeneUses: [
      ...sourceGeneTags.map((tag) => `继承来源果实基因标签：${tag}`),
      ...geneCards.map((card) =>
        `继承或变异基因 ${card.resourceId ?? card.title}：${card.suggestedUse}`,
      ),
      ...referencePlanItems(referencePlan, ["inherit", "strengthen", "combine", "mutate"])
        .map((item) => `${readString(item.role)}：${readString(item.usage)}`),
    ],
    avoidedGeneUses: [
      ...geneCards
        .filter((card) => /避免|规避|negative|失败|反向/i.test(card.excerpt))
        .map((card) => `规避基因 ${card.resourceId ?? card.title}：${card.excerpt}`),
      ...referencePlanItems(referencePlan, ["avoid"])
        .map((item) => `规避参考：${readString(item.usage)}`),
    ],
  };
}

function buildTargetHypothesis(
  slot: ContentEvolutionExplorationSlot,
  selectedRoute: Record<string, unknown> | null,
  mutationOperators: unknown[],
): string {
  if (selectedRoute !== null) {
    return [
      `本次尝试采用探索路线「${readString(selectedRoute.id) || slot.name}」。`,
      `目标：${readString(selectedRoute.objective) || slot.hypothesis}`,
      `形态：${readString(selectedRoute.contentForm) || "未指定"}；受众：${readString(selectedRoute.audience) || "未指定"}。`,
      `突变算子：${mutationOperators.map((operator) => readString(readRecord(operator).label)).filter(Boolean).join("、") || "沿用路线默认变化"}`,
    ].join(" ");
  }
  return [
    `本次尝试采用「${slot.name}」探索槽位兜底。`,
    slot.hypothesis,
    `差异化方向：${slot.mutationDirection}`,
  ].join(" ");
}

function buildExplorationSlotFromRoute(
  route: Record<string, unknown>,
  attemptIndex: number,
): ContentEvolutionExplorationSlot {
  const routeId = readString(route.id) || `route-${attemptIndex}`;
  const objective = readString(route.objective) || "动态探索路线";
  const narrativeMechanism = readString(route.narrativeMechanism);
  const successSignals = readArray(route.successSignals)
    .map((item) => readString(item))
    .filter(Boolean);
  return {
    key: routeId,
    name: objective,
    hypothesis: `验证路线「${objective}」是否能形成更有效表达。`,
    mutationDirection: narrativeMechanism || objective,
    successCriteria:
      successSignals.length > 0
        ? successSignals.join("；")
        : "内容必须保留种子核心，并与同批次其他 attempt 形成可比较差异。",
  };
}

function buildExplorationSlotFromMutationPlan(
  value: unknown,
  attemptIndex: number,
): ContentEvolutionExplorationSlot | null {
  const plan = readRecord(value);
  const direction = readString(plan.direction);
  if (direction.length === 0) {
    return null;
  }
  const intent = readString(plan.intent);
  const hypothesis = readString(plan.hypothesis);
  return {
    key: `dynamic-mutation-${attemptIndex}`,
    name: direction,
    hypothesis: hypothesis || intent || "验证动态突变计划是否能形成更有效表达。",
    mutationDirection: direction,
    successCriteria:
      intent || "内容必须保留种子核心，并与同批次其他 attempt 形成可比较差异。",
  };
}

export function cleanGeneratorPayload(markdown: string): string {
  const withoutThink = markdown.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const publishableIndex = findPublishableStart(withoutThink);
  const cleaned = publishableIndex > 0
    ? withoutThink.slice(publishableIndex).trim()
    : withoutThink;
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

function buildEvidenceCards(
  source: Record<string, unknown>,
  resources: Record<string, unknown>,
): ContentEvolutionEvidenceCard[] {
  const cards: ContentEvolutionEvidenceCard[] = [
    {
      sourceType: "source",
      title: readString(source.title) || readString(source.summary) || "来源节点",
      relevance: "本次枝化生长的直接来源，决定内容必须延续的核心语义。",
      suggestedUse: buildSourceSuggestedUse(source),
      excerpt: truncate(readString(source.markdown), 800),
      confidence: "high",
    },
  ];

  for (const nutrient of readArray(resources.nutrients)) {
    const record = readRecord(nutrient);
    cards.push({
      sourceType: "nutrient",
      resourceType: "nutrient",
      resourceId: readString(record.resourceId),
      title: readString(record.title) || "营养资料",
      relevance: "用户授权的正式营养资料，可为平台规则、案例或背景提供依据。",
      suggestedUse: "提取与本次探索路线最相关的规则、案例或表达约束。",
      excerpt: truncate(readString(record.markdown), 800),
      confidence: "high",
    });
  }

  for (const card of readArray(resources.temporaryNutrientCards)) {
    const record = readRecord(card);
    cards.push({
      sourceType: "temporary_nutrient_card",
      resourceType: "nutrient_card",
      resourceId: readString(record.resourceId),
      title: readString(record.title) || "临时营养卡片",
      relevance: "用户授权的未沉淀候选资料，只能作为低置信参考。",
      suggestedUse: "作为候选证据试用，不得描述为已沉淀营养库内容。",
      excerpt: truncate(readString(record.markdown), 800),
      confidence: "low",
      candidate: true,
    });
  }

  for (const gene of readArray(resources.genes)) {
    const record = readRecord(gene);
    const performance = readRecord(record.performance);
    const negativeCount = readPositiveInteger(performance.negativeCount, 0);
    cards.push({
      sourceType: "gene",
      resourceType: "gene",
      resourceId: readString(record.resourceId),
      title: readString(record.title) || "基因经验",
      relevance: "该种子已沉淀的内容表达经验，应影响下一代果实。",
      suggestedUse:
        negativeCount > 0
          ? "结合适用边界判断需要继承、变异还是规避该表达特征。"
          : "判断应继承、强化、变异、组合还是规避该表达特征。",
      excerpt: truncate(readString(record.markdown), 800),
      confidence: "medium",
    });
  }

  return cards;
}

function buildSourceSuggestedUse(source: Record<string, unknown>): string {
  const geneTags = readArray(source.geneTags)
    .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    .map((tag) => tag.trim());
  if (geneTags.length === 0) {
    return "保留核心主题，并围绕当前探索路线改变表达方式。";
  }
  return `保留核心主题，并优先参考来源果实基因标签：${geneTags.join("、")}。`;
}

function summarizeSearchMap(value: unknown): Record<string, unknown> | null {
  const map = readRecordOrNull(value);
  if (map === null) {
    return null;
  }
  return {
    algorithmVersion: map.algorithmVersion,
    platformInference: map.platformInference,
    objectives: map.objectives,
    audiences: map.audiences,
    contentForms: map.contentForms,
    narrativeMechanisms: map.narrativeMechanisms,
    emotionalDrivers: map.emotionalDrivers,
    evidenceInventory: map.evidenceInventory,
    riskGuards: map.riskGuards,
    routeCandidateCount: readArray(map.routeCandidates).length,
    fallbackUsed: map.fallbackUsed,
    fallbackReason: map.fallbackReason,
  };
}

function referencePlanItems(
  referencePlan: Record<string, unknown> | null,
  roles: string[],
): Record<string, unknown>[] {
  if (referencePlan === null) {
    return [];
  }
  return readArray(referencePlan.items)
    .map((item) => readRecord(item))
    .filter((item) => roles.includes(readString(item.role)));
}

function readRoute(value: unknown): Record<string, unknown> | null {
  const route = readRecordOrNull(value);
  if (route === null || readString(route.id).length === 0) {
    return null;
  }
  return route;
}

function findPublishableStart(value: string): number {
  const candidates = [
    "## 标题",
    "# 标题",
    "标题：",
    "## Title",
    "# Title",
  ];
  const indexes = candidates
    .map((candidate) => value.indexOf(candidate))
    .filter((index) => index >= 0);
  return indexes.length === 0 ? -1 : Math.min(...indexes);
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readRecordOrNull(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(value: unknown, fallback: number): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
