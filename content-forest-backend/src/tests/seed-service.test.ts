import { describe, expect, it } from "vitest";
import type { AgentPort } from "../agent/ports/agent-port.js";
import type { AgentTask, AgentTaskResult } from "../agent/runtime/agent-task.js";
import { InMemorySeedMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-seed-markdown-content-access-adapter.js";
import { SeedService } from "../modules/seed/application/seed-service.js";
import { SEED_ARCHIVE_STATES } from "../modules/seed/domain/seed-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemorySeedStorageAdapter } from "../storage/adapters/in-memory-seed-storage-adapter.js";

function seedBriefAgent(markdowns: string[], capturedTasks: AgentTask[] = []): AgentPort {
  let index = 0;
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      capturedTasks.push(task);
      const markdown = markdowns[index] ?? markdowns[markdowns.length - 1] ?? "# Brief";
      index += 1;
      return {
        ok: true,
        taskId: task.taskId ?? `agent-task_${index}`,
        output: {
          taskType: "seed_brief",
          content: { markdown },
        },
        trace: [],
      };
    },
  };
}

function failingSeedBriefAgent(): AgentPort {
  return {
    async runTask(task: AgentTask): Promise<AgentTaskResult> {
      return {
        ok: false,
        taskId: task.taskId ?? "agent-task_failed",
        error: {
          code: "AGENT_SKILL_ERROR",
          message: "brief failed",
        },
        trace: [],
      };
    },
  };
}

