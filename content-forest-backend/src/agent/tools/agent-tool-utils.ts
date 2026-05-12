import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskContext } from "../runtime/agent-task.js";

export function requireRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError("VALIDATION_ERROR", message, 400);
  }
  return value as Record<string, unknown>;
}

export function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", message, 400);
  }
  return value.trim();
}

export function readAuthorizedGeneratorId(context: AgentTaskContext): string {
  const scope = requireRecord(
    context.input.authorizationScope,
    "任务授权范围不能为空",
  );
  return requireString(scope.generatorId, "授权生成器不能为空");
}

export function readAuthorizedResourceRefs(
  context: AgentTaskContext,
): Array<{ resourceType: "nutrient" | "gene" | "nutrient_card"; resourceId: string }> {
  const scope = requireRecord(
    context.input.authorizationScope,
    "任务授权范围不能为空",
  );
  return [
    ...normalizeResourceRefs(scope.nutrientRefs, "nutrient"),
    ...normalizeResourceRefs(scope.temporaryNutrientCardRefs, "nutrient_card"),
    ...normalizeResourceRefs(scope.geneRefs, "gene"),
  ];
}

export function readSourceNodeRef(context: AgentTaskContext): {
  nodeType: "seed" | "fruit";
  nodeId: string;
} {
  const source = requireRecord(context.input.sourceNodeRef, "来源节点不能为空");
  const nodeType = source.nodeType;
  if (nodeType !== "seed" && nodeType !== "fruit") {
    throw new ApplicationError("VALIDATION_ERROR", "来源节点类型不正确", 400);
  }
  return {
    nodeType,
    nodeId: requireString(source.nodeId, "来源节点不能为空"),
  };
}

export function normalizeRelativeSkillPath(value: unknown): string {
  const path = requireString(value, "生成器脚本路径不能为空")
    .replaceAll("\\", "/")
    .replace(/^\.\/+/, "");
  const segments = path.split("/").filter((segment) => segment.length > 0);
  if (
    path.startsWith("/") ||
    /^[a-zA-Z]:\//.test(path) ||
    segments.length === 0 ||
    segments.includes("..")
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "生成器路径不能越权", 400);
  }
  return segments.join("/");
}

function normalizeResourceRefs(
  value: unknown,
  expectedType: "nutrient" | "gene" | "nutrient_card",
): Array<{ resourceType: "nutrient" | "gene" | "nutrient_card"; resourceId: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const ref = requireRecord(item, "授权资源引用格式不正确");
    if (ref.resourceType !== expectedType) {
      throw new ApplicationError("VALIDATION_ERROR", "授权资源类型不正确", 400);
    }
    return {
      resourceType: expectedType,
      resourceId: requireString(ref.resourceId, "授权资源不能为空"),
    };
  });
}
