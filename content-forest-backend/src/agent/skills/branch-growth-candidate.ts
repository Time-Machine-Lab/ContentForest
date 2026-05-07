import { ApplicationError } from "../../shared/errors/application-error.js";

export interface BranchGrowthResourceRef {
  resourceType: "nutrient" | "gene";
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
    warnings: string[];
  };
}

export interface BranchGrowthCandidateValidationOptions {
  authorizedResourceRefs?: BranchGrowthResourceRef[];
}

export function validateBranchGrowthCandidateFruit(
  value: unknown,
  options: BranchGrowthCandidateValidationOptions = {},
): BranchGrowthCandidateFruit {
  const candidate = normalizeBranchGrowthCandidateFruit(value);
  const errors: string[] = [];

  if (candidate.payload.markdown.trim().length === 0) {
    errors.push("payload.markdown is required");
  }
  if (candidate.meta.summary.trim().length === 0) {
    errors.push("meta.summary is required");
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
  if (/已保存果实|已完成任务|fruit saved|task completed/i.test(serialized)) {
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

  if (errors.length > 0) {
    throw new ApplicationError("VALIDATION_ERROR", errors.join("; "), 502);
  }

  return {
    type: "candidate_fruit",
    payload: {
      markdown: candidate.payload.markdown.trim(),
      rawGeneratorOutput: candidate.payload.rawGeneratorOutput,
      attachments: [...candidate.payload.attachments],
    },
    meta: {
      summary: candidate.meta.summary.trim(),
      geneTags: [...new Set(candidate.meta.geneTags.map((tag) => tag.trim()))],
      usedResourceRefs: candidate.meta.usedResourceRefs.map((ref) => ({ ...ref })),
      warnings: candidate.meta.warnings.map((warning) => warning.trim()),
    },
  };
}

export function normalizeBranchGrowthCandidateFruit(
  value: unknown,
): BranchGrowthCandidateFruit {
  const record = requireRecord(value, "candidate fruit must be an object");
  if (record.type === "candidate_fruit") {
    const payload = requireRecord(record.payload, "payload is required");
    const meta = requireRecord(record.meta, "meta is required");
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
        usedResourceRefs: normalizeResourceRefs(meta.usedResourceRefs),
        warnings: normalizeStringArray(meta.warnings),
      },
    };
  }

  const nested = findLegacyCandidateRecord(record);
  if (nested !== null) {
    const markdown = [nested.markdown, nested.bodyMarkdown, nested.contentMarkdown]
      .find((item): item is string => typeof item === "string") ?? "";
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
        usedResourceRefs: normalizeResourceRefs(nested.usedResourceRefs),
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
} {
  const candidate = validateBranchGrowthCandidateFruit(value, options);
  return {
    markdown: candidate.payload.markdown,
    summary: candidate.meta.summary,
    geneTags: candidate.meta.geneTags,
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

function normalizeResourceRefs(value: unknown): BranchGrowthResourceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const ref = requireRecord(item, "resource ref must be an object");
    const resourceType = ref.resourceType;
    if (resourceType !== "nutrient" && resourceType !== "gene") {
      throw new ApplicationError("VALIDATION_ERROR", "resource type is invalid", 502);
    }
    return {
      resourceType,
      resourceId: requireString(ref.resourceId, "resourceId is required").trim(),
    };
  });
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
