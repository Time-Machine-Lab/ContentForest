import type {
  CreateNutrientContentInput,
  CreateNutrientLibraryInput,
  ListNutrientContentsInput,
  ListNutrientLibrariesInput,
  NutrientService,
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
}
