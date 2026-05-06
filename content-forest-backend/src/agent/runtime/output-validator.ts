import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskContext, AgentTaskOutput } from "./agent-task.js";

export class OutputValidator {
  public validate(output: AgentTaskOutput, context: AgentTaskContext): AgentTaskOutput {
    if (output === null || output === undefined) {
      throw new ApplicationError("VALIDATION_ERROR", "Agent output cannot be empty", 500);
    }

    if (output.taskType !== undefined && output.taskType !== context.taskType) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Agent output task type does not match the task context",
        500,
      );
    }

    if (!this.hasUsableContent(output.content)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Agent output content cannot be empty",
        500,
      );
    }

    return output;
  }

  private hasUsableContent(content: unknown): boolean {
    if (content === null || content === undefined) {
      return false;
    }
    if (typeof content === "string") {
      return content.trim().length > 0;
    }
    if (Array.isArray(content)) {
      return content.length > 0;
    }
    if (typeof content === "object") {
      return Object.keys(content).length > 0;
    }
    return true;
  }
}
