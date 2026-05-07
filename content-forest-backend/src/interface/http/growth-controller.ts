import type {
  GrowthService,
  StartGrowthTaskInput,
} from "../../modules/growth/application/growth-service.js";
import type { GrowthSourceNodeRef } from "../../modules/growth/domain/growth-types.js";
import type { HttpResult } from "./seed-controller.js";

export class GrowthController {
  private readonly growthService: GrowthService;

  public constructor(growthService: GrowthService) {
    this.growthService = growthService;
  }

  public async startGrowthTask(
    body: StartGrowthTaskInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.growthService.startGrowthTask(body),
    };
  }

  public async retryLatestFailedTask(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.growthService.retryLatestFailedTask(sourceNodeRef),
    };
  }

  public async getGrowthTask(taskId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.growthService.getGrowthTask(taskId),
    };
  }

  public async getSourceStatus(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.growthService.getSourceStatus(sourceNodeRef),
    };
  }

  public async getLatestFailedInput(
    sourceNodeRef: GrowthSourceNodeRef,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.growthService.getLatestFailedInput(sourceNodeRef),
    };
  }
}
