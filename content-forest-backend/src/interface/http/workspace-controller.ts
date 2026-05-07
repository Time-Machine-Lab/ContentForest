import type { WorkspaceService } from "../../modules/workspace/application/workspace-service.js";
import type { HttpResult } from "./seed-controller.js";

export class WorkspaceController {
  private readonly workspaceService: WorkspaceService;

  public constructor(workspaceService: WorkspaceService) {
    this.workspaceService = workspaceService;
  }

  public async getWorkspaceSnapshot(seedId: string): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.workspaceService.getWorkspaceSnapshot(seedId),
    };
  }
}
