import { ApplicationError } from "../../shared/errors/application-error.js";
import type { ToolContract } from "./tool-contract.js";

export class ToolRegistry {
  private readonly tools = new Map<string, ToolContract>();

  public register(tool: ToolContract): void {
    const name = tool.name.trim();
    if (name.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", "Tool name cannot be blank", 400);
    }
    this.tools.set(name, tool);
  }

  public find(name: string): ToolContract {
    const tool = this.tools.get(name);
    if (tool === undefined) {
      throw new ApplicationError("NOT_FOUND", `Agent tool not found: ${name}`, 404);
    }
    return tool;
  }

  public list(): ToolContract[] {
    return [...this.tools.values()];
  }
}
