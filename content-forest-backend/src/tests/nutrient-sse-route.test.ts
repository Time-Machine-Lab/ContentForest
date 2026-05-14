import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = fileURLToPath(new URL("..", import.meta.url));
const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));

function readSource(path: string): string {
  return readFileSync(join(sourceRoot, path), "utf8");
}

function readWorkspace(path: string): string {
  return readFileSync(join(workspaceRoot, path), "utf8");
}

describe("Nutrient research SSE route", () => {
  it("registers the documented stream route and serializes SSE events", () => {
    const main = readSource("app/main.ts");
    const api = readWorkspace("docs/api/nutrient.yaml");

    expect(api).toContain("/api/nutrient-research-sessions/{sessionId}/messages/stream");
    expect(api).toContain("/api/seeds/{seedId}/nutrient-research-sessions");
    expect(api).toContain("text/event-stream");
    expect(api).toContain("NutrientResearchStreamEvent");
    expect(api).toContain("tool_call_started");
    expect(api).toContain("cancelled");
    expect(main).toContain("messages\\/stream");
    expect(main).toContain("streamResearchMessage");
    expect(main).toContain("deleteResearchSession");
    expect(main).toContain("method === \"DELETE\"");
    expect(main).toContain("GET,POST,PATCH,DELETE,OPTIONS");
    expect(main).toContain("sendSse");
    expect(main).toContain("AbortController");
    expect(main).toContain("listResearchSessions");
    expect(main).toContain("\"content-type\": \"text/event-stream; charset=utf-8\"");
    expect(main).toContain("event: ${event.type}");
  });
});
