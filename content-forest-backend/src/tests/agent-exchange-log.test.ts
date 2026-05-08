import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AgentExchangeLogRecorder,
  FileAgentExchangeLogSink,
  sanitizeForExchangeLog,
} from "../agent/runtime/agent-exchange-log.js";

const tempRoots: string[] = [];

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "content-forest-agent-log-"));
  tempRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("Agent exchange log writer", () => {
  it("writes task-level JSON logs with timestamp names and collision suffixes", async () => {
    const root = await createTempRoot();
    const sink = new FileAgentExchangeLogSink(root);
    const startedAt = "2026-01-01T00:00:00.000Z";
    await writeFile(join(root, "20260101-080000.json"), "occupied", "utf8");

    const filePath = await sink.write({
      task: {
        taskId: "agent-task_1",
        taskType: "growth",
        startedAt,
        completedAt: startedAt,
      },
      result: {
        ok: true,
        output: { content: "ok" },
      },
      timeline: [
        {
          at: startedAt,
          type: "task_started",
          name: "growth",
          content: { seedId: "seed_1" },
        },
      ],
    });

    expect(filePath.endsWith("20260101-080000-2.json")).toBe(true);
    const files = await readdir(root);
    expect(files).toEqual(["20260101-080000-2.json", "20260101-080000.json"]);
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as {
      task: { taskId: string };
      timeline: unknown[];
    };
    expect(parsed.task.taskId).toBe("agent-task_1");
    expect(parsed.timeline).toHaveLength(1);
  });

  it("records and sanitizes event content before flushing", async () => {
    const root = await createTempRoot();
    let timeCounter = 0;
    const recorder = new AgentExchangeLogRecorder({
      sink: new FileAgentExchangeLogSink(root),
      maxContentChars: 12,
      now: () => {
        timeCounter += 1;
        return new Date(`2026-01-01T00:00:0${timeCounter}.000Z`);
      },
    });

    recorder.startTask({
      taskId: "agent-task_1",
      taskType: "growth",
      startedAt: "2026-01-01T00:00:00.000Z",
      task: {
        type: "growth",
        input: {
          apiKey: "sk-cp-secret-secret-secret-secret",
          path: "D:\\Code\\Project\\secret.md",
          text: "abcdefghijklmnopqrstuvwxyz",
        },
      },
    });
    const filePath = await recorder.flush({
      ok: true,
      output: { content: "done" },
    });

    expect(filePath).not.toBeNull();
    const content = await readFile(filePath ?? "", "utf8");
    expect(content).not.toContain("sk-cp-secret");
    expect(content).not.toContain("D:\\Code");
    expect(content).toContain("[redacted-secret]");
    expect(content).toContain("[redacted-path]");
    expect(content).toContain("\"truncated\": true");
  });
});

describe("sanitizeForExchangeLog", () => {
  it("redacts secrets, authorization headers, paths and long content", () => {
    const sanitized = sanitizeForExchangeLog(
      {
        authorization: "Bearer verysecretverysecretverysecret",
        message:
          "key sk-cp-secret-secret-secret-secret at /Users/me/private/file.md abcdefghijklmnopqrstuvwxyz",
      },
      40,
    );
    const text = JSON.stringify(sanitized);

    expect(text).toContain("[redacted-secret]");
    expect(text).toContain("[redacted-path]");
    expect(text).toContain("truncated");
    expect(text).not.toContain("sk-cp-secret");
    expect(text).not.toContain("/Users/me");
  });
});
