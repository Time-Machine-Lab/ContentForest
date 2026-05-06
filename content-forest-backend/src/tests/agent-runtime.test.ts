import { describe, expect, it } from "vitest";
import { AgentRuntime } from "../agent/runtime/agent-runtime.js";
import { FakeLlmAdapter } from "../agent/runtime/fake-llm-adapter.js";
import { SkillRegistry } from "../agent/runtime/skill-runtime.js";
import type { SkillContract } from "../agent/skills/skill-contract.js";

function createRuntime(skill: SkillContract): AgentRuntime {
  const registry = new SkillRegistry();
  registry.register(skill);
  let timeCounter = 0;

  return new AgentRuntime({
    skillRegistry: registry,
    llm: new FakeLlmAdapter("llm says ok"),
    nextTaskId: () => "agent-task_1",
    now: () => {
      timeCounter += 1;
      return new Date(`2026-01-01T00:00:${String(timeCounter).padStart(2, "0")}.000Z`);
    },
  });
}

describe("AgentRuntime", () => {
  it("runs a registered skill and returns a validated result with trace", async () => {
    const runtime = createRuntime({
      name: "growth-skill",
      description: "fake growth",
      supportedTaskTypes: ["growth"],
      async execute({ llm }) {
        const completion = await llm.complete({
          messages: [{ role: "user", content: "grow" }],
        });

        return {
          taskType: "growth",
          content: completion.content,
        };
      },
    });

    const result = await runtime.runTask({
      type: "growth",
      input: { seedId: "seed_1" },
    });

    expect(result).toMatchObject({
      ok: true,
      taskId: "agent-task_1",
      output: {
        taskType: "growth",
        content: "llm says ok",
      },
    });
    expect(result.trace.map((event) => event.type)).toEqual([
      "task_started",
      "skill_called",
      "llm_called",
      "output_validated",
      "task_completed",
    ]);
  });

  it("rejects unknown task types", async () => {
    const runtime = createRuntime({
      name: "growth-skill",
      description: "fake growth",
      supportedTaskTypes: ["growth"],
      async execute() {
        return { content: "unused" };
      },
    });

    const result = await runtime.runTask({
      type: "unknown",
      input: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("returns a failure when no skill supports the task", async () => {
    const runtime = new AgentRuntime({
      llm: new FakeLlmAdapter(),
      nextTaskId: () => "agent-task_1",
    });

    const result = await runtime.runTask({
      type: "gene_extraction",
      input: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "NOT_FOUND",
      },
    });
    expect(result.trace.map((event) => event.type)).toContain("task_failed");
  });

  it("returns a failure for empty skill output", async () => {
    const runtime = createRuntime({
      name: "growth-skill",
      description: "fake growth",
      supportedTaskTypes: ["growth"],
      async execute() {
        return {
          taskType: "growth",
          content: "   ",
        };
      },
    });

    const result = await runtime.runTask({
      type: "growth",
      input: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
      },
    });
  });

  it("wraps skill execution failures", async () => {
    const runtime = createRuntime({
      name: "growth-skill",
      description: "fake growth",
      supportedTaskTypes: ["growth"],
      async execute() {
        throw new Error("boom");
      },
    });

    const result = await runtime.runTask({
      type: "growth",
      input: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: "AGENT_SKILL_ERROR",
      },
    });
    expect(result.trace.map((event) => event.type)).toContain("skill_failed");
  });
});
