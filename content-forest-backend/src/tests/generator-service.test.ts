import { describe, expect, it } from "vitest";
import type {
  GeneratorSkillContentAccessPort,
  GeneratorSkillOverview,
  SaveGeneratorSkillInput,
} from "../content-access/ports/generator-skill-content-access-port.js";
import { GeneratorService } from "../modules/generator/application/generator-service.js";
import { GENERATOR_ENABLE_STATES } from "../modules/generator/domain/generator-types.js";
import { ApplicationError } from "../shared/errors/application-error.js";
import type { IdGenerator } from "../shared/utils/id-generator.js";
import { InMemoryGeneratorStorageAdapter } from "../storage/adapters/in-memory-generator-storage-adapter.js";

class FakeGeneratorSkillContentAccess
  implements GeneratorSkillContentAccessPort
{
  private readonly overviewsByLocation = new Map<string, GeneratorSkillOverview>();
  public removedLocations: string[] = [];

  public async saveGeneratorSkill(
    input: SaveGeneratorSkillInput,
  ): Promise<string> {
    this.assertValidSkill(input.zipBuffer);
    const location = `generators/${input.generatorId}`;
    this.overviewsByLocation.set(location, this.toOverview(input.zipBuffer));
    return location;
  }

  public async replaceGeneratorSkill(
    input: SaveGeneratorSkillInput,
  ): Promise<string> {
    this.assertValidSkill(input.zipBuffer);
    const location = `generators/${input.generatorId}`;
    this.overviewsByLocation.set(location, this.toOverview(input.zipBuffer));
    return location;
  }

  public async readGeneratorSkill(
    contentLocation: string,
  ): Promise<GeneratorSkillOverview> {
    const overview = this.overviewsByLocation.get(contentLocation);
    if (overview === undefined) {
      throw new ApplicationError("CONTENT_ACCESS_ERROR", "Skill 不存在", 500);
    }
    return {
      skillMarkdown: overview.skillMarkdown,
      entries: [...overview.entries],
    };
  }

  public async readGeneratorSkillTextFile(
    contentLocation: string,
    relativePath: string,
  ): Promise<string> {
    const overview = await this.readGeneratorSkill(contentLocation);
    if (relativePath === "SKILL.md") {
      return overview.skillMarkdown;
    }
    throw new ApplicationError("CONTENT_ACCESS_ERROR", "Skill 文件不存在", 500);
  }

  public async removeGeneratorSkill(contentLocation: string): Promise<void> {
    this.removedLocations.push(contentLocation);
    this.overviewsByLocation.delete(contentLocation);
  }

  private assertValidSkill(zipBuffer: Buffer): void {
    if (zipBuffer.toString("utf8").includes("missing-skill")) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "生成器 Skill 必须包含 SKILL.md",
        400,
      );
    }
  }

  private toOverview(zipBuffer: Buffer): GeneratorSkillOverview {
    const skillMarkdown = zipBuffer.toString("utf8");
    return {
      skillMarkdown,
      entries: ["SKILL.md"],
    };
  }
}

function createGeneratorService(
  contentAccess = new FakeGeneratorSkillContentAccess(),
): GeneratorService {
  let idCounter = 0;
  let timeCounter = 0;
  const idGenerator: IdGenerator = {
    nextId(prefix: string): string {
      idCounter += 1;
      return `${prefix}_${idCounter}`;
    },
  };

  return new GeneratorService({
    storage: new InMemoryGeneratorStorageAdapter(),
    contentAccess,
    idGenerator,
    now: () => {
      timeCounter += 1;
      return new Date(`2026-01-01T00:00:${String(timeCounter).padStart(2, "0")}.000Z`);
    },
  });
}

