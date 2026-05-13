import type {
  NetworkObserveRequest,
  NetworkProvider,
  NetworkResearchRequest,
} from "../types.js";

export class WebPageFetchPlaceholderProvider implements NetworkProvider {
  public readonly name = "web_page_fetch_placeholder";

  public canResearch(_request: NetworkResearchRequest): boolean {
    return false;
  }

  public canObserve(_request: NetworkObserveRequest): boolean {
    return false;
  }
}

export class PlatformDataPlaceholderProvider implements NetworkProvider {
  public readonly name = "platform_data_placeholder";

  public canResearch(_request: NetworkResearchRequest): boolean {
    return false;
  }

  public canObserve(_request: NetworkObserveRequest): boolean {
    return false;
  }
}
