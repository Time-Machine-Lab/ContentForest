import { ApplicationError } from "../../shared/errors/application-error.js";
import type {
  ContentSlot,
  ReferenceAction,
  ReferenceEvidenceStrength,
  ReferencePlanSourceType,
  ReferenceRiskLevel,
  ReferenceUsageStatus,
  ReferenceUsageSummary,
} from "../../modules/growth/domain/growth-types.js";
import {
  validateReferenceUsageSummaries,
} from "../../modules/growth/domain/reference-plan-validation.js";

export interface BranchGrowthResourceRef {
  resourceType: "nutrient" | "gene" | "nutrient_card" | "media";
  resourceId: string;
}

export interface BranchGrowthCandidateFruit {
  type: "candidate_fruit";
  payload: {
    markdown: string;
    rawGeneratorOutput?: string;
    attachments: string[];
  };
  meta: {
    summary: string;
    geneTags: string[];
    usedResourceRefs: BranchGrowthResourceRef[];
    routeId?: string;
    routeSummary?: string;
    mutationOperators: string[];
    referenceUsage: ReferenceUsageSummary[];
    riskHandlingSummary: string | null;
    factCheckSummary: string | null;
    riskWarnings: string[];
    warnings: string[];
  };
}

export interface BranchGrowthCandidateValidationOptions {
  authorizedResourceRefs?: BranchGrowthResourceRef[];
  plannedReferenceUsage?: ReferenceUsageSummary[];
  riskCheckRequired?: boolean;
}

export function validateBranchGrowthCandidateFruit(
  value: unknown,
  options: BranchGrowthCandidateValidationOptions = {},
): BranchGrowthCandidateFruit {
  const candidate = normalizeBranchGrowthCandidateFruit(value, options);
  const errors: string[] = [];

  if (candidate.payload.markdown.trim().length === 0) {
    errors.push("payload.markdown is required");
  }
  if (candidate.meta.summary.trim().length === 0) {
    errors.push("meta.summary is required");
  }
  const summaryLength = countVisibleCharacters(candidate.meta.summary);
  if (summaryLength < 5 || summaryLength > 20) {
    errors.push("meta.summary must be a 5 to 20 character fruit title");
  }
  for (const tag of candidate.meta.geneTags) {
    if (tag.trim().length === 0) {
      errors.push("meta.geneTags cannot contain blank values");
      break;
    }
  }
  const serialized = JSON.stringify(candidate);
  if (containsRealPath(serialized)) {
    errors.push("candidate cannot contain real local file paths");
  }
  if (/已保存果实|已完成任务|已发布|fruit saved|task completed|published/i.test(serialized)) {
    errors.push("candidate cannot claim system facts");
  }

  const enforceAuthorizedRefs = options.authorizedResourceRefs !== undefined;
  const authorized = new Set(
    (options.authorizedResourceRefs ?? [])
      .map((ref) => `${ref.resourceType}:${ref.resourceId}`),
  );
  for (const ref of candidate.meta.usedResourceRefs) {
    if (ref.resourceId.trim().length === 0) {
      errors.push("resource ref id is required");
      continue;
    }
    if (enforceAuthorizedRefs && !authorized.has(`${ref.resourceType}:${ref.resourceId}`)) {
      errors.push(`resource ref is not authorized: ${ref.resourceType}:${ref.resourceId}`);
    }
  }
  const plannedAtomIds = new Set(
    (options.plannedReferenceUsage ?? []).flatMap((summary) => summary.atomIds),
  );
  if (enforceAuthorizedRefs) {
    const usageValidation = validateReferenceUsageSummaries(candidate.meta.referenceUsage, {
      authorizedResourceRefs: options.authorizedResourceRefs ?? [],
      allowedAtomIds: plannedAtomIds.size > 0 ? plannedAtomIds : undefined,
    });
    if (!usageValidation.ok) {
      errors.push(usageValidation.summary);
    }
  }
  const usedHighRiskReference = candidate.meta.referenceUsage.some((summary) =>
    (summary.status === "actual" || summary.status === "unverified") &&
    (summary.riskLevel === "high" || summary.actions.includes("constrain") ||
      summary.slots.includes("fact_check") || summary.slots.includes("risk_review")),
  );
  if (
    usedHighRiskReference &&
    candidate.meta.riskHandlingSummary === null &&
    candidate.meta.factCheckSummary === null
  ) {
    errors.push("high risk reference usage requires riskHandlingSummary or factCheckSummary");
  }

  if (errors.length > 0) {
    throw new ApplicationError("VALIDATION_ERROR", errors.join("; "), 502);
  }

  return {
    type: "candidate_fruit",
    payload: {
      markdown: cleanVisibleMarkdown(candidate.payload.markdown),
      rawGeneratorOutput:
        candidate.payload.rawGeneratorOutput === undefined
          ? undefined
          : cleanVisibleMarkdown(candidate.payload.rawGeneratorOutput),
      attachments: [...candidate.payload.attachments],
    },
    meta: {
      summary: candidate.meta.summary.trim(),
      geneTags: [...new Set(candidate.meta.geneTags.map((tag) => tag.trim()))],
      usedResourceRefs: candidate.meta.usedResourceRefs.map((ref) => ({ ...ref })),
      routeId: candidate.meta.routeId,
      routeSummary: candidate.meta.routeSummary,
      mutationOperators: candidate.meta.mutationOperators.map((operator) => operator.trim()),
      referenceUsage: candidate.meta.referenceUsage.map((summary) => ({
        ...summary,
        atomIds: [...summary.atomIds],
        actions: [...summary.actions],
        slots: [...summary.slots],
      })),
      riskHandlingSummary: candidate.meta.riskHandlingSummary,
      factCheckSummary: candidate.meta.factCheckSummary,
      riskWarnings: candidate.meta.riskWarnings.map((warning) => warning.trim()),
      warnings: candidate.meta.warnings.map((warning) => warning.trim()),
    },
  };
}

