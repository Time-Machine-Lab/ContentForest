import { readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FileAgentExchangeLogSink,
  type AgentExchangeLogDocument,
  type AgentExchangeLogSink,
} from "../agent/runtime/agent-exchange-log.js";
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

function createRuntimeWithLog(input: {
  skill: SkillContract;
  sink: AgentExchangeLogSink;
  llm?: FakeLlmAdapter;
}): AgentRuntime {
  const registry = new SkillRegistry();
  registry.register(input.skill);
  let timeCounter = 0;

  return new AgentRuntime({
    skillRegistry: registry,
    llm: input.llm ?? new FakeLlmAdapter("llm says ok"),
    exchangeLogSink: input.sink,
    exchangeLogMaxContentChars: 120,
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

  it("writes exchange logs for successful tasks when enabled", async () => {
    const logDir = join(process.cwd(), "tmp-agent-runtime-log-success");
    await rm(logDir, { recursive: true, force: true });
    const runtime = createRuntimeWithLog({
      sink: new FileAgentExchangeLogSink(logDir),
      skill: {
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
      },
    });

    const result = await runtime.runTask({
      type: "growth",
      input: { seedId: "seed_1" },
    });

    expect(result.ok).toBe(true);
    const document = await readSingleLog(logDir);
    expect(document.result.ok).toBe(true);
    expect(document.timeline.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "task_started",
        "llm_input",
        "llm_output",
        "task_finished",
      ]),
    );
    expect(document.timeline.map((event) => event.type)).not.toContain(
      "skill_called",
    );
    await rm(logDir, { recursive: true, force: true });
  });

  it("splits LLM think blocks into a separate simple timeline item", async () => {
    const logDir = join(process.cwd(), "tmp-agent-runtime-log-think");
    await rm(logDir, { recursive: true, force: true });
    const runtime = createRuntimeWithLog({
      sink: new FileAgentExchangeLogSink(logDir),
      llm: new FakeLlmAdapter("<think>reasoning text</think>final answer"),
      skill: {
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
      },
    });

    await runtime.runTask({
      type: "growth",
      input: {},
    });

    const document = await readSingleLog(logDir);
    expect(document.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "llm_think",
          content: "reasoning text",
        }),
        expect.objectContaining({
          type: "llm_output",
          content: { content: "final answer" },
        }),
      ]),
    );
    await rm(logDir, { recursive: true, force: true });
  });

  it("writes exchange logs for failed tasks when enabled", async () => {
    const logDir = join(process.cwd(), "tmp-agent-runtime-log-failure");
    await rm(logDir, { recursive: true, force: true });
    const runtime = createRuntimeWithLog({
      sink: new FileAgentExchangeLogSink(logDir),
      skill: {
        name: "growth-skill",
        description: "fake growth",
        supportedTaskTypes: ["growth"],
        async execute() {
          throw new Error("D:\\secret\\boom sk-cp-secret-secret-secret-secret");
        },
      },
    });

    const result = await runtime.runTask({
      type: "growth",
      input: {},
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "AGENT_SKILL_ERROR" },
    });
    const text = await readSingleLogText(logDir);
    expect(text).toContain("\"ok\": false");
    expect(text).toContain("skill");
    expect(text).not.toContain("D:\\secret");
    expect(text).not.toContain("sk-cp-secret");
    await rm(logDir, { recursive: true, force: true });
  });

  it("keeps task results when exchange log writing fails", async () => {
    const runtime = createRuntimeWithLog({
      sink: {
        enabled: true,
        async write() {
          throw new Error("disk full");
        },
      },
      skill: {
        name: "growth-skill",
        description: "fake growth",
        supportedTaskTypes: ["growth"],
        async execute() {
          return {
            taskType: "growth",
            content: "ok",
          };
        },
      },
    });

    const result = await runtime.runTask({
      type: "growth",
      input: {},
    });

    expect(result.ok).toBe(true);
    expect(result.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "skill_progress",
          metadata: expect.objectContaining({
            stage: "agent_exchange_log_failed",
          }),
        }),
      ]),
    );
  });
});

async function readSingleLog(logDir: string): Promise<AgentExchangeLogDocument> {
  return JSON.parse(await readSingleLogText(logDir)) as AgentExchangeLogDocument;
}

async function readSingleLogText(logDir: string): Promise<string> {
  const files = await readdir(logDir);
  expect(files).toHaveLength(1);
  return await readFile(join(logDir, files[0] ?? ""), "utf8");
}
