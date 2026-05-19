import { ApplicationError } from "../../shared/errors/application-error.js";
import { normalizeObservationResult, normalizeResearchResults } from "./normalization.js";
import { planNetworkResearch } from "./query-planner.js";
import { providerFailureFromError } from "./provider-failure.js";
import type {
  NetworkDataPackage,
  NetworkDataRequest,
  NetworkExplorationProvider,
  NetworkObservationPackage,
  NetworkProvider,
  NetworkProviderEntry,
  NetworkProviderFailure,
  NetworkProviderRunTrace,
  NetworkResearchContextPackage,
  NetworkResearchResult,
  NetworkRestrictedStatus,
  NetworkSearchProvider,
  RawNetworkResearchItem,
} from "./types.js";

export interface NetworkProviderRouterOptions {
  providers: NetworkProviderEntry[];
  now?: () => Date;
}

export class NetworkProviderRouter {
  private readonly providers: NetworkProviderEntry[];
  private readonly now: () => Date;

  public constructor(options: NetworkProviderRouterOptions) {
    this.providers = [...options.providers];
    this.now = options.now ?? (() => new Date());
  }

  public async run(request: NetworkDataRequest): Promise<NetworkDataPackage> {
    if (request.mode === "observe") {
      return this.observe(request);
    }
    return this.research(request);
  }