export function normalizeBranchGrowthCandidateFruit(
  value: unknown,
  options: BranchGrowthCandidateValidationOptions = {},
): BranchGrowthCandidateFruit {
  const record = requireRecord(value, "candidate fruit must be an object");
  if (record.type === "candidate_fruit") {
    const payload = requireRecord(record.payload, "payload is required");
    const meta = requireRecord(record.meta, "meta is required");
    const usedResourceRefs = normalizeResourceRefs(meta.usedResourceRefs, options);
    const referenceUsage = normalizeReferenceUsage(meta.referenceUsage, usedResourceRefs, options);
    const factCheckSummary = normalizeNullableString(meta.factCheckSummary);
    const riskHandlingSummary = normalizeNullableString(meta.riskHandlingSummary) ??
      defaultRiskHandlingSummary(referenceUsage, factCheckSummary);
    return {
      type: "candidate_fruit",
      payload: {
        markdown: normalizePayloadMarkdown(payload),
        rawGeneratorOutput:
          typeof payload.rawGeneratorOutput === "string"
            ? payload.rawGeneratorOutput
            : undefined,
        attachments: normalizeAttachmentStrings(payload.attachments),
      },
      meta: {
        summary: requireString(meta.summary, "meta.summary is required"),
        geneTags: normalizeStringArray(meta.geneTags),
        usedResourceRefs,
        routeId:
          typeof meta.routeId === "string" && meta.routeId.trim().length > 0
            ? meta.routeId.trim()
            : undefined,
        routeSummary:
          typeof meta.routeSummary === "string" && meta.routeSummary.trim().length > 0
            ? meta.routeSummary.trim()
            : undefined,
        mutationOperators: normalizeStringArray(meta.mutationOperators),
        referenceUsage,
        riskHandlingSummary,
        factCheckSummary,
        riskWarnings: normalizeStringArray(meta.riskWarnings),
        warnings: normalizeStringArray(meta.warnings),
      },
    };
  }

  const nested = findLegacyCandidateRecord(record);
  if (nested !== null) {
    const markdown = [nested.markdown, nested.bodyMarkdown, nested.contentMarkdown]
      .find((item): item is string => typeof item === "string") ?? "";
    const usedResourceRefs = normalizeResourceRefs(nested.usedResourceRefs, options);
    const referenceUsage = normalizeReferenceUsage(nested.referenceUsage, usedResourceRefs, options);
    const factCheckSummary = normalizeNullableString(nested.factCheckSummary);
    const riskHandlingSummary = normalizeNullableString(nested.riskHandlingSummary) ??
      defaultRiskHandlingSummary(referenceUsage, factCheckSummary);
    return {
      type: "candidate_fruit",
      payload: {
        markdown,
        rawGeneratorOutput:
          typeof nested.rawGeneratorOutput === "string"
            ? nested.rawGeneratorOutput
            : undefined,
        attachments: [],
      },
      meta: {
        summary: typeof nested.summary === "string" ? nested.summary : summarizeMarkdown(markdown),
        geneTags: normalizeStringArray(nested.geneTags),
        usedResourceRefs,
        routeId:
          typeof nested.routeId === "string" && nested.routeId.trim().length > 0
            ? nested.routeId.trim()
            : undefined,
        routeSummary:
          typeof nested.routeSummary === "string" && nested.routeSummary.trim().length > 0
            ? nested.routeSummary.trim()
            : undefined,
        mutationOperators: normalizeStringArray(nested.mutationOperators),
        referenceUsage,
        riskHandlingSummary,
        factCheckSummary,
        riskWarnings: normalizeStringArray(nested.riskWarnings),
        warnings: [],
      },
    };
  }

  throw new ApplicationError("VALIDATION_ERROR", "candidate fruit structure is invalid", 502);
}

