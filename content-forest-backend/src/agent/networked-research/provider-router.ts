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

    const initialProviders = [
      ...this.providers.filter(isSearchProvider),
      ...this.providers.filter(isLegacyResearchProvider),
    ];
    for (const provider of initialProviders) {
      if (isSearchProvider(provider)) {
        if (!provider.canSearch(routedRequest, plan)) {
          continue;
        }
        initialProviderNames.push(provider.name);
        try {
          collectRawItems(
            rawItems,
            restrictedStatuses,
            await provider.search(routedRequest, plan),
          );
        } catch (error) {
          failures.push(providerFailureFromError({
            providerName: provider.name,
            error,
            phase: "initial_search",
          }));
        }
        continue;
      }

      if (!provider.canResearch(routedRequest) || provider.research === undefined) {
        continue;
      }
      initialProviderNames.push(provider.name);
      try {
        collectRawItems(
          rawItems,
          restrictedStatuses,
          await provider.research(routedRequest, plan),
        );
      } catch (error) {
        failures.push(providerFailureFromError({
          providerName: provider.name,
          error,
          phase: "initial_search",
        }));
      }
    }

    if (initialProviderNames.length === 0) {
      failures.push({
        providerName: "provider_router",
        reason: "No available initial search provider",
        code: "provider_unavailable",
        phase: "initial_search",
      });
    }

    const normalizedInitial = normalizeResearchResults(rawItems, this.now);
    const explorationReason = explorationTriggerReason(
      routedRequest,
      plan,
      normalizedInitial,
    );
    if (explorationReason !== null) {
      const explorationProviders = this.providers.filter(isExplorationProvider);
      let explored = false;
      for (const provider of explorationProviders) {
        if (!provider.canExplore(routedRequest, plan, normalizedInitial)) {
          continue;
        }
        explored = true;
        deepProviderNames.push(provider.name);
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
        } catch (error) {
          failures.push(providerFailureFromError({
            providerName: provider.name,
            error,
            phase: "deep_exploration",
          }));
        }
      }
      if (!explored) {
        failures.push({
          providerName: "provider_router",
          reason: "No available platform browser strategy for deep exploration",
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
          resultCount: normalizedInitial.length,
          failureCount: failures.filter((failure) => failure.phase === "initial_search").length,
        },
        deepExploration: {
          triggered: explorationReason !== null,
          reason: explorationReason,
          providers: deepProviderNames,
          resultCount: results.filter((result) => result.phase === "deep_exploration").length,
          restrictedCount: restrictedStatuses.filter(
            (status) => status.phase === "deep_exploration",
          ).length,
        },
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

function explorationTriggerReason(
  request: Extract<NetworkDataRequest, { mode: "research" }>,
  plan: ReturnType<typeof planNetworkResearch>,
  initialResults: NetworkResearchResult[],
): string | null {
  if (request.deepExploration === true || plan.requestedDeepExploration) {
    return "requested_deep_exploration";
  }
  if (plan.targetPlatform === "小红书" && plan.intent === "platform_cases") {
    return "platform_strategy_required";
  }
  const expected = request.maxResults ?? plan.expectedResultCount ?? 3;
  if (initialResults.length < Math.min(expected, 2)) {
    return "insufficient_initial_results";
  }
  return null;
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

function normalizeMaxResults(value: number | undefined): number {
  if (value === undefined) {
    return 8;
  }
  return Math.min(Math.max(value, 1), 12);
}
