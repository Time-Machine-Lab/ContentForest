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
  resourceType: "nutrient" | "gene" | "nutrient_card";
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
    return {
      type: "candidate_fruit",
      payload: {
        markdown: requireString(payload.markdown, "payload.markdown is required"),
        rawGeneratorOutput:
          typeof payload.rawGeneratorOutput === "string"
            ? payload.rawGeneratorOutput
            : undefined,
        attachments: normalizeStringArray(payload.attachments),
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
        referenceUsage: normalizeReferenceUsage(meta.referenceUsage, usedResourceRefs, options),
        riskHandlingSummary: normalizeNullableString(meta.riskHandlingSummary),
        factCheckSummary: normalizeNullableString(meta.factCheckSummary),
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
        referenceUsage: normalizeReferenceUsage(nested.referenceUsage, usedResourceRefs, options),
        riskHandlingSummary: normalizeNullableString(nested.riskHandlingSummary),
        factCheckSummary: normalizeNullableString(nested.factCheckSummary),
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
} {
  const candidate = validateBranchGrowthCandidateFruit(value, options);
  return {
    markdown: candidate.payload.markdown,
    summary: candidate.meta.summary,
    geneTags: candidate.meta.geneTags,
    actualReferenceUsage: candidate.meta.referenceUsage,
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
      resourceType !== "nutrient_card"
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
    return value.map((item) => normalizeReferenceUsageRecord(item));
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
    actions: normalizeTypedStringArray(record.actions, REFERENCE_ACTIONS, "reference action"),
    slots: normalizeTypedStringArray(record.slots, CONTENT_SLOTS, "content slot"),
    usageSummary:
      typeof record.usageSummary === "string" && record.usageSummary.trim().length > 0
        ? record.usageSummary.trim()
        : "候选果实声明实际参考，但需要本地摘要校验。",
    evidenceStrength: normalizeEvidenceStrength(record.evidenceStrength),
    riskLevel: normalizeRiskLevel(record.riskLevel),
  };
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
        : "gene",
    resourceType: ref.resourceType,
    resourceId: ref.resourceId,
    title: ref.resourceId,
    status: "actual",
    atomIds: [],
    actions: ref.resourceType === "gene" ? ["inherit"] : ["ground"],
    slots: ref.resourceType === "gene" ? ["body_structure"] : ["proof_evidence"],
    usageSummary: "候选果实声明实际参考该授权资源；未匹配到更细的计划原子。",
    evidenceStrength: ref.resourceType === "nutrient_card" ? "candidate" : "observed",
    riskLevel: ref.resourceType === "nutrient_card" ? "medium" : "low",
  };
}

function normalizeReferenceResourceType(
  value: unknown,
): ReferenceUsageSummary["resourceType"] {
  return value === "nutrient" || value === "nutrient_card" || value === "gene"
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
  if (resourceType === "gene") {
    return "gene";
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
    : "candidate";
}

function normalizeRiskLevel(value: unknown): ReferenceRiskLevel {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function normalizeTypedStringArray<T extends string>(
  value: unknown,
  allowed: Set<T>,
  label: string,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item): item is T => {
      if (allowed.has(item as T)) {
        return true;
      }
      throw new ApplicationError("VALIDATION_ERROR", `${label} is invalid: ${item}`, 502);
    });
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
