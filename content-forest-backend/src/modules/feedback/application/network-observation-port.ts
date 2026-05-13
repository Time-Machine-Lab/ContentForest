export interface NetworkObservationInput {
  url: string;
  platform?: string;
}

export interface NetworkObservation {
  url: string;
  sourceDomain: string;
  platform: string | null;
  capturedAt: string;
  accessStatus: "accessible" | "restricted" | "not_found" | "unknown";
  metrics: Record<string, unknown>;
  missingMetrics: string[];
  sourceMethod: string;
  rawExcerpt: string;
  providerName: string;
}

export interface NetworkObservationPort {
  observeUrl(input: NetworkObservationInput): Promise<NetworkObservation>;
}
