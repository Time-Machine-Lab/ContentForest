import type {
  GeneratorService,
  ImportGeneratorInput,
  ReuploadGeneratorInput,
} from "../../modules/generator/application/generator-service.js";
import type { HttpResult } from "./seed-controller.js";

export class GeneratorController {
  private readonly generatorService: GeneratorService;

  public constructor(generatorService: GeneratorService) {
    this.generatorService = generatorService;
  }

  public async importGenerator(
    body: ImportGeneratorInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.generatorService.importGenerator(body),
    };
  }

  public async listGenerators(): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.generatorService.listGenerators(),
    };
  }

  public async listSelectableGenerators(): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.generatorService.listSelectableGenerators(),
    };
  }

  public async getGenerator(generatorId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.generatorService.getGenerator(generatorId),
    };
  }

  public async enableGenerator(
    generatorId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.generatorService.enableGenerator(generatorId),
    };
  }

  public async disableGenerator(
    generatorId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.generatorService.disableGenerator(generatorId),
    };
  }

  public async reuploadGeneratorSkill(
    generatorId: string,
    body: ReuploadGeneratorInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.generatorService.reuploadGeneratorSkill(generatorId, body),
    };
  }
}
