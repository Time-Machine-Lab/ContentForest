import type {
  NetworkProviderFailure,
  NetworkResearchPhase,
  NetworkRestrictedStatusCode,
} from "./types.js";

export class NetworkProviderError extends Error {
  public readonly failureCode: NetworkRestrictedStatusCode | "provider_error" | "strategy_unavailable";

  public constructor(
    failureCode: NetworkProviderError["failureCode"],
    message: string,
  ) {
    super(message);
    this.name = "NetworkProviderError";
    this.failureCode = failureCode;
  }
}

export function providerFailureFromError(input: {
  providerName: string;
  error: unknown;
  phase: NetworkResearchPhase | "observe";
}): NetworkProviderFailure {
  if (input.error instanceof NetworkProviderError) {
    return {
      providerName: input.providerName,
      reason: sanitizeFailureReason(input.error.message),
      code: input.error.failureCode,
      phase: input.phase,
    };
  }
  const message =
    input.error instanceof Error ? input.error.message : "Provider execution failed";
  return {
    providerName: input.providerName,
    reason: sanitizeFailureReason(message),
    code: inferFailureCode(message),
    phase: input.phase,
  };
}

function inferFailureCode(
  message: string,
): NetworkProviderFailure["code"] {
  const normalized = message.toLowerCase();
  if (/api key|apikey|missing key|key 缺失|未配置/.test(normalized)) {
    return "missing_api_key";
  }
  if (/quota|rate limit|额度|频率/.test(normalized)) {
    return "quota_exceeded";
  }
  if (/timeout|timed out|超时/.test(normalized)) {
    return "timeout";
  }
  if (/not in the allowed domains|domain is not allowed|域名不在|域名未授权/.test(normalized)) {
    return "domain_not_allowed";
  }
  if (/network|fetch|联网|连接/.test(normalized)) {
    return "network_error";
  }
  return "provider_error";
}

function sanitizeFailureReason(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, "Bearer [redacted-secret]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[redacted-secret]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[redacted-secret]")
    .slice(0, 320);
}
