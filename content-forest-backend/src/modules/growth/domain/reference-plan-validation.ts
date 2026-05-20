import type {
  ContentSlot,
  GrowthAuthorizationScope,
  ReferenceAction,
  ReferenceAtom,
  ReferencePlan,
  ReferencePlanSourceType,
  ReferenceRiskLevel,
  ReferenceRoutePriority,
  ReferenceUsageSummary,
} from "./growth-types.js";

export interface AuthorizedReferenceResourceRef {
  resourceType: "nutrient" | "nutrient_card" | "media" | "gene";
  resourceId: string;
}

export interface ReferencePlanValidationIssue {
  path: string;
  message: string;
}

export interface ReferencePlanValidationResult {
  ok: boolean;
  issues: ReferencePlanValidationIssue[];
  summary: string;
}

const REFERENCE_SOURCE_TYPES = new Set<ReferencePlanSourceType>([
  "user_input",
  "generator",
  "source_node",
  "seed_brief",
  "nutrient",
  "formal_nutrient",
  "temporary_nutrient_card",
  "media",
  "gene",
  "feedback",
  "research_context",
  "system_context",
]);

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

const ROUTE_PRIORITIES = new Set<ReferenceRoutePriority>([
  "must",
  "strong",
  "normal",
  "weak",
]);

const RISK_LEVELS = new Set<ReferenceRiskLevel>(["low", "medium", "high"]);

export function authorizedReferenceResourceRefs(
  scope: GrowthAuthorizationScope,
): AuthorizedReferenceResourceRef[] {
  return [
    ...scope.nutrientRefs.map((ref) => ({
      resourceType: "nutrient" as const,
      resourceId: ref.resourceId,
    })),
    ...scope.temporaryNutrientCardRefs.map((ref) => ({
      resourceType: "nutrient_card" as const,
      resourceId: ref.resourceId,
    })),
    ...scope.mediaRefs.map((ref) => ({
      resourceType: "media" as const,
      resourceId: ref.resourceId,
    })),
    ...scope.geneRefs.map((ref) => ({
      resourceType: "gene" as const,
      resourceId: ref.resourceId,
    })),
  ];
}

export function validateReferencePlan(input: {
  plan: ReferencePlan;
  authorizationScope: GrowthAuthorizationScope;
}): ReferencePlanValidationResult {
  const issues: ReferencePlanValidationIssue[] = [];
  const authorized = authorizedReferenceResourceRefs(input.authorizationScope);
  const atomIds = new Set<string>();

  validateSensitiveText("summary", input.plan.summary, issues);

  for (const [index, item] of input.plan.items.entries()) {
    validateSourceType(`items.${index}.sourceType`, item.sourceType, issues);
    validateResourceAuthorization(
      `items.${index}`,
      item.sourceType,
      inferResourceType(item.sourceType),
      item.resourceId,
      authorized,
      issues,
    );
    validateSensitiveText(`items.${index}.usage`, item.usage, issues);
  }

  for (const [index, atom] of (input.plan.atoms ?? []).entries()) {
    validateAtom(`atoms.${index}`, atom, authorized, atomIds, issues);
  }

  for (const [index, route] of (input.plan.routes ?? []).entries()) {
    const routePath = `routes.${index}`;
    if (!atomIds.has(route.atomId)) {
      issues.push(issue(`${routePath}.atomId`, "route references an unknown atom"));
    }
    if (!REFERENCE_ACTIONS.has(route.action)) {
      issues.push(issue(`${routePath}.action`, "route action is not supported"));
    }
    if (!CONTENT_SLOTS.has(route.slot)) {
      issues.push(issue(`${routePath}.slot`, "route slot is not supported"));
    }
    if (!ROUTE_PRIORITIES.has(route.priority)) {
      issues.push(issue(`${routePath}.priority`, "route priority is not supported"));
    }
    validateSensitiveText(`${routePath}.instruction`, route.instruction, issues);
    validateSensitiveText(`${routePath}.boundary`, route.boundary, issues);
  }

  issues.push(
    ...validateReferenceUsageSummaries(input.plan.providedUsage ?? [], {
      authorizedResourceRefs: authorized,
      allowedAtomIds: atomIds,
      pathPrefix: "providedUsage",
    }).issues,
  );
  issues.push(
    ...validateReferenceUsageSummaries(input.plan.plannedUsage ?? [], {
      authorizedResourceRefs: authorized,
      allowedAtomIds: atomIds,
      pathPrefix: "plannedUsage",
    }).issues,
  );

  return buildResult(issues);
}

export function validateReferenceUsageSummaries(
  usage: ReferenceUsageSummary[],
  input: {
    authorizedResourceRefs: AuthorizedReferenceResourceRef[];
    allowedAtomIds?: Set<string>;
    pathPrefix?: string;
  },
): ReferencePlanValidationResult {
  const issues: ReferencePlanValidationIssue[] = [];
  const prefix = input.pathPrefix ?? "referenceUsage";
  for (const [index, summary] of usage.entries()) {
    const path = `${prefix}.${index}`;
    validateSourceType(`${path}.sourceType`, summary.sourceType, issues);
    validateResourceAuthorization(
      path,
      summary.sourceType,
      summary.resourceType,
      summary.resourceId,
      input.authorizedResourceRefs,
      issues,
    );
    for (const action of summary.actions) {
      if (!REFERENCE_ACTIONS.has(action)) {
        issues.push(issue(`${path}.actions`, "usage action is not supported"));
      }
    }
    for (const slot of summary.slots) {
      if (!CONTENT_SLOTS.has(slot)) {
        issues.push(issue(`${path}.slots`, "usage slot is not supported"));
      }
    }
    if (!RISK_LEVELS.has(summary.riskLevel)) {
      issues.push(issue(`${path}.riskLevel`, "risk level is not supported"));
    }
    if (input.allowedAtomIds !== undefined) {
      for (const atomId of summary.atomIds) {
        if (!input.allowedAtomIds.has(atomId)) {
          issues.push(issue(`${path}.atomIds`, "usage references an unknown atom"));
        }
      }
    }
    validateSensitiveText(`${path}.usageSummary`, summary.usageSummary, issues);
  }
  return buildResult(issues);
}

