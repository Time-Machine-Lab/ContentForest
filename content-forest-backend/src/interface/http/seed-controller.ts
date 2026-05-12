import type {
  CreateSeedInput,
  SeedService,
  UpdateSeedBriefInput,
  UpdateSeedInput,
} from "../../modules/seed/application/seed-service.js";

export interface HttpResult<T> {
  status: number;
  body: T;
}

export class SeedController {
  private readonly seedService: SeedService;

  public constructor(seedService: SeedService) {
    this.seedService = seedService;
  }

  public async createSeed(body: CreateSeedInput): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.seedService.createSeed(body),
    };
  }

  public async listActiveSeeds(): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.listActiveSeeds(),
    };
  }

  public async listArchivedSeeds(): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.listArchivedSeeds(),
    };
  }

  public async getSeed(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.getSeed(seedId),
    };
  }

  public async generateSeedBrief(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.seedService.generateSeedBrief(seedId),
    };
  }

  public async getSeedBrief(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.getSeedBrief(seedId),
    };
  }

  public async updateSeedBrief(
    seedId: string,
    body: UpdateSeedBriefInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.updateSeedBrief(seedId, body),
    };
  }

  public async refreshSeedBrief(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.refreshSeedBrief(seedId),
    };
  }

  public async updateSeed(
    seedId: string,
    body: UpdateSeedInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.updateSeed(seedId, body),
    };
  }

  public async archiveSeed(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.archiveSeed(seedId),
    };
  }

  public async restoreSeed(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.restoreSeed(seedId),
    };
  }

  public async getRootNode(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.getRootNode(seedId),
    };
  }

  public async getGrowthEligibility(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.seedService.getGrowthEligibility(seedId),
    };
  }
}
