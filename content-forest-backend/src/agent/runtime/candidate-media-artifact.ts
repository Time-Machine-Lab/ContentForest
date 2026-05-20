import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskOutput } from "./agent-task.js";

export type CandidateMediaType = "image" | "video";
export type CandidateMediaDisplayRole =
  | "primary"
  | "inline"
  | "reference"
  | "attachment";

export interface CandidateMediaArtifactSummary {
  id: string;
  sourceToolName: string;
  mediaType: CandidateMediaType;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  displayRole: CandidateMediaDisplayRole;
  required: boolean;
  attachToFruit: boolean;
  purpose: string | null;
  temporaryResourceRef: string | null;
  warnings: string[];
}

export interface CandidateMediaArtifactPayload
  extends CandidateMediaArtifactSummary {
  content?: Buffer;
}

export interface ToolCandidateMediaArtifactInput {
  id?: string;
  artifactId?: string;
  mediaType?: string;
  mimeType?: string;
  fileName?: string;
  filename?: string;
  name?: string;
  sizeBytes?: number;
  displayRole?: string;
  role?: string;
  required?: boolean;
  attachToFruit?: boolean;
  purpose?: string;
  temporaryResourceRef?: string;
  tempRef?: string;
  content?: Buffer | Uint8Array | ArrayBuffer | string;
  contentBase64?: string;
  bytesBase64?: string;
  contentEncoding?: string;
  localPath?: string;
  path?: string;
  absolutePath?: string;
}

export const CANDIDATE_MEDIA_ARTIFACTS_SYMBOL = Symbol.for(
  "content-forest.agent.candidate-media-artifacts",
);

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export function normalizeToolCandidateMediaArtifacts(input: {
  taskId: string;
  toolName: string;
  artifacts: unknown;
  startIndex?: number;
}): CandidateMediaArtifactPayload[] {
  if (input.artifacts === undefined || input.artifacts === null) {
    return [];
  }
  if (!Array.isArray(input.artifacts)) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "候选媒体产物必须是数组",
      500,
    );
  }
  return input.artifacts.map((artifact, index) =>
    normalizeToolCandidateMediaArtifact({
      taskId: input.taskId,
      toolName: input.toolName,
      artifact,
      index: (input.startIndex ?? 0) + index + 1,
    }),
  );
}

export function attachCandidateMediaArtifacts(
  output: AgentTaskOutput,
  artifacts: CandidateMediaArtifactPayload[],
): AgentTaskOutput {
  if (artifacts.length === 0) {
    return output;
  }
  const outputWithMetadata: AgentTaskOutput = {
    ...output,
    metadata: {
      ...(output.metadata ?? {}),
      candidateMediaArtifacts: artifacts.map(candidateMediaArtifactSummary),
    },
  };
  Object.defineProperty(outputWithMetadata, CANDIDATE_MEDIA_ARTIFACTS_SYMBOL, {
    value: artifacts.map((artifact) => ({ ...artifact })),
    enumerable: false,
    configurable: false,
  });
  return outputWithMetadata;
}

export function readCandidateMediaArtifacts(
  output: AgentTaskOutput,
): CandidateMediaArtifactPayload[] {
  const artifacts = (output as {
    [CANDIDATE_MEDIA_ARTIFACTS_SYMBOL]?: CandidateMediaArtifactPayload[];
  })[CANDIDATE_MEDIA_ARTIFACTS_SYMBOL];
  return (artifacts ?? []).map((artifact) => ({
    ...artifact,
    content: artifact.content === undefined
      ? undefined
      : Buffer.from(artifact.content),
  }));
}

export function candidateMediaArtifactSummary(
  artifact: CandidateMediaArtifactPayload,
): CandidateMediaArtifactSummary {
  return {
    id: artifact.id,
    sourceToolName: artifact.sourceToolName,
    mediaType: artifact.mediaType,
    mimeType: artifact.mimeType,
    fileName: artifact.fileName,
    sizeBytes: artifact.sizeBytes,
    displayRole: artifact.displayRole,
    required: artifact.required,
    attachToFruit: artifact.attachToFruit,
    purpose: artifact.purpose,
    temporaryResourceRef: artifact.temporaryResourceRef,
    warnings: [...artifact.warnings],
  };
}