export function candidateToGrowthFruitInput(
  value: unknown,
  options: BranchGrowthCandidateValidationOptions = {},
): {
  markdown: string;
  summary: string;
  geneTags: string[];
  actualReferenceUsage: ReferenceUsageSummary[];
  candidate: BranchGrowthCandidateFruit;
} {
  const candidate = validateBranchGrowthCandidateFruit(value, options);
  return {
    markdown: candidate.payload.markdown,
    summary: candidate.meta.summary,
    geneTags: candidate.meta.geneTags,
    actualReferenceUsage: candidate.meta.referenceUsage,
    candidate,
  };
}

function findLegacyCandidateRecord(record: Record<string, unknown>): Record<string, unknown> | null {
  if (hasMarkdownField(record)) {
    return record;
  }
  for (const key of ["candidate", "fruitCandidate", "fruit", "payload"]) {
    const nested = record[key];
    if (typeof nested === "object" && nested !== null && !Array.isArray(nested)) {
      const nestedRecord = nested as Record<string, unknown>;
      if (hasMarkdownField(nestedRecord)) {
        return nestedRecord;
      }
    }
  }
  return null;
}

function hasMarkdownField(record: Record<string, unknown>): boolean {
  return (
    typeof record.markdown === "string" ||
    typeof record.bodyMarkdown === "string" ||
    typeof record.contentMarkdown === "string"
  );
}

function normalizePayloadMarkdown(payload: Record<string, unknown>): string {
  if (typeof payload.markdown === "string") {
    return payload.markdown;
  }
  const markdown = markdownFromTitleBodyTags(payload);
  if (markdown !== null) {
    return markdown;
  }
  return requireString(payload.markdown, "payload.markdown is required");
}

function markdownFromTitleBodyTags(record: Record<string, unknown>): string | null {
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const body = typeof record.body === "string" ? record.body.trim() : "";
  const tags = normalizeStringArray(record.tags)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .map((tag) => tag.startsWith("#") ? tag : `#${tag}`);
  if (title.length === 0 && body.length === 0 && tags.length === 0) {
    return null;
  }
  return [
    title.length > 0 ? `# ${title}` : "",
    body,
    tags.length > 0 ? tags.join(" ") : "",
  ]
    .filter((part) => part.length > 0)
    .join("\n\n");
}

function normalizeResourceRefs(
  value: unknown,
  options: BranchGrowthCandidateValidationOptions,
): BranchGrowthResourceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    if (typeof item === "string") {
      return normalizeStringResourceRef(item, options.authorizedResourceRefs);
    }
    const ref = requireRecord(item, "resource ref must be an object");
    const resourceType = ref.resourceType;
    if (
      resourceType !== "nutrient" &&
      resourceType !== "gene" &&
      resourceType !== "nutrient_card" &&
      resourceType !== "media"
    ) {
      throw new ApplicationError("VALIDATION_ERROR", "resource type is invalid", 502);
    }
    return {
      resourceType,
      resourceId: requireString(ref.resourceId, "resourceId is required").trim(),
    };
  });
}