describe("GeneratorService", () => {
  it("imports an enabled generator with system facts and skill overview", async () => {
    const service = createGeneratorService();

    const generator = await service.importGenerator({
      name: "小红书文案生成器",
      description: "生成小红书产品文案",
      zipBuffer: Buffer.from("# Skill"),
    });

    expect(generator).toMatchObject({
      id: "generator_1",
      name: "小红书文案生成器",
      description: "生成小红书产品文案",
      enableState: GENERATOR_ENABLE_STATES.enabled,
      contentLocation: "generators/generator_1",
      disabledAt: null,
      skillMarkdown: "# Skill",
      entries: ["SKILL.md"],
    });
    await expect(service.listGenerators()).resolves.toHaveLength(1);
  });

  it("rejects empty name, empty description, and empty zip", async () => {
    const service = createGeneratorService();

    await expect(
      service.importGenerator({
        name: " ",
        description: "描述",
        zipBuffer: Buffer.from("# Skill"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.importGenerator({
        name: "名称",
        description: "",
        zipBuffer: Buffer.from("# Skill"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.importGenerator({
        name: "名称",
        description: "描述",
        zipBuffer: Buffer.alloc(0),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it("keeps disabled generators viewable but not selectable", async () => {
    const service = createGeneratorService();
    const generator = await service.importGenerator({
      name: "推特帖子",
      description: "生成帖子",
      zipBuffer: Buffer.from("# Skill"),
    });

    const disabled = await service.disableGenerator(generator.id);

    expect(disabled.enableState).toBe(GENERATOR_ENABLE_STATES.disabled);
    await expect(service.getGenerator(generator.id)).resolves.toMatchObject({
      id: generator.id,
      skillMarkdown: "# Skill",
    });
    await expect(service.listSelectableGenerators()).resolves.toEqual([]);
  });

  it("enables a disabled generator back into selectable list", async () => {
    const service = createGeneratorService();
    const generator = await service.importGenerator({
      name: "抖音讲解",
      description: "生成讲解脚本",
      zipBuffer: Buffer.from("# Skill"),
    });

    await service.disableGenerator(generator.id);
    const enabled = await service.enableGenerator(generator.id);

    expect(enabled.enableState).toBe(GENERATOR_ENABLE_STATES.enabled);
    await expect(service.listSelectableGenerators()).resolves.toMatchObject([
      {
        id: generator.id,
        contentLocation: "generators/generator_1",
      },
    ]);
  });

  it("reuploads skill content without changing generator identity", async () => {
    const service = createGeneratorService();
    const generator = await service.importGenerator({
      name: "生成器",
      description: "描述",
      zipBuffer: Buffer.from("# Old Skill"),
    });

    const reuploaded = await service.reuploadGeneratorSkill(generator.id, {
      zipBuffer: Buffer.from("# New Skill"),
    });

    expect(reuploaded).toMatchObject({
      id: generator.id,
      name: "生成器",
      contentLocation: generator.contentLocation,
      skillMarkdown: "# New Skill",
    });
  });

  it("rejects missing SKILL.md during import or reupload", async () => {
    const service = createGeneratorService();
    const generator = await service.importGenerator({
      name: "生成器",
      description: "描述",
      zipBuffer: Buffer.from("# Skill"),
    });

    await expect(
      service.importGenerator({
        name: "坏生成器",
        description: "描述",
        zipBuffer: Buffer.from("missing-skill"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(
      service.reuploadGeneratorSkill(generator.id, {
        zipBuffer: Buffer.from("missing-skill"),
      }),
    ).rejects.toBeInstanceOf(ApplicationError);
    await expect(service.getGenerator(generator.id)).resolves.toMatchObject({
      skillMarkdown: "# Skill",
    });
  });

  it("removes saved skill content when storage creation fails", async () => {
    const contentAccess = new FakeGeneratorSkillContentAccess();
    const service = new GeneratorService({
      storage: {
        async createGenerator(): Promise<void> {
          throw new Error("db failed");
        },
        async findGeneratorById(): Promise<null> {
          return null;
        },
        async listGenerators(): Promise<[]> {
          return [];
        },
        async listGeneratorsByEnableState(): Promise<[]> {
          return [];
        },
        async saveGenerator(): Promise<void> {},
      },
      contentAccess,
      idGenerator: {
        nextId(): string {
          return "generator_failed";
        },
      },
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      service.importGenerator({
        name: "生成器",
        description: "描述",
        zipBuffer: Buffer.from("# Skill"),
      }),
    ).rejects.toThrow("db failed");
    expect(contentAccess.removedLocations).toEqual(["generators/generator_failed"]);
  });
});