  private async research(
    request: Extract<NetworkDataRequest, { mode: "research" }>,
  ): Promise<NetworkResearchContextPackage> {
    const plan = planNetworkResearch(request);
    const routedRequest: Extract<NetworkDataRequest, { mode: "research" }> = {
      ...request,
      targetPlatform: request.targetPlatform ?? plan.targetPlatform ?? undefined,
    };
    const failures: NetworkProviderFailure[] = [];
    const restrictedStatuses: NetworkRestrictedStatus[] = [];
    const rawItems: RawNetworkResearchItem[] = [];
    const initialProviderNames: string[] = [];
    const deepProviderNames: string[] = [];
    const initialProviderRuns: NetworkProviderRunTrace[] = [];
    const deepProviderRuns: NetworkProviderRunTrace[] = [];

    const researchProviders = this.providers.filter(isLegacyResearchProvider);
    const initialProviders = [
      ...this.providers.filter(isSearchProvider),
      ...researchProviders.filter((provider) => !isCodexExternalResearchProvider(provider)),
    ];
    for (const provider of initialProviders) {
      if (isSearchProvider(provider)) {
        if (!provider.canSearch(routedRequest, plan)) {
          continue;
        }
        initialProviderNames.push(provider.name);
        const providerStartedAt = Date.now();
        const rawItemCountBeforeProvider = rawItems.length;
        const restrictedCountBeforeProvider = restrictedStatuses.length;
        try {
          collectRawItems(
            rawItems,
            restrictedStatuses,
            await provider.search(routedRequest, plan),
          );
          initialProviderRuns.push({
            providerName: provider.name,
            phase: "initial_search",
            status: "success",
            durationMs: Date.now() - providerStartedAt,
            resultCount: rawItems.length - rawItemCountBeforeProvider,
            restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
          });
        } catch (error) {
          const failure = providerFailureFromError({
            providerName: provider.name,
            error,
            phase: "initial_search",
          });
          failures.push(failure);
          initialProviderRuns.push({
            providerName: provider.name,
            phase: "initial_search",
            status: "failure",
            durationMs: Date.now() - providerStartedAt,
            resultCount: rawItems.length - rawItemCountBeforeProvider,
            restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
            failureCode: failure.code,
          });
        }
        continue;
      }

      if (!provider.canResearch(routedRequest) || provider.research === undefined) {
        continue;
      }
      initialProviderNames.push(provider.name);
      const providerStartedAt = Date.now();
      const rawItemCountBeforeProvider = rawItems.length;
      const restrictedCountBeforeProvider = restrictedStatuses.length;
      try {
        collectRawItems(
          rawItems,
          restrictedStatuses,
          await provider.research(routedRequest, plan),
        );
        initialProviderRuns.push({
          providerName: provider.name,
          phase: "initial_search",
          status: "success",
          durationMs: Date.now() - providerStartedAt,
          resultCount: rawItems.length - rawItemCountBeforeProvider,
          restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
        });
        if (rawItems.length > rawItemCountBeforeProvider) {
          break;
        }
      } catch (error) {
        const failure = providerFailureFromError({
          providerName: provider.name,
          error,
          phase: "initial_search",
        });
        failures.push(failure);
        initialProviderRuns.push({
          providerName: provider.name,
          phase: "initial_search",
          status: "failure",
          durationMs: Date.now() - providerStartedAt,
          resultCount: rawItems.length - rawItemCountBeforeProvider,
          restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
          failureCode: failure.code,
        });
      }
    }

    const normalizedInitial = normalizeResearchResults(rawItems, this.now);
    const explorationProviders = this.providers.filter(isExplorationProvider);
    const codexDeepResearchProviders = researchProviders.filter(isCodexExternalResearchProvider);
    const explicitDeepExploration = routedRequest.deepExploration === true;
    const explorationReason =
      explorationProviders.length > 0 || codexDeepResearchProviders.length > 0 || explicitDeepExploration
        ? coverageGateTriggerReason({
            request: routedRequest,
            plan,
            initialResults: normalizedInitial,
            failures,
            restrictedStatuses,
            initialProviderRuns,
          })
        : null;
    if (explorationReason !== null) {
      let explored = false;
      for (const provider of explorationProviders) {
        if (!provider.canExplore(routedRequest, plan, normalizedInitial)) {
          continue;
        }
        explored = true;
        deepProviderNames.push(provider.name);
        const providerStartedAt = Date.now();
        const rawItemCountBeforeProvider = rawItems.length;
        const restrictedCountBeforeProvider = restrictedStatuses.length;
        try {
          collectRawItems(
            rawItems,
            restrictedStatuses,
            await provider.explore({
              request: routedRequest,
              plan,
              candidates: normalizedInitial,
            }),
          );
          deepProviderRuns.push({
            providerName: provider.name,
            phase: "deep_exploration",
            status: "success",
            durationMs: Date.now() - providerStartedAt,
            resultCount: rawItems.length - rawItemCountBeforeProvider,
            restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
          });
        } catch (error) {
          const failure = providerFailureFromError({
            providerName: provider.name,
            error,
            phase: "deep_exploration",
          });
          failures.push(failure);
          deepProviderRuns.push({
            providerName: provider.name,
            phase: "deep_exploration",
            status: "failure",
            durationMs: Date.now() - providerStartedAt,
            resultCount: rawItems.length - rawItemCountBeforeProvider,
            restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
            failureCode: failure.code,
          });
        }
      }
      for (const provider of codexDeepResearchProviders) {
        if (!provider.canResearch(routedRequest) || provider.research === undefined) {
          continue;
        }
        explored = true;
        deepProviderNames.push(provider.name);
        const providerStartedAt = Date.now();
        const rawItemCountBeforeProvider = rawItems.length;
        const restrictedCountBeforeProvider = restrictedStatuses.length;
        try {
          collectRawItems(
            rawItems,
            restrictedStatuses,
            forceResearchPhase(
              await provider.research(routedRequest, plan),
              "deep_exploration",
            ),
          );
          deepProviderRuns.push({
            providerName: provider.name,
            phase: "deep_exploration",
            status: "success",
            durationMs: Date.now() - providerStartedAt,
            resultCount: rawItems.length - rawItemCountBeforeProvider,
            restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
          });
        } catch (error) {
          const failure = providerFailureFromError({
            providerName: provider.name,
            error,
            phase: "deep_exploration",
          });
          failures.push(failure);
          deepProviderRuns.push({
            providerName: provider.name,
            phase: "deep_exploration",
            status: "failure",
            durationMs: Date.now() - providerStartedAt,
            resultCount: rawItems.length - rawItemCountBeforeProvider,
            restrictedCount: restrictedStatuses.length - restrictedCountBeforeProvider,
            failureCode: failure.code,
          });
        }
      }
      if (!explored) {
        failures.push({
          providerName: "provider_router",
          reason: "No available coverage gate provider for deep research",
          code: "strategy_unavailable",
          phase: "deep_exploration",
        });
      }
    }

    if (rawItems.length === 0 && failures.length === 0 && restrictedStatuses.length === 0) {
      failures.push({
        providerName: "provider_router",
        reason: "Network research providers ran but returned no usable results",
        code: "empty_result",
        phase: "initial_search",
      });
    }

    const results = normalizeResearchResults(rawItems, this.now).slice(
      0,
      normalizeMaxResults(request.maxResults),
    );
    const qualityGate = buildQualityGateTrace({
      request: routedRequest,
      plan,
      results,
      restrictedStatuses,
      failures,
      codexTriggered: deepProviderNames.includes("codex_external_research"),
      codexTriggerReason: explorationReason,
    });
    return {
      mode: "research",
      queryPlan: plan,
      results,
      failures,
      restrictedStatuses,
      trace: {
        queryPlan: {
          queryCount: plan.queries.length,
          siteSearchQueryCount: plan.siteSearchQueries.length,
          targetPlatform: plan.targetPlatform,
          intent: plan.intent,
        },
        initialSearch: {
          providers: initialProviderNames,
          providerRuns: initialProviderRuns,
          resultCount: normalizedInitial.length,
          failureCount: failures.filter((failure) => failure.phase === "initial_search").length,
        },
        deepExploration: {
          triggered: explorationReason !== null,
          reason: explorationReason,
          providers: deepProviderNames,
          providerRuns: deepProviderRuns,
          resultCount: results.filter((result) => result.phase === "deep_exploration").length,
          restrictedCount: restrictedStatuses.filter(
            (status) => status.phase === "deep_exploration",
          ).length,
        },
        qualityGate,
      },
    };
  }

