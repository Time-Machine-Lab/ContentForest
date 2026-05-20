import { describe, expect, it } from "vitest";
import type { AgentTaskContext } from "../agent/runtime/agent-task.js";
import { AgentTrace } from "../agent/runtime/agent-trace.js";
import type { ToolContract } from "../agent/runtime/tool-contract.js";
import { ToolRegistry } from "../agent/runtime/tool-registry.js";
import { ToolRuntime } from "../agent/runtime/tool-runtime.js";
import { ApplicationError } from "../shared/errors/application-error.js";

const context: AgentTaskContext = {
  taskId: "agent-task_1",
  taskType: "growth",
  input: {},
  metadata: {},
  startedAt: "2026-01-01T00:00:00.000Z",
};

describe("ToolRegistry and ToolRuntime", () => {
  it("registers, finds and lists tools", () => {
    const registry = new ToolRegistry();
    const tool = createTool();

    registry.register(tool);

    expect(registry.find("read_seed")).toBe(tool);
    expect(registry.list()).toEqual([tool]);
  });

  it("throws a clear error for unknown tools", () => {
    const registry = new ToolRegistry();

    expect(() => registry.find("missing")).toThrow(ApplicationError);
  });

  it("calls a registered read-only tool and records trace", async () => {
    const registry = new ToolRegistry();
    registry.register(createTool());
    const trace = new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z"));
    const runtime = new ToolRuntime(registry, context, trace);

    await expect(
      runtime.callTool("read_seed", { seedId: "seed_1" }),
    ).resolves.toEqual({
      content: {
        seedId: "seed_1",
      },
    });
    expect(trace.list().map((event) => event.type)).toEqual([
      "tool_called",
      "tool_completed",
    ]);
  });

  it("registers candidate media artifacts without returning binary content to the skill", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "make_cover",
      description: "make cover",
      readOnly: true,
      async execute() {
        return {
          content: { ok: true },
          candidateMediaArtifacts: [
            {
              id: "cover_1",
              mimeType: "image/png",
              fileName: "D:\\secret\\cover.png",
              contentBase64:
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
              displayRole: "primary",
              required: true,
            },
          ],
        };
      },
    });
    const trace = new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z"));
    const runtime = new ToolRuntime(registry, context, trace);

    const output = await runtime.callTool("make_cover", {});

    expect(output).toMatchObject({
      content: { ok: true },
      metadata: {
        candidateMediaArtifacts: [
          expect.objectContaining({
            id: "cover_1",
            sourceToolName: "make_cover",
            mediaType: "image",
            mimeType: "image/png",
            fileName: "cover.png",
            displayRole: "primary",
            required: true,
          }),
        ],
      },
    });
    expect(JSON.stringify(output)).not.toContain("iVBOR");
    const artifacts = runtime.listCandidateMediaArtifacts();
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]?.content?.byteLength).toBeGreaterThan(0);
  });

  it("wraps tool execution failures and records trace", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "broken_tool",
      description: "broken",
      readOnly: true,
      async execute() {
        throw new Error("nope");
      },
    });
    const trace = new AgentTrace(() => new Date("2026-01-01T00:00:00.000Z"));
    const runtime = new ToolRuntime(registry, context, trace);

    await expect(runtime.callTool("broken_tool", {})).rejects.toMatchObject({
      code: "AGENT_TOOL_ERROR",
    });
    expect(trace.list().map((event) => event.type)).toEqual([
      "tool_called",
      "tool_failed",
    ]);
  });
});

function createTool(): ToolContract {
  return {
    name: "read_seed",
    description: "read seed",
    readOnly: true,
    async execute(input) {
      return {
        content: {
          seedId: input.seedId,
        },
      };
    },
  };
}