function normalizeStringResourceRef(
  value: string,
  authorizedResourceRefs: BranchGrowthResourceRef[] | undefined,
): BranchGrowthResourceRef {
  const resourceId = value.trim();
  if (resourceId.length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", "resource ref id is required", 502);
  }
  if (authorizedResourceRefs === undefined) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "resource ref string requires authorized resources",
      502,
    );
  }

  const matches = uniqueResourceRefs(authorizedResourceRefs).filter(
    (ref) =>
      ref.resourceId === resourceId ||
      `${ref.resourceType}:${ref.resourceId}` === resourceId,
  );
  if (matches.length === 0) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      `resource ref is not authorized: ${resourceId}`,
      502,
    );
  }
  if (matches.length > 1) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      `resource ref is ambiguous: ${resourceId}`,
      502,
    );
  }
  return { ...matches[0] };
}

const REFERENCE_ACTIONS = new Set<ReferenceAction>([
  "ground",
  "constrain",
  "shape",
  "style",
  "inherit",
  "adapt",
  "combine",
  "mutate",
  "criticize",
  "avoid",
]);

const CONTENT_SLOTS = new Set<ContentSlot>([
  "title_hook",
  "opening",
  "audience_scenario",
  "body_structure",
  "script_or_shot",
  "visual_audio",
  "proof_evidence",
  "wording_style",
  "cta_conversion",
  "risk_review",
  "fact_check",
]);

