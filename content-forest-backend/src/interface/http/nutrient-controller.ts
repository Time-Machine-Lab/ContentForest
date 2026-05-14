import type {
  CreateNutrientCardInput,
  CreateNutrientContentInput,
  CreateNutrientLibraryInput,
  CreateNutrientResearchSessionInput,
  FindSimilarNutrientCardsInput,
  ListNutrientGapSuggestionsInput,
  ListNutrientCardsInput,
  ListNutrientContentsInput,
  ListNutrientLibrariesInput,
  ListNutrientResearchSessionsInput,
  MergeNutrientCardInput,
  NutrientResearchStreamEvent,
  NutrientService,
  SettleNutrientCardInput,
  SubmitNutrientResearchMessageInput,
  UpdateNutrientCardInput,
  UpdateNutrientContentInput,
  UpdateNutrientLibraryInput,
} from "../../modules/nutrient/application/nutrient-service.js";
import type { HttpResult } from "./seed-controller.js";

export class NutrientController {
  private readonly nutrientService: NutrientService;

  public constructor(nutrientService: NutrientService) {
    this.nutrientService = nutrientService;
  }

  public async createLibrary(
    body: CreateNutrientLibraryInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.nutrientService.createLibrary(body),
    };
  }

  public async listLibraries(
    query: ListNutrientLibrariesInput = {},
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listLibraries(query),
    };
  }

  public async getLibrary(libraryId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.getLibrary(libraryId),
    };
  }

  public async updateLibrary(
    libraryId: string,
    body: UpdateNutrientLibraryInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.updateLibrary(libraryId, body),
    };
  }

  public async archiveLibrary(libraryId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.archiveLibrary(libraryId),
    };
  }

  public async restoreLibrary(libraryId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.restoreLibrary(libraryId),
    };
  }

  public async createContent(
    libraryId: string,
    body: CreateNutrientContentInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.nutrientService.createContent(libraryId, body),
    };
  }

  public async listContents(
    libraryId: string,
    query: ListNutrientContentsInput = {},
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listContents(libraryId, query),
    };
  }

  public async getContent(contentId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.getContent(contentId),
    };
  }

  public async updateContent(
    contentId: string,
    body: UpdateNutrientContentInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.updateContent(contentId, body),
    };
  }

  public async archiveContent(contentId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.archiveContent(contentId),
    };
  }

  public async restoreContent(contentId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.restoreContent(contentId),
    };
  }

  public async listReferableContents(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listReferableContents(seedId),
    };
  }

  public async ensureDefaultSeedScopedLibrary(
    seedId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.ensureDefaultSeedScopedLibrary(seedId),
    };
  }

  public async createCard(
    seedId: string,
    body: CreateNutrientCardInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.nutrientService.createCard(seedId, body),
    };
  }

  public async listCards(
    seedId: string,
    query: ListNutrientCardsInput = {},
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listCards(seedId, query),
    };
  }

  public async listGapSuggestions(
    seedId: string,
    query: ListNutrientGapSuggestionsInput = {},
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listGapSuggestions(seedId, query),
    };
  }

  public async adoptGapSuggestion(
    suggestionId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.adoptGapSuggestion(suggestionId),
    };
  }

  public async ignoreGapSuggestion(
    suggestionId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.ignoreGapSuggestion(suggestionId),
    };
  }

  public async getCard(cardId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.getCard(cardId),
    };
  }

  public async updateCard(
    cardId: string,
    body: UpdateNutrientCardInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.updateCard(cardId, body),
    };
  }

  public async deleteDraftCard(cardId: string): Promise<HttpResult<unknown>> {
    await this.nutrientService.deleteDraftCard(cardId);
    return {
      status: 204,
      body: null,
    };
  }

  public async settleCard(
    cardId: string,
    body: SettleNutrientCardInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.settleCard(cardId, body),
    };
  }

  public async archiveCard(cardId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.archiveCard(cardId),
    };
  }

  public async setDefaultForGrowth(cardId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.setDefaultForGrowth(cardId),
    };
  }

  public async clearDefaultForGrowth(cardId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.clearDefaultForGrowth(cardId),
    };
  }

  public async getCardUsageSummary(
    cardId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.getCardUsageSummary(cardId),
    };
  }

  public async listFreshnessReminders(
    seedId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listFreshnessReminders(seedId),
    };
  }

  public async findSimilarCards(
    seedId: string,
    body: FindSimilarNutrientCardsInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.findSimilarCards(seedId, body),
    };
  }

  public async mergeIntoCard(
    cardId: string,
    body: MergeNutrientCardInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.mergeIntoCard(cardId, body),
    };
  }

  public async createResearchSession(
    body: CreateNutrientResearchSessionInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.nutrientService.createResearchSession(body),
    };
  }

  public async listResearchSessions(
    query: ListNutrientResearchSessionsInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listResearchSessions(query),
    };
  }

  public async getResearchSession(
    sessionId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.getResearchSession(sessionId),
    };
  }

  public async deleteResearchSession(
    sessionId: string,
  ): Promise<HttpResult<unknown>> {
    await this.nutrientService.deleteResearchSession(sessionId);
    return {
      status: 204,
      body: null,
    };
  }

  public async listResearchMessages(
    sessionId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listResearchMessages(sessionId),
    };
  }

  public async submitResearchMessage(
    sessionId: string,
    body: SubmitNutrientResearchMessageInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.nutrientService.submitResearchMessage(sessionId, body),
    };
  }

  public streamResearchMessage(
    sessionId: string,
    body: SubmitNutrientResearchMessageInput,
    options: { signal?: AbortSignal } = {},
  ): AsyncGenerator<NutrientResearchStreamEvent> {
    return this.nutrientService.streamResearchMessage(sessionId, body, options);
  }

  public async listDepositableBlocks(
    sessionId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.nutrientService.listDepositableBlocks(sessionId),
    };
  }
}