  private async observe(
    request: Extract<NetworkDataRequest, { mode: "observe" }>,
  ): Promise<NetworkObservationPackage> {
    const failures: NetworkProviderFailure[] = [];
    for (const provider of this.providers.filter(isLegacyResearchProvider).filter((item) => item.canObserve(request))) {
      if (provider.observe === undefined) {
        continue;
      }
      try {
        return {
          mode: "observe",
          observation: normalizeObservationResult(
            request,
            await provider.observe(request),
            provider.name,
            this.now,
          ),
          failures,
        };
      } catch (error) {
        failures.push(providerFailureFromError({
          providerName: provider.name,
          error,
          phase: "observe",
        }));
      }
    }
    return {
      mode: "observe",
      observation: null,
      failures:
        failures.length > 0
          ? failures
          : [
              {
                providerName: "provider_router",
                reason: "No available network observation provider",
                code: "provider_unavailable",
                phase: "observe",
              },
            ],
    };
  }
}

export function assertSuccessfulObservation(
  packageResult: NetworkObservationPackage,
): NonNullable<NetworkObservationPackage["observation"]> {
  if (packageResult.observation === null) {
    throw new ApplicationError(
      "AGENT_TOOL_ERROR",
      packageResult.failures[0]?.reason ?? "Network observation failed",
      502,
    );
  }
  return packageResult.observation;
}

function collectRawItems(
  rawItems: RawNetworkResearchItem[],
  restrictedStatuses: NetworkRestrictedStatus[],
  items: RawNetworkResearchItem[],
): void {
  for (const item of items) {
    if (item.restrictedStatus !== undefined) {
      restrictedStatuses.push(item.restrictedStatus);
      continue;
    }
    rawItems.push(item);
  }
}