function validateAtom(
  path: string,
  atom: ReferenceAtom,
  authorized: AuthorizedReferenceResourceRef[],
  atomIds: Set<string>,
  issues: ReferencePlanValidationIssue[],
): void {
  if (atom.id.trim().length === 0) {
    issues.push(issue(`${path}.id`, "atom id is required"));
  } else if (atomIds.has(atom.id)) {
    issues.push(issue(`${path}.id`, "atom id must be unique"));
  } else {
    atomIds.add(atom.id);
  }
  validateSourceType(`${path}.sourceType`, atom.sourceType, issues);
  validateResourceAuthorization(
    path,
    atom.sourceType,
    atom.resourceType,
    atom.resourceId,
    authorized,
    issues,
  );
  for (const action of atom.allowedActions) {
    if (!REFERENCE_ACTIONS.has(action)) {
      issues.push(issue(`${path}.allowedActions`, "atom action is not supported"));
    }
  }
  for (const slot of atom.targetSlots) {
    if (!CONTENT_SLOTS.has(slot)) {
      issues.push(issue(`${path}.targetSlots`, "atom slot is not supported"));
    }
  }
  if (!RISK_LEVELS.has(atom.riskLevel)) {
    issues.push(issue(`${path}.riskLevel`, "risk level is not supported"));
  }
  validateSensitiveText(`${path}.summary`, atom.summary, issues);
  validateSensitiveText(`${path}.usageBoundary`, atom.usageBoundary, issues);
  for (const [index, forbiddenUse] of atom.forbiddenUses.entries()) {
    validateSensitiveText(`${path}.forbiddenUses.${index}`, forbiddenUse, issues);
  }
}

function validateSourceType(
  path: string,
  value: ReferencePlanSourceType,
  issues: ReferencePlanValidationIssue[],
): void {
  if (!REFERENCE_SOURCE_TYPES.has(value)) {
    issues.push(issue(path, "reference source type is not supported"));
  }
}

function validateResourceAuthorization(
  path: string,
  sourceType: ReferencePlanSourceType,
  resourceType: AuthorizedReferenceResourceRef["resourceType"] | null,
  resourceId: string | null,
  authorized: AuthorizedReferenceResourceRef[],
  issues: ReferencePlanValidationIssue[],
): void {
  const inferred = resourceType ?? inferResourceType(sourceType);
  if (inferred === null) {
    return;
  }
  if (resourceId === null || resourceId.trim().length === 0) {
    issues.push(issue(`${path}.resourceId`, "resource id is required for referenced materials"));
    return;
  }
  const allowed = authorized.some((ref) =>
    ref.resourceType === inferred && ref.resourceId === resourceId,
  );
  if (!allowed) {
    issues.push(issue(`${path}.resourceId`, `resource is not authorized: ${inferred}`));
  }
}

function inferResourceType(
  sourceType: ReferencePlanSourceType,
): AuthorizedReferenceResourceRef["resourceType"] | null {
  if (sourceType === "nutrient" || sourceType === "formal_nutrient") {
    return "nutrient";
  }
  if (sourceType === "temporary_nutrient_card") {
    return "nutrient_card";
  }
  if (sourceType === "media") {
    return "media";
  }
  if (sourceType === "gene") {
    return "gene";
  }
  return null;
}

function validateSensitiveText(
  path: string,
  value: string,
  issues: ReferencePlanValidationIssue[],
): void {
  if (containsSensitiveText(value)) {
    issues.push(issue(path, "text contains sensitive local or credential-like data"));
  }
}

function containsSensitiveText(value: string): boolean {
  return /[a-zA-Z]:\\|\/Users\/|\/home\/|\/var\/|\/tmp\/|api[_ -]?key|cookie|mcp[_ -]?session/i
    .test(value);
}

function issue(path: string, message: string): ReferencePlanValidationIssue {
  return {
    path: sanitize(path),
    message: sanitize(message),
  };
}

function buildResult(issues: ReferencePlanValidationIssue[]): ReferencePlanValidationResult {
  return {
    ok: issues.length === 0,
    issues,
    summary:
      issues.length === 0
        ? "reference plan validation passed"
        : issues.map((item) => `${item.path}: ${item.message}`).join("; "),
  };
}

function sanitize(value: string): string {
  return value
    .replace(/[a-zA-Z]:\\[^\s"'`]+/g, "[redacted-path]")
    .replace(/\/(?:Users|home|var|tmp)\/[^\s"'`]+/g, "[redacted-path]")
    .replace(/(api[_ -]?key|cookie|mcp[_ -]?session)\s*[:=]\s*[^\s"'`]+/gi, "$1=[redacted]")
    .slice(0, 240);
}
