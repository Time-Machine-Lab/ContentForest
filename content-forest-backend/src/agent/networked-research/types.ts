export type NetworkDataMode = "research" | "observe";

export interface ResearchQueryPlan {
  intent: "platform_cases" | "platform_rules" | "trend" | "general";
  targetPlatform: string | null;
  contentObject: string;
  queries: string[];
  notes: string[];
}

export interface NetworkResearchRequest {
  mode: "research";
  request: string;
  seedTitle?: string;
  nutrientCardTitle?: string;
  targetPlatform?: string;
  maxResults?: number;
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

export interface RawNetworkResearchItem {
  title?: string;
  url?: string;
  snippet?: string;
  source?: string;
  sourceDomain?: string;
  platform?: string | null;
  publishedAt?: string | null;
  capturedAt?: string;
  engagement?: NetworkEngagement;
  rawExcerpt?: string;
  providerName?: string;
}

export interface NetworkResearchResult {
  title: string;
  url: string;
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
}

export interface NetworkResearchContextPackage {
  mode: "research";
  queryPlan: ResearchQueryPlan;
  results: NetworkResearchResult[];
  failures: NetworkProviderFailure[];
}

export interface NetworkObservationPackage {
  mode: "observe";
  observation: NetworkObservationResult | null;
  failures: NetworkProviderFailure[];
}

export type NetworkDataPackage =
  | NetworkResearchContextPackage
  | NetworkObservationPackage;

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