function normalizeToolCandidateMediaArtifact(input: {
  taskId: string;
  toolName: string;
  artifact: unknown;
  index: number;
}): CandidateMediaArtifactPayload {
  const record = requireRecord(input.artifact);
  const mimeType = requireString(record.mimeType, "候选媒体 MIME 类型不能为空")
    .toLowerCase();
  const mediaType = normalizeMediaType(record.mediaType, mimeType);
  const content = normalizeContent(record);
  const sizeBytes = content?.byteLength ??
    normalizeSizeBytes(record.sizeBytes) ??
    0;
  validateSize(mediaType, sizeBytes);
  const warnings = collectBoundaryWarnings(record, content);
  return {
    id: normalizeArtifactId(
      firstString(record.id, record.artifactId),
      input.toolName,
      input.index,
    ),
    sourceToolName: input.toolName,
    mediaType,
    mimeType,
    fileName: normalizeFileName(
      firstString(record.fileName, record.filename, record.name),
    ),
    sizeBytes,
    displayRole: normalizeDisplayRole(
      firstString(record.displayRole, record.role),
    ),
    required: record.required === true,
    attachToFruit: record.attachToFruit !== false,
    purpose: normalizeOptionalText(record.purpose),
    temporaryResourceRef: normalizeTemporaryResourceRef(
      firstString(record.temporaryResourceRef, record.tempRef),
      warnings,
    ),
    warnings,
    content,
  };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "候选媒体产物必须是对象",
      500,
    );
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", message, 500);
  }
  return value.trim();
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string =>
    typeof value === "string" && value.trim().length > 0,
  );
}

function normalizeMediaType(
  value: unknown,
  mimeType: string,
): CandidateMediaType {
  if (value === "image" || value === "video") {
    return value;
  }
  if (ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    return "image";
  }
  if (ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
    return "video";
  }
  throw new ApplicationError("VALIDATION_ERROR", "候选媒体 MIME 类型不受支持", 500);
}

function normalizeContent(
  record: Record<string, unknown>,
): Buffer | undefined {
  const encoded = firstString(record.contentBase64, record.bytesBase64);
  if (encoded !== undefined) {
    return decodeBase64(encoded);
  }
  if (
    typeof record.content === "string" &&
    record.contentEncoding === "base64"
  ) {
    return decodeBase64(record.content);
  }
  if (Buffer.isBuffer(record.content)) {
    return Buffer.from(record.content);
  }
  if (record.content instanceof Uint8Array) {
    return Buffer.from(record.content);
  }
  if (record.content instanceof ArrayBuffer) {
    return Buffer.from(record.content);
  }
  return undefined;
}

function decodeBase64(value: string): Buffer {
  const normalized = value.replace(/\s+/g, "");
  if (
    normalized.length === 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "候选媒体 Base64 格式不正确", 500);
  }
  return Buffer.from(normalized, "base64");
}

function normalizeSizeBytes(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : undefined;
}

function validateSize(mediaType: CandidateMediaType, sizeBytes: number): void {
  const limit = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (sizeBytes > limit) {
    throw new ApplicationError("VALIDATION_ERROR", "候选媒体文件超过大小限制", 500);
  }
}

function collectBoundaryWarnings(
  record: Record<string, unknown>,
  content: Buffer | undefined,
): string[] {
  const warnings: string[] = [];
  for (const key of ["localPath", "path", "absolutePath"]) {
    const value = record[key];
    if (typeof value === "string" && containsRealPath(value)) {
      warnings.push("候选媒体包含本机路径，已丢弃路径并仅保留安全摘要。");
    }
  }
  if (content === undefined) {
    warnings.push("候选媒体缺少可直接接管的二进制内容。");
  }
  return [...new Set(warnings)];
}

function normalizeTemporaryResourceRef(
  value: string | undefined,
  warnings: string[],
): string | null {
  if (value === undefined) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }
  if (containsRealPath(normalized)) {
    warnings.push("候选媒体临时引用包含本机路径，已丢弃。");
    return null;
  }
  return normalized.slice(0, 160);
}

function normalizeArtifactId(
  value: string | undefined,
  toolName: string,
  index: number,
): string {
  const normalized = (value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .replace(/^_+|_+$/g, "");
  if (normalized.length > 0) {
    return normalized.slice(0, 120);
  }
  return `candidate-media_${toolName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${index}`;
}

function normalizeFileName(value: string | undefined): string {
  const normalized = (value ?? "media.bin")
    .replaceAll("\\", "/")
    .split("/")
    .filter((part) => part.length > 0)
    .at(-1)
    ?.replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+$/, "") ?? "";
  return normalized.length > 0 ? normalized : "media.bin";
}

function normalizeDisplayRole(
  value: string | undefined,
): CandidateMediaDisplayRole {
  if (
    value === "primary" ||
    value === "inline" ||
    value === "reference" ||
    value === "attachment"
  ) {
    return value;
  }
  return "attachment";
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  return value
    .trim()
    .replace(/[a-zA-Z]:\\[^\s"'`]+/g, "[local-path]")
    .replace(/\/(?:Users|home|var|tmp)\/[^\s"'`]+/g, "[local-path]")
    .slice(0, 240);
}

function containsRealPath(value: string): boolean {
  return /[a-zA-Z]:\\|[a-zA-Z]:\/|\/(?:Users|home|var|tmp)\//.test(value);
}
