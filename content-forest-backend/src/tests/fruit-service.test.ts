import { describe, expect, it } from "vitest";
import { InMemoryFruitMarkdownContentAccessAdapter } from "../content-access/adapters/in-memory-fruit-markdown-content-access-adapter.js";
import { FruitController } from "../interface/http/fruit-controller.js";
import { FruitService } from "../modules/fruit/application/fruit-service.js";
import { FRUIT_SELECTION_STATES } from "../modules/fruit/domain/fruit-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryFruitStorageAdapter } from "../storage/adapters/in-memory-fruit-storage-adapter.js";
import type {
  FruitRecord,
  FruitStoragePort,
} from "../storage/ports/fruit-storage-port.js";

function createFruitService(): FruitService {
  let idCounter = 0;
  let timeCounter = 0;
  const idGenerator: IdGenerator = {
    nextId(prefix: string): string {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
  };

  return new FruitService({
    storage: new InMemoryFruitStorageAdapter(),
    contentAccess: new InMemoryFruitMarkdownContentAccessAdapter(),
    idGenerator,
    now: () => {
      timeCounter += 1;
      return new Date(`2026-01-01T00:00:${String(timeCounter).padStart(2, "0")}.000Z`);
    },
  });
}

describe("FruitService", () => {
  it("creates a candidate fruit from an internal candidate with markdown and parent facts", async () => {
    const service = createFruitService();

    const fruit = await service.createFruitFromCandidate({
      markdown: "# 果实正文",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      summary: "传播角度",
      geneTags: ["情绪价值", "短标题", "情绪价值", ""],
    });

    expect(fruit).toMatchObject({
      id: "fruit_1",
      selectionState: FRUIT_SELECTION_STATES.candidate,
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      contentLocation: "fruits/fruit_1.md",
      summary: "传播角度",
      geneTags: ["情绪价值", "短标题"],
      markdown: "# 果实正文",
    });
  });

  it("rejects empty markdown and missing parent node while creating", async () => {
    const service = createFruitService();

    await expect(
      service.createFruitFromCandidate({
        markdown: " ",
        parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      }),
    ).rejects.toBeInstanceOf(ApplicationError);

    await expect(
      service.createFruitFromCandidate({
        markdown: "# 正文",
        parentNodeRef: { nodeType: "seed", nodeId: "" },
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("reads fruit details by combining system facts and markdown content", async () => {
    const service = createFruitService();
    const fruit = await service.createFruitFromCandidate({
      markdown: "# 初代果实",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });

    const detail = await service.getFruit(fruit.id);

    expect(detail).toMatchObject({
      id: fruit.id,
      summary: "",
      geneTags: [],
      markdown: "# 初代果实",
    });
  });

  it("edits markdown without changing identity, parent relationship, or selection state", async () => {
    const service = createFruitService();
    const fruit = await service.createFruitFromCandidate({
      markdown: "旧正文",
      parentNodeRef: { nodeType: "fruit", nodeId: "fruit_parent" },
    });

    const edited = await service.updateFruitContent(fruit.id, {
      markdown: "新正文",
    });

    expect(edited).toMatchObject({
      id: fruit.id,
      parentNodeRef: fruit.parentNodeRef,
      selectionState: FRUIT_SELECTION_STATES.candidate,
      markdown: "新正文",
    });
  });

  it("rejects empty markdown edits and keeps the original content", async () => {
    const service = createFruitService();
    const fruit = await service.createFruitFromCandidate({
      markdown: "原正文",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });

    await expect(
      service.updateFruitContent(fruit.id, { markdown: "   " }),
    ).rejects.toBeInstanceOf(ApplicationError);

    await expect(service.getFruit(fruit.id)).resolves.toMatchObject({
      markdown: "原正文",
    });
  });

  it("allows eliminated fruits to remain editable", async () => {
    const service = createFruitService();
    const fruit = await service.createFruitFromCandidate({
      markdown: "可淘汰内容",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });

    await service.eliminateFruit(fruit.id);
    const edited = await service.updateFruitContent(fruit.id, {
      markdown: "淘汰后仍可编辑",
    });

    expect(edited).toMatchObject({
      selectionState: FRUIT_SELECTION_STATES.eliminated,
      markdown: "淘汰后仍可编辑",
    });
  });

  it("switches selection states and allows eliminated fruit to be selected again", async () => {
    const service = createFruitService();
    const fruit = await service.createFruitFromCandidate({
      markdown: "正文",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });

    await expect(service.selectFruit(fruit.id)).resolves.toMatchObject({
      selectionState: FRUIT_SELECTION_STATES.selected,
    });
    await expect(service.restoreFruitToCandidate(fruit.id)).resolves.toMatchObject({
      selectionState: FRUIT_SELECTION_STATES.candidate,
    });
    await expect(service.eliminateFruit(fruit.id)).resolves.toMatchObject({
      selectionState: FRUIT_SELECTION_STATES.eliminated,
    });
    await expect(service.selectFruit(fruit.id)).resolves.toMatchObject({
      selectionState: FRUIT_SELECTION_STATES.selected,
    });
  });

  it("does not expose hard delete, public create, or global list capabilities", () => {
    const service = createFruitService();
    const controller = new FruitController(service);

    expect("deleteFruit" in service).toBe(false);
    expect("createFruit" in controller).toBe(false);
    expect("createFruitFromCandidate" in controller).toBe(false);
    expect("listFruits" in controller).toBe(false);
  });

  it("queries child fruits by parent, checks publishability, and returns growth source refs", async () => {
    const service = createFruitService();
    const first = await service.createFruitFromCandidate({
      markdown: "第一颗",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });
    await service.createFruitFromCandidate({
      markdown: "第二颗",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
    });
    await service.createFruitFromCandidate({
      markdown: "其他父节点",
      parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_2" },
    });

    await expect(
      service.listChildFruits({ nodeType: "seed", nodeId: "seed-node_seed_1" }),
    ).resolves.toHaveLength(2);
    await expect(service.getPublishEligibility(first.id)).resolves.toMatchObject({
      canPublish: false,
    });
    await expect(service.assertPublishable(first.id)).rejects.toBeInstanceOf(
      ApplicationError,
    );
    await service.selectFruit(first.id);
    await expect(service.getPublishEligibility(first.id)).resolves.toMatchObject({
      canPublish: true,
      reason: null,
    });
    await expect(service.getGrowthSourceRef(first.id)).resolves.toMatchObject({
      fruitId: first.id,
      nodeId: first.id,
      nodeType: "fruit",
      contentLocation: first.contentLocation,
    });
  });

  it("cleans up created markdown when storing system facts fails", async () => {
    const contentAccess = new InMemoryFruitMarkdownContentAccessAdapter();
    const storage: FruitStoragePort = {
      async createFruit(_record: FruitRecord): Promise<void> {
        throw new Error("storage failed");
      },
      async findFruitById(_fruitId: string): Promise<FruitRecord | null> {
        return null;
      },
      async saveFruit(_record: FruitRecord): Promise<void> {
        throw new Error("not used");
      },
      async listChildFruits(): Promise<FruitRecord[]> {
        return [];
      },
    };
    const idGenerator: IdGenerator = {
      nextId(): string {
        return "fruit_orphan";
      },
    };
    const service = new FruitService({
      storage,
      contentAccess,
      idGenerator,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      service.createFruitFromCandidate({
        markdown: "孤儿正文",
        parentNodeRef: { nodeType: "seed", nodeId: "seed-node_seed_1" },
      }),
    ).rejects.toThrow("storage failed");
    await expect(
      contentAccess.readFruitMarkdown("fruits/fruit_orphan.md"),
    ).rejects.toBeInstanceOf(ApplicationError);
  });
});
