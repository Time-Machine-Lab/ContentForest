import type {
  ConfirmGeneSuggestionInput,
  CreateFruitEvidenceReminderInput,
  EditGeneInsightInput,
  EditGeneSuggestionInput,
  GeneService,
  RecordGeneUsageInput,
  StartGeneExtractionInput,
} from "../../modules/gene/application/gene-service.js";
import type { HttpResult } from "./seed-controller.js";

export class GeneController {
  private readonly geneService: GeneService;

  public constructor(geneService: GeneService) {
    this.geneService = geneService;
  }

  public async prepareSeedGeneLibrary(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.prepareSeedGeneLibrary(seedId),
    };
  }

  public async getSeedGeneLibrary(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.getSeedGeneLibrary(seedId),
    };
  }

  public async getGeneLibraryEvolutionSummary(
    seedId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.getGeneLibraryEvolutionSummary(seedId),
    };
  }

  public async recordGeneUsage(
    seedId: string,
    body: RecordGeneUsageInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.geneService.recordGeneUsage(seedId, body),
    };
  }

  public async createReminderFromFruitEvidence(
    seedId: string,
    body: CreateFruitEvidenceReminderInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.geneService.createReminderFromFruitEvidence(seedId, body),
    };
  }

  public async listPendingReminders(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.listPendingReminders(seedId),
    };
  }

  public async ignoreReminder(reminderId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.ignoreReminder(reminderId),
    };
  }

  public async startExtractionTask(
    seedId: string,
    body: StartGeneExtractionInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.geneService.startExtractionTask(seedId, body),
    };
  }

  public async listPendingSuggestions(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.listPendingSuggestions(seedId),
    };
  }

  public async getSuggestion(suggestionId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.getSuggestion(suggestionId),
    };
  }

  public async editSuggestion(
    suggestionId: string,
    body: EditGeneSuggestionInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.editSuggestion(suggestionId, body),
    };
  }

  public async dismissSuggestion(suggestionId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.dismissSuggestion(suggestionId),
    };
  }

  public async confirmSuggestion(
    suggestionId: string,
    body: ConfirmGeneSuggestionInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.geneService.confirmSuggestion(suggestionId, body),
    };
  }

  public async listInsights(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.listInsights(seedId),
    };
  }

  public async listReferableInsights(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.listReferableInsights(seedId),
    };
  }

  public async getInsight(insightId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.getInsight(insightId),
    };
  }

  public async editInsight(
    insightId: string,
    body: EditGeneInsightInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.editInsight(insightId, body),
    };
  }

  public async archiveInsight(insightId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.geneService.archiveInsight(insightId),
    };
  }
}
