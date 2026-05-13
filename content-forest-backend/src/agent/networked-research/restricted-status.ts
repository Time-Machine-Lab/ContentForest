import { domainOf } from "./browser-action-runtime.js";
import type {
  NetworkResearchPhase,
  NetworkRestrictedStatus,
  NetworkRestrictedStatusCode,
} from "./types.js";

export function detectRestrictedStatus(input: {
  text: string;
  phase: NetworkResearchPhase;
  providerName: string;
  platform?: string | null;
  url?: string;
  sourceDomain?: string;
}): NetworkRestrictedStatus | null {
  const excerpt = input.text.slice(0, 800);
  const normalized = input.text.toLowerCase();
  const code = detectCode(input.text, normalized);
  if (code === null) {
    return null;
  }
  return {
    code,
    reason: reasonOf(code),
    phase: input.phase,
    providerName: input.providerName,
    platform: input.platform ?? null,
    url: input.url,
    sourceDomain: input.sourceDomain ?? (input.url === undefined ? undefined : domainOf(input.url)),
    diagnosticExcerpt: excerpt,
  };
}

function detectCode(
  original: string,
  normalized: string,
): NetworkRestrictedStatusCode | null {
  if (original.trim().length === 0 || normalized.includes("(empty page)")) {
    return "empty_result";
  }
  if (
    /请验证您是真人|人机验证|安全验证|验证码|验证以继续|cloudflare|captcha/.test(
      normalized,
    )
  ) {
    return "restricted_by_captcha";
  }
  if (/请登录|登录后|扫码登录|sign in|log in|login required/.test(normalized)) {
    return "restricted_by_login";
  }
  if (
    /访问受限|安全限制|ip存在风险|存在风险|access denied|forbidden|too many requests|频率过高/.test(
      normalized,
    )
  ) {
    return "access_denied";
  }
  if (/暂无结果|没有找到|no results/.test(normalized)) {
    return "empty_result";
  }
  return null;
}

function reasonOf(code: NetworkRestrictedStatusCode): string {
  switch (code) {
    case "restricted_by_captcha":
      return "页面触发验证码或真人验证，不能作为有效研究结果";
    case "restricted_by_login":
      return "页面要求登录后查看，不能作为有效研究结果";
    case "access_denied":
      return "页面访问受限，不能作为有效研究结果";
    case "empty_result":
      return "页面未返回可用结果";
    default:
      return "页面受限或不可用";
  }
}
