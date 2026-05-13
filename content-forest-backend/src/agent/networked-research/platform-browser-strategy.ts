import type { BrowserActionRuntime } from "./browser-action-runtime.js";
import type {
  NetworkResearchRequest,
  NetworkResearchResult,
  RawNetworkResearchItem,
  ResearchQueryPlan,
} from "./types.js";

export interface PlatformBrowserStrategyInput {
  request: NetworkResearchRequest;
  plan: ResearchQueryPlan;
  candidates: NetworkResearchResult[];
  runtime: BrowserActionRuntime;
  allowedDomains: string[];
  timeoutMs: number;
  maxSteps: number;
  maxExcerptChars: number;
}

export interface PlatformBrowserStrategy {
  readonly name: string;
  readonly platform: string;
  canExplore(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
    candidates: NetworkResearchResult[],
  ): boolean;
  explore(input: PlatformBrowserStrategyInput): Promise<RawNetworkResearchItem[]>;
}
