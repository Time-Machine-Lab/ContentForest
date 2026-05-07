import type {
  CreatePublicationRecordInput,
  PublicationService,
  UpdatePublicationRecordInput,
} from "../../modules/publication/application/publication-service.js";
import type { HttpResult } from "./seed-controller.js";

export class PublicationController {
  private readonly publicationService: PublicationService;

  public constructor(publicationService: PublicationService) {
    this.publicationService = publicationService;
  }

  public async createPublicationRecord(
    body: CreatePublicationRecordInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.publicationService.createPublicationRecord(body),
    };
  }

  public async editPublicationRecord(
    publicationRecordId: string,
    body: UpdatePublicationRecordInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.publicationService.editPublicationRecord(
        publicationRecordId,
        body,
      ),
    };
  }

  public async getPublicationRecord(
    publicationRecordId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.publicationService.getPublicationRecord(
        publicationRecordId,
      ),
    };
  }

  public async listPublicationRecordsByFruit(
    fruitId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.publicationService.listPublicationRecordsByFruit(fruitId),
    };
  }
}

