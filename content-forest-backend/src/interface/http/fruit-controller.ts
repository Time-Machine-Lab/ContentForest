import type {
  FruitService,
  UpdateFruitContentInput,
} from "../../modules/fruit/application/fruit-service.js";
import type { HttpResult } from "./seed-controller.js";

export class FruitController {
  private readonly fruitService: FruitService;

  public constructor(fruitService: FruitService) {
    this.fruitService = fruitService;
  }

  public async getFruit(fruitId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.fruitService.getFruit(fruitId),
    };
  }

  public async updateFruitContent(
    fruitId: string,
    body: UpdateFruitContentInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.fruitService.updateFruitContent(fruitId, body),
    };
  }

  public async selectFruit(fruitId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.fruitService.selectFruit(fruitId),
    };
  }

  public async eliminateFruit(fruitId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.fruitService.eliminateFruit(fruitId),
    };
  }

  public async restoreFruitToCandidate(
    fruitId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.fruitService.restoreFruitToCandidate(fruitId),
    };
  }
}