function normalizeReferenceUsage(
  value: unknown,
  usedResourceRefs: BranchGrowthResourceRef[],
  options: BranchGrowthCandidateValidationOptions,
): ReferenceUsageSummary[] {
  if (Array.isArray(value) && value.length > 0) {
    const normalized = value.flatMap((item) => {
      try {
        return [normalizeReferenceUsageRecord(item)];
      } catch {
        return [];
      }
    });
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return usedResourceRefs.map((ref) =>
    referenceUsageFromUsedRef(ref, options.plannedReferenceUsage ?? []),
  );
}

function normalizeReferenceUsageRecord(value: unknown): ReferenceUsageSummary {
  const record = requireRecord(value, "reference usage must be an object");
  const resourceType = normalizeReferenceResourceType(record.resourceType);
  const resourceId = normalizeNullableString(record.resourceId);
  return {
    sourceType: normalizeSourceType(record.sourceType, resourceType),
    resourceType,
    resourceId,
    title: normalizeNullableString(record.title),
    status: normalizeUsageStatus(record.status),
    atomIds: normalizeStringArray(record.atomIds).map((item) => item.trim()),
    actions: normalizeReferenceActions(record.actions, resourceType),
    slots: normalizeContentSlots(record.slots, resourceType),
    usageSummary:
      typeof record.usageSummary === "string" && record.usageSummary.trim().length > 0
        ? record.usageSummary.trim()
        : "候选果实声明实际参考，但需要本地摘要校验。",
    evidenceStrength: normalizeEvidenceStrength(record.evidenceStrength),
    riskLevel: normalizeRiskLevel(record.riskLevel),
  };
}

function defaultRiskHandlingSummary(
  referenceUsage: ReferenceUsageSummary[],
  factCheckSummary: string | null,
): string | null {
  if (factCheckSummary !== null || !hasHighRiskReferenceUsage(referenceUsage)) {
    return null;
  }
  return "高风险参考仅作为约束或待核验线索使用，发布前需要人工事实核验和风险复核。";
}

function hasHighRiskReferenceUsage(referenceUsage: ReferenceUsageSummary[]): boolean {
  return referenceUsage.some((summary) =>
    (summary.status === "actual" || summary.status === "unverified") &&
    (summary.riskLevel === "high" || summary.actions.includes("constrain") ||
      summary.slots.includes("fact_check") || summary.slots.includes("risk_review")),
  );
}

function referenceUsageFromUsedRef(
  ref: BranchGrowthResourceRef,
  plannedReferenceUsage: ReferenceUsageSummary[],
): ReferenceUsageSummary {
  const planned = plannedReferenceUsage.find((summary) =>
    summary.resourceType === ref.resourceType && summary.resourceId === ref.resourceId,
  );
  if (planned !== undefined) {
    return {
      ...planned,
      status: "actual",
      usageSummary: `候选果实声明实际采用；计划摘要：${planned.usageSummary}`,
    };
  }
  return {
    sourceType: ref.resourceType === "nutrient"
      ? "formal_nutrient"
      : ref.resourceType === "nutrient_card"
        ? "temporary_nutrient_card"
        : ref.resourceType === "media"
          ? "media"
          : "gene",
    resourceType: ref.resourceType,
    resourceId: ref.resourceId,
    title: ref.resourceId,
    status: "actual",
    atomIds: [],
    actions: ref.resourceType === "gene"
      ? ["inherit"]
      : ref.resourceType === "media"
        ? ["style"]
        : ["ground"],
    slots: ref.resourceType === "gene"
      ? ["body_structure"]
      : ref.resourceType === "media"
        ? ["visual_audio"]
        : ["proof_evidence"],
    usageSummary: "候选果实声明实际参考该授权资源；未匹配到更细的计划原子。",
    evidenceStrength: ref.resourceType === "nutrient_card" ? "candidate" : "observed",
    riskLevel: ref.resourceType === "nutrient_card" || ref.resourceType === "media"
      ? "medium"
      : "low",
  };
}

function normalizeReferenceResourceType(
  value: unknown,
): ReferenceUsageSummary["resourceType"] {
  return value === "nutrient" ||
    value === "nutrient_card" ||
    value === "media" ||
    value === "gene"
    ? value
    : null;
}

function normalizeSourceType(
  value: unknown,
  resourceType: ReferenceUsageSummary["resourceType"],
): ReferencePlanSourceType {
  if (
    value === "user_input" ||
    value === "generator" ||
    value === "source_node" ||
    value === "seed_brief" ||
    value === "nutrient" ||
    value === "formal_nutrient" ||
    value === "temporary_nutrient_card" ||
    value === "media" ||
    value === "gene" ||
    value === "feedback" ||
    value === "research_context" ||
    value === "system_context"
  ) {
    return value;
  }
  if (resourceType === "nutrient") {
    return "formal_nutrient";
  }
  if (resourceType === "nutrient_card") {
    return "temporary_nutrient_card";
  }
  if (resourceType === "media") {
    return "media";
  }
  if (resourceType === "gene") {
    return "gene";
  }
  if (resourceType === "media") {
    return "media";
  }
  return "system_context";
}

function normalizeUsageStatus(value: unknown): ReferenceUsageStatus {
  return value === "actual" ||
    value === "unverified" ||
    value === "planned" ||
    value === "planned_not_used" ||
    value === "provided"
    ? value
    : "actual";
}

function normalizeEvidenceStrength(value: unknown): ReferenceEvidenceStrength {
  return value === "confirmed" ||
    value === "observed" ||
    value === "candidate" ||
    value === "speculative"
    ? value
    : value === "high"
      ? "confirmed"
      : value === "medium"
        ? "observed"
        : value === "low"
          ? "speculative"
    : "candidate";
}

function normalizeRiskLevel(value: unknown): ReferenceRiskLevel {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function normalizeReferenceActions(
  value: unknown,
  resourceType: ReferenceUsageSummary["resourceType"],
): ReferenceAction[] {
  const normalized = normalizeTypedStringArray(value, REFERENCE_ACTIONS, normalizeReferenceActionAlias);
  return normalized.length > 0 ? normalized : defaultReferenceActions(resourceType);
}

function normalizeContentSlots(
  value: unknown,
  resourceType: ReferenceUsageSummary["resourceType"],
): ContentSlot[] {
  const normalized = normalizeTypedStringArray(value, CONTENT_SLOTS, normalizeContentSlotAlias);
  return normalized.length > 0 ? normalized : defaultContentSlots(resourceType);
}

function normalizeTypedStringArray<T extends string>(
  value: unknown,
  allowed: Set<T>,
  alias: (value: string) => T | null,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const normalized: T[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    const next = allowed.has(trimmed as T) ? trimmed as T : alias(trimmed);
    if (next !== null && !normalized.includes(next)) {
      normalized.push(next);
    }
  }
  return normalized;
}

function normalizeReferenceActionAlias(value: string): ReferenceAction | null {
  const lower = value.toLowerCase();
  if (
    lower === "derive" ||
    lower === "extract" ||
    lower === "quote" ||
    lower === "cite" ||
    lower === "mention" ||
    lower.includes("reference") ||
    lower.includes("derive") ||
    lower.includes("extract") ||
    value.includes("引用") ||
    value.includes("参考") ||
    value.includes("提取") ||
    value.includes("借鉴")
  ) {
    return "ground";
  }
  if (lower === "embed" || lower.includes("adapt") || value.includes("改写")) {
    return "adapt";
  }
  if (lower.includes("constraint") || value.includes("约束")) {
    return "constrain";
  }
  if (lower.includes("style") || value.includes("风格") || value.includes("语感")) {
    return "style";
  }
  if (lower.includes("inherit") || value.includes("继承")) {
    return "inherit";
  }
  if (lower.includes("combine") || value.includes("融合") || value.includes("组合")) {
    return "combine";
  }
  if (lower.includes("mutate") || value.includes("变异")) {
    return "mutate";
  }
  if (lower.includes("critic") || value.includes("批评") || value.includes("反例")) {
    return "criticize";
  }
  if (lower.includes("avoid") || value.includes("避免") || value.includes("不适合")) {
    return "avoid";
  }
  if (lower.includes("shape") || value.includes("塑形")) {
    return "shape";
  }
  return null;
}

function normalizeContentSlotAlias(value: string): ContentSlot | null {
  const lower = value.toLowerCase();
  if (lower.includes("title") || lower.includes("hook") || value.includes("标题")) {
    return "title_hook";
  }
  if (lower.includes("opening") || value.includes("开头") || value.includes("开场")) {
    return "opening";
  }
  if (value.includes("受众") || value.includes("场景") || lower.includes("audience")) {
    return "audience_scenario";
  }
  if (value.includes("结构") || value.includes("正文") || lower.includes("structure")) {
    return "body_structure";
  }
  if (value.includes("脚本") || value.includes("分镜") || lower.includes("script")) {
    return "script_or_shot";
  }
  if (value.includes("视觉") || value.includes("画面") || value.includes("音频")) {
    return "visual_audio";
  }
  if (
    value.includes("证据") ||
    value.includes("案例") ||
    value.includes("数据") ||
    value.includes("正式营养") ||
    value.includes("临时营养") ||
    lower.includes("evidence")
  ) {
    return "proof_evidence";
  }
  if (
    value.includes("话术") ||
    value.includes("语感") ||
    value.includes("文风") ||
    value.includes("措辞") ||
    lower.includes("wording")
  ) {
    return "wording_style";
  }
  if (
    value.includes("互动") ||
    value.includes("评论") ||
    value.includes("转化") ||
    lower.includes("cta") ||
    lower.includes("conversion")
  ) {
    return "cta_conversion";
  }
  if (value.includes("风险") || lower.includes("risk")) {
    return "risk_review";
  }
  if (value.includes("事实") || value.includes("核验") || lower.includes("fact")) {
    return "fact_check";
  }
  return null;
}

function defaultReferenceActions(
  resourceType: ReferenceUsageSummary["resourceType"],
): ReferenceAction[] {
  if (resourceType === "gene") {
    return ["inherit"];
  }
  if (resourceType === "media") {
    return ["style"];
  }
  return ["ground"];
}

function defaultContentSlots(
  resourceType: ReferenceUsageSummary["resourceType"],
): ContentSlot[] {
  if (resourceType === "gene") {
    return ["body_structure"];
  }
  if (resourceType === "media") {
    return ["visual_audio"];
  }
  return ["proof_evidence"];
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function uniqueResourceRefs(
  refs: BranchGrowthResourceRef[],
): BranchGrowthResourceRef[] {
  const map = new Map<string, BranchGrowthResourceRef>();
  for (const ref of refs) {
    const resourceId = ref.resourceId.trim();
    if (resourceId.length === 0) {
      continue;
    }
    map.set(`${ref.resourceType}:${resourceId}`, {
      resourceType: ref.resourceType,
      resourceId,
    });
  }
  return [...map.values()];
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeAttachmentStrings(value: unknown): string[] {
  return normalizeStringArray(value).map((item) =>
    containsRealPath(item) ? "[local-path]" : item,
  );
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", message, 502);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new ApplicationError("VALIDATION_ERROR", message, 502);
  }
  return value;
}

function summarizeMarkdown(markdown: string): string {
  return markdown.replace(/[#*_>`()[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function containsRealPath(value: string): boolean {
  return /[a-zA-Z]:\\|\/Users\/|\/home\/|\/var\/|\/tmp\//.test(value);
}

function countVisibleCharacters(value: string): number {
  return Array.from(value.replace(/\s/g, "")).length;
}

function cleanVisibleMarkdown(value: string): string {
  const withoutThink = value.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const starts = ["## 标题", "# 标题", "标题：", "## Title", "# Title"]
    .map((marker) => withoutThink.indexOf(marker))
    .filter((index) => index >= 0);
  const start = starts.length > 0 ? Math.min(...starts) : -1;
  return (start > 0 ? withoutThink.slice(start) : withoutThink)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
