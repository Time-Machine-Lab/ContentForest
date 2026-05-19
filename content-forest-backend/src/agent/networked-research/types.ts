export type NetworkDataMode = "research" | "observe";

export type NetworkResearchPhase = "initial_search" | "deep_exploration";

export type NetworkResearchResultQuality =
  | "candidate_lead"
  | "observed_case"
  | "complete_observed_case";

export type NetworkRestrictedStatusCode =
  | "provider_unavailable"
  | "missing_api_key"
  | "quota_exceeded"
  | "network_error"
  | "restricted_by_captcha"
  | "restricted_by_login"
  | "access_denied"
  | "empty_result"
  | "layout_changed"
  | "timeout"
  | "domain_not_allowed"
  | "unknown";

export interface NetworkRestrictedStatus {
  code: NetworkRestrictedStatusCode;
  reason: string;
  phase: NetworkResearchPhase;
  providerName: string;
  platform?: string | null;
  url?: string;
  sourceDomain?: string;
  diagnosticExcerpt?: string;
}

export interface ResearchQueryPlan {
  intent: "platform_cases" | "platform_rules" | "trend" | "general";
  targetPlatform: string | null;
  contentObject: string;
  queries: string[];
  siteSearchQueries: string[];
  requestedDeepExploration: boolean;
  expectedResultCount: number | null;
  notes: string[];
}

export interface NetworkResearchRequest {
  mode: "research";
  request: string;
  seedTitle?: string;
  nutrientCardTitle?: string;
  targetPlatform?: string;
  maxResults?: number;
  deepExploration?: boolean;
}

export interface NetworkObserveRequest {
  mode: "observe";
  url: string;
  platform?: string | null;
}

export type NetworkDataRequest = NetworkResearchRequest | NetworkObserveRequest;

export interface NetworkEngagement {
  likes?: number;
  favorites?: number;
  comments?: number;
  views?: number;
  shares?: number;
  [key: string]: number | string | boolean | null | undefined;
}

export interface NetworkEvidenceAuthor {
  id?: string;
  name?: string;
  url?: string;
}

export interface NetworkEvidenceCompleteness {
  hasPlatformIdOrUrl: boolean;
  hasTitle: boolean;
  hasAuthor: boolean;
  hasBodyOrExcerpt: boolean;
  hasEngagement: boolean;
}

export interface RawNetworkResearchItem {
  platformItemId?: string | null;
  title?: string;
  url?: string;
  author?: NetworkEvidenceAuthor;
  coverUrl?: string | null;
  snippet?: string;
  source?: string;
  sourceDomain?: string;
  platform?: string | null;
  publishedAt?: string | null;
  capturedAt?: string;
  engagement?: NetworkEngagement;
  rawExcerpt?: string;
  providerName?: string;
  phase?: NetworkResearchPhase;
  resultQuality?: NetworkResearchResultQuality;
  evidenceCompleteness?: Partial<NetworkEvidenceCompleteness>;
  observedAt?: string | null;
  restrictedStatus?: NetworkRestrictedStatus;
}

export interface NetworkResearchResult {
  platformItemId: string | null;
  title: string;
  url: string;
  author: NetworkEvidenceAuthor;
  coverUrl: string | null;
  source: string;
  sourceDomain: string;
  platform: string | null;
  snippet: string;
  publishedAt: string | null;
  capturedAt: string;
  freshness: "fresh" | "recent" | "unknown";
  engagement: NetworkEngagement;
  rawExcerpt: string;
  providerName: string;
  relevanceScore: number;
  phase: NetworkResearchPhase;
  resultQuality: NetworkResearchResultQuality;
  evidenceCompleteness: NetworkEvidenceCompleteness;
  observedAt: string | null;
}

export interface NetworkObservationResult {
  url: string;
  sourceDomain: string;
  platform: string | null;
  capturedAt: string;
  accessStatus: "accessible" | "restricted" | "not_found" | "unknown";
  metrics: NetworkEngagement;
  missingMetrics: string[];
  sourceMethod: string;
  rawExcerpt: string;
  providerName: string;
}

export interface NetworkProviderFailure {
  providerName: string;
  reason: string;
  code?: NetworkRestrictedStatusCode | "provider_error" | "strategy_unavailable";
  phase?: NetworkResearchPhase | "observe";
}

export interface NetworkProviderRunTrace {
  providerName: string;
  phase: NetworkResearchPhase;
  status: "success" | "failure";
  durationMs: number;
  resultCount: number;
  restrictedCount: number;
  failureCode?: NetworkProviderFailure["code"];
}

export interface NetworkResearchTrace {
  queryPlan: {
    queryCount: number;
    siteSearchQueryCount: number;
    targetPlatform: string | null;
    intent: ResearchQueryPlan["intent"];
  };
  initialSearch: {
    providers: string[];
    providerRuns: NetworkProviderRunTrace[];
    resultCount: number;
    failureCount: number;
  };
  deepExploration: {
    triggered: boolean;
    reason: string | null;
    providers: string[];
    providerRuns: NetworkProviderRunTrace[];
    resultCount: number;
    restrictedCount: number;
  };
  qualityGate: {
    targetResultCount: number;
    completeObservedCaseCount: number;
    observedCaseCount: number;
    candidateLeadCount: number;
    restrictedCount: number;
    providerUnavailable: boolean;
    codexTriggered: boolean;
    codexTriggerReason: string | null;
  };
}

export interface NetworkResearchContextPackage {
  mode: "research";
  queryPlan: ResearchQueryPlan;
  results: NetworkResearchResult[];
  failures: NetworkProviderFailure[];
  restrictedStatuses: NetworkRestrictedStatus[];
  trace: NetworkResearchTrace;
}

export interface NetworkObservationPackage {
  mode: "observe";
  observation: NetworkObservationResult | null;
  failures: NetworkProviderFailure[];
}

export type NetworkDataPackage =
  | NetworkResearchContextPackage
  | NetworkObservationPackage;

export interface NetworkSearchProvider {
  readonly name: string;
  canSearch(request: NetworkResearchRequest, plan: ResearchQueryPlan): boolean;
  search(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]>;
}

export interface NetworkExplorationProvider {
  readonly name: string;
  canExplore(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
    candidates: NetworkResearchResult[],
  ): boolean;
  explore(input: {
    request: NetworkResearchRequest;
    plan: ResearchQueryPlan;
    candidates: NetworkResearchResult[];
  }): Promise<RawNetworkResearchItem[]>;
}

export interface NetworkProvider {
  readonly name: string;
  canResearch(request: NetworkResearchRequest): boolean;
  research?(
    request: NetworkResearchRequest,
    plan: ResearchQueryPlan,
  ): Promise<RawNetworkResearchItem[]>;
  canObserve(request: NetworkObserveRequest): boolean;
  observe?(request: NetworkObserveRequest): Promise<Partial<NetworkObservationResult>>;
}

export type NetworkProviderEntry =
  | NetworkProvider
  | NetworkSearchProvider
  | NetworkExplorationProvider;