function createSeedService(agentPort?: AgentPort): SeedService {
  let idCounter = 0;
  let timeCounter = 0;
  const idGenerator: IdGenerator = {
    nextId(prefix: string): string {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
  };

  return new SeedService({
    storage: new InMemorySeedStorageAdapter(),
    contentAccess: new InMemorySeedMarkdownContentAccessAdapter(),
    agentPort,
    idGenerator,
    now: () => {
      timeCounter += 1;
      return new Date(`2026-01-01T00:00:${String(timeCounter).padStart(2, "0")}.000Z`);
    },
  });
}

describe("SeedService", () => {
  it("creates a complete active seed with markdown content and root node facts", async () => {
    const service = createSeedService();

    const seed = await service.createSeed({
      title: "内容森林",
      markdown: "# 灵感种子",
    });

    expect(seed).toMatchObject({
      id: "seed_1",
      title: "内容森林",
      archiveState: SEED_ARCHIVE_STATES.active,
      contentLocation: "seeds/seed_1.md",
      rootNodeId: "seed-node_seed_1",
      archivedAt: null,
      markdown: "# 灵感种子",
    });
    await expect(service.listActiveSeeds()).resolves.toHaveLength(1);
  });

  it("rejects empty title or markdown and does not create drafts", async () => {
    const service = createSeedService();

    await expect(
      service.createSeed({ title: " ", markdown: "# 正文" }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.createSeed({ title: "标题", markdown: " " }),
    ).rejects.toBeInstanceOf(ApplicationError);

    await expect(service.listActiveSeeds()).resolves.toHaveLength(0);
    await expect(service.listArchivedSeeds()).resolves.toHaveLength(0);
  });

  it("separates active and archived seed lists", async () => {
    const service = createSeedService();
    const active = await service.createSeed({ title: "活跃", markdown: "正文" });
    const archived = await service.createSeed({ title: "归档", markdown: "正文" });

    await service.archiveSeed(archived.id);

    await expect(service.listActiveSeeds()).resolves.toMatchObject([
      { id: active.id, archiveState: SEED_ARCHIVE_STATES.active },
    ]);
    await expect(service.listArchivedSeeds()).resolves.toMatchObject([
      { id: archived.id, archiveState: SEED_ARCHIVE_STATES.archived },
    ]);
  });

  it("edits active and archived seeds without changing identity or root relationship", async () => {
    const service = createSeedService();
    const seed = await service.createSeed({ title: "初始", markdown: "旧正文" });

    const editedActive = await service.updateSeed(seed.id, {
      title: "活跃编辑",
      markdown: "新正文",
    });
    await service.archiveSeed(seed.id);
    const editedArchived = await service.updateSeed(seed.id, {
      title: "归档编辑",
      markdown: "归档正文",
    });

    expect(editedActive).toMatchObject({
      id: seed.id,
      rootNodeId: seed.rootNodeId,
      title: "活跃编辑",
      markdown: "新正文",
    });
    expect(editedArchived).toMatchObject({
      id: seed.id,
      rootNodeId: seed.rootNodeId,
      archiveState: SEED_ARCHIVE_STATES.archived,
      title: "归档编辑",
      markdown: "归档正文",
    });
  });

  it("rejects empty values while editing", async () => {
    const service = createSeedService();
    const seed = await service.createSeed({ title: "标题", markdown: "正文" });

    await expect(service.updateSeed(seed.id, { title: "" })).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await expect(
      service.updateSeed(seed.id, { markdown: "   " }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("archives and restores without exposing a delete capability", async () => {
    const service = createSeedService();
    const seed = await service.createSeed({ title: "标题", markdown: "正文" });

    const archived = await service.archiveSeed(seed.id);
    const restored = await service.restoreSeed(seed.id);

    expect(archived.archiveState).toBe(SEED_ARCHIVE_STATES.archived);
    expect(archived.markdown).toBe("正文");
    expect(restored.archiveState).toBe(SEED_ARCHIVE_STATES.active);
    expect("deleteSeed" in service).toBe(false);
  });

  it("blocks growth for archived seeds and restores eligibility after restore", async () => {
    const service = createSeedService();
    const seed = await service.createSeed({ title: "标题", markdown: "正文" });

    await expect(service.getGrowthEligibility(seed.id)).resolves.toMatchObject({
      canGrow: true,
      workspaceReadOnly: false,
    });
    await service.archiveSeed(seed.id);
    await expect(service.getRootNode(seed.id)).resolves.toMatchObject({
      nodeId: seed.rootNodeId,
      nodeType: "seed",
      workspaceReadOnly: true,
    });
    await expect(service.getGrowthEligibility(seed.id)).resolves.toMatchObject({
      canGrow: false,
      workspaceReadOnly: true,
    });
    await expect(service.assertCanGrow(seed.id)).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await service.restoreSeed(seed.id);

    await expect(service.getGrowthEligibility(seed.id)).resolves.toMatchObject({
      canGrow: true,
      workspaceReadOnly: false,
    });
  });

  it("generates a seed brief through Agent without changing the seed markdown", async () => {
    const capturedTasks: AgentTask[] = [];
    const service = createSeedService(
      seedBriefAgent(["# Main Brief\n\n- Exploration map"], capturedTasks),
    );
    const seed = await service.createSeed({
      title: "Idea",
      markdown: "# Seed markdown",
    });

    const brief = await service.generateSeedBrief(seed.id);
    const seedAfterBrief = await service.getSeed(seed.id);

    expect(brief).toMatchObject({
      seedId: seed.id,
      hasBrief: true,
      contentLocation: "seeds/seed_1.brief.md",
      markdown: "# Main Brief\n\n- Exploration map",
    });
    expect(seedAfterBrief.markdown).toBe("# Seed markdown");
    expect(capturedTasks[0]).toMatchObject({
      type: "seed_brief",
      input: {
        seedId: seed.id,
        seedTitle: "Idea",
        seedMarkdown: "# Seed markdown",
      },
    });
  });

  it("views and edits the current seed brief", async () => {
    const service = createSeedService(seedBriefAgent(["# Generated Brief"]));
    const seed = await service.createSeed({ title: "Idea", markdown: "Seed" });
    await service.generateSeedBrief(seed.id);

    await expect(service.getSeedBrief(seed.id)).resolves.toMatchObject({
      markdown: "# Generated Brief",
    });

    const edited = await service.updateSeedBrief(seed.id, {
      markdown: "# Edited Brief",
    });

    expect(edited).toMatchObject({
      seedId: seed.id,
      markdown: "# Edited Brief",
    });
    await expect(service.getSeedBrief(seed.id)).resolves.toMatchObject({
      markdown: "# Edited Brief",
    });
  });

  it("refreshes by overwriting the current seed brief", async () => {
    const service = createSeedService(seedBriefAgent(["# First Brief", "# Refreshed Brief"]));
    const seed = await service.createSeed({ title: "Idea", markdown: "Seed" });
    const first = await service.generateSeedBrief(seed.id);

    const refreshed = await service.refreshSeedBrief(seed.id);

    expect(refreshed.id).toBe(first.id);
    expect(refreshed.contentLocation).toBe(first.contentLocation);
    expect(refreshed.markdown).toBe("# Refreshed Brief");
    await expect(service.getSeedBrief(seed.id)).resolves.toMatchObject({
      id: first.id,
      markdown: "# Refreshed Brief",
    });
  });

  it("keeps the old seed brief when refresh generation fails", async () => {
    const service = createSeedService(seedBriefAgent(["# Stable Brief"]));
    const seed = await service.createSeed({ title: "Idea", markdown: "Seed" });
    await service.generateSeedBrief(seed.id);
    const failingService = new SeedService({
      storage: (service as unknown as { storage: InMemorySeedStorageAdapter }).storage,
      contentAccess: (service as unknown as {
        contentAccess: InMemorySeedMarkdownContentAccessAdapter;
      }).contentAccess,
      agentPort: failingSeedBriefAgent(),
      idGenerator: {
        nextId(prefix: string): string {
          return `${prefix}_unused`;
        },
      },
      now: () => new Date("2026-01-01T00:01:00.000Z"),
    });

    await expect(failingService.refreshSeedBrief(seed.id)).rejects.toMatchObject({
      code: "AGENT_TASK_FAILED",
    });
    await expect(service.getSeedBrief(seed.id)).resolves.toMatchObject({
      markdown: "# Stable Brief",
    });
  });

  it("does not create a fake brief when generation fails", async () => {
    const service = createSeedService(failingSeedBriefAgent());
    const seed = await service.createSeed({ title: "Idea", markdown: "Seed" });

    await expect(service.generateSeedBrief(seed.id)).rejects.toMatchObject({
      code: "AGENT_TASK_FAILED",
    });
    await expect(service.getSeedBrief(seed.id)).resolves.toBeNull();
    await expect(service.assertCanGrow(seed.id)).resolves.toBeUndefined();
  });

  it("allows archived seeds to maintain briefs while keeping growth blocked", async () => {
    const service = createSeedService(seedBriefAgent(["# Archived Brief"]));
    const seed = await service.createSeed({ title: "Idea", markdown: "Seed" });
    await service.archiveSeed(seed.id);

    const brief = await service.generateSeedBrief(seed.id);

    expect(brief.markdown).toBe("# Archived Brief");
    await expect(service.getSeed(seed.id)).resolves.toMatchObject({
      archiveState: SEED_ARCHIVE_STATES.archived,
    });
    await expect(service.assertCanGrow(seed.id)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