function forceResearchPhase(
  items: RawNetworkResearchItem[],
  phase: "deep_exploration",
): RawNetworkResearchItem[] {
  return items.map((item) => {
    if (item.restrictedStatus !== undefined) {
      return {
        restrictedStatus: {
          ...item.restrictedStatus,
          phase,
        },
      };
    }
    return {
      ...item,
      phase,
    };
  });
}

function coverageGateTriggerReason(input: {
  request: Extract<NetworkDataRequest, { mode: "research" }>;
  plan: ReturnType<typeof planNetworkResearch>;
  initialResults: NetworkResearchResult[];
  failures: NetworkProviderFailure[];
  restrictedStatuses: NetworkRestrictedStatus[];
  initialProviderRuns: NetworkProviderRunTrace[];
}): string | null {
  const {
    request,
    plan,
    initialResults,
    failures,
    restrictedStatuses,
    initialProviderRuns,
  } = input;
  if (request.deepExploration === true || plan.requestedDeepExploration) {
    return "requested_deep_exploration";
  }
  if (initialProviderRuns.length === 0) {
    return plan.targetPlatform === null ? "broad_research_request" : "provider_unavailable";
  }
  if (
    failures.some((failure) => failure.code === "provider_unavailable") &&
    initialResults.length === 0
  ) {
    return "provider_unavailable";
  }
  if (restrictedStatuses.length > 0 && initialResults.length === 0) {
    return "platform_restricted";
  }
  const expected = request.maxResults ?? plan.expectedResultCount ?? 3;
  if (plan.targetPlatform === "小红书" && plan.intent === "platform_cases") {
    const completeObservedCases = initialResults.filter(
      (result) => result.resultQuality === "complete_observed_case",
    ).length;
    if (completeObservedCases < Math.min(expected, 5)) {
      return "insufficient_complete_observed_cases";
    }
    return null;
  }
  if (plan.targetPlatform === null || plan.intent === "general") {
    return initialResults.length === 0 ? "broad_research_request" : null;
  }
  if (initialResults.length < Math.min(expected, 2)) {
    return "insufficient_initial_results";
  }
  return null;
}

function buildQualityGateTrace(input: {
  request: Extract<NetworkDataRequest, { mode: "research" }>;
  plan: ReturnType<typeof planNetworkResearch>;
  results: NetworkResearchResult[];
  restrictedStatuses: NetworkRestrictedStatus[];
  failures: NetworkProviderFailure[];
  codexTriggered: boolean;
  codexTriggerReason: string | null;
}): NetworkResearchContextPackage["trace"]["qualityGate"] {
  return {
    targetResultCount: input.request.maxResults ?? input.plan.expectedResultCount ?? 3,
    completeObservedCaseCount: input.results.filter(
      (result) => result.resultQuality === "complete_observed_case",
    ).length,
    observedCaseCount: input.results.filter(
      (result) => result.resultQuality === "observed_case",
    ).length,
    candidateLeadCount: input.results.filter(
      (result) => result.resultQuality === "candidate_lead",
    ).length,
    restrictedCount: input.restrictedStatuses.length,
    providerUnavailable: input.failures.some(
      (failure) => failure.code === "provider_unavailable",
    ),
    codexTriggered: input.codexTriggered,
    codexTriggerReason: input.codexTriggerReason,
  };
}

function isSearchProvider(provider: NetworkProviderEntry): provider is NetworkSearchProvider {
  return "canSearch" in provider && typeof provider.canSearch === "function";
}

function isExplorationProvider(provider: NetworkProviderEntry): provider is NetworkExplorationProvider {
  return "canExplore" in provider && typeof provider.canExplore === "function";
}

function isLegacyResearchProvider(provider: NetworkProviderEntry): provider is NetworkProvider {
  return "canResearch" in provider && typeof provider.canResearch === "function";
}

function isCodexExternalResearchProvider(provider: NetworkProvider): boolean {
  return provider.name === "codex_external_research";
}

function normalizeMaxResults(value: number | undefined): number {
  if (value === undefined) {
    return 8;
  }
  return Math.min(Math.max(value, 1), 15);
}
