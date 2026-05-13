import { ApplicationError } from "../../shared/errors/application-error.js";
import { normalizeObservationResult, normalizeResearchResults } from "./normalization.js";
import { planNetworkResearch } from "./query-planner.js";
import type {
  NetworkDataPackage,
  NetworkDataRequest,
  NetworkObservationPackage,
  NetworkProvider,
  NetworkProviderFailure,
  NetworkResearchContextPackage,
} from "./types.js";

export interface NetworkProviderRouterOptions {
  providers: NetworkProvider[];
  now?: () => Date;
}

export class NetworkProviderRouter {
  private readonly providers: NetworkProvider[];
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
    const rawItems = [];
    const candidates = this.providers.filter((item) => item.canResearch(routedRequest));

    for (const provider of candidates) {
      if (provider.research === undefined) {
        continue;
      }
      try {
        rawItems.push(...await provider.research(routedRequest, plan));
      } catch (error) {
        failures.push({
          providerName: provider.name,
          reason: error instanceof Error ? error.message : "Provider research failed",
        });
      }
    }

    if (candidates.length === 0) {
      failures.push({
        providerName: "provider_router",
        reason: "No available network research provider",
      });
    }
    if (candidates.length > 0 && rawItems.length === 0 && failures.length === 0) {
      failures.push({
        providerName: "provider_router",
        reason: "Network research providers ran but returned no usable results",
      });
    }

    return {
      mode: "research",
      queryPlan: plan,
      results: normalizeResearchResults(rawItems, this.now).slice(
        0,
        normalizeMaxResults(request.maxResults),
      ),
      failures,
    };
  }

  private async observe(
    request: Extract<NetworkDataRequest, { mode: "observe" }>,
  ): Promise<NetworkObservationPackage> {
    const failures: NetworkProviderFailure[] = [];
    for (const provider of this.providers.filter((item) => item.canObserve(request))) {
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
        failures.push({
          providerName: provider.name,
          reason: error instanceof Error ? error.message : "Provider observe failed",
        });
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

function normalizeMaxResults(value: number | undefined): number {
  if (value === undefined) {
    return 8;
  }
  return Math.min(Math.max(value, 1), 12);
}
