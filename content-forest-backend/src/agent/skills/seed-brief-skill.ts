import { ApplicationError } from "../../shared/errors/application-error.js";
import type { AgentTaskOutput, AgentTaskType } from "../runtime/agent-task.js";
import type { SkillContract, SkillExecutionInput } from "./skill-contract.js";

export class SeedBriefSkill implements SkillContract {
  public readonly name = "seed_brief";
  public readonly description = "Generate a reusable creative brief for a seed.";
  public readonly supportedTaskTypes: AgentTaskType[] = ["seed_brief"];

  public async execute(input: SkillExecutionInput): Promise<AgentTaskOutput> {
    const seedTitle = this.requireString(input.context.input.seedTitle, "seedTitle");
    const seedMarkdown = this.requireString(
      input.context.input.seedMarkdown,
      "seedMarkdown",
    );
    input.trace.record("skill_progress", "Seed brief generation started", {
      seedId: input.context.input.seedId,
    });

    const result = await input.llm.complete({
      messages: [
        {
          role: "system",
          content:
            "你是内容森林的种子主简报生成器。请基于用户的种子原文生成一份通用创作地图，适配产品、项目、知识、内容账号、搞笑、美食、教学等不同类型种子。不要把它写成商业定位报告，不要改写种子事实。",
        },
        {
          role: "user",
          content: [
            `种子标题：${seedTitle}`,
            "种子正文：",
            seedMarkdown,
            "",
            "请输出 Markdown，结构包含：种子理解、内容对象、受众假设、场景与动机、候选探索方向、证据缺口、风险边界、可补充素材建议。",
          ].join("\n"),
        },
      ],
    });
    const markdown = result.content.trim();
    if (markdown.length === 0) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "种子主简报生成结果为空",
        500,
      );
    }

    return {
      taskType: "seed_brief",
      content: { markdown },
      metadata: {
        seedId: input.context.input.seedId,
      },
    };
  }

  private requireString(value: unknown, field: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        `Seed brief task requires ${field}`,
        400,
      );
    }
    return value;
  }
}
