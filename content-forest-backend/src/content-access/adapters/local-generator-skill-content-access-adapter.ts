import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type {
  GeneratorSkillContentAccessPort,
  GeneratorSkillOverview,
  SaveGeneratorSkillInput,
} from "../ports/generator-skill-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

interface ZipEntry {
  path: string;
  data: Buffer;
}

export class LocalGeneratorSkillContentAccessAdapter
  implements GeneratorSkillContentAccessPort
{
  private readonly contentRootDir: string;

  public constructor(contentRootDir: string) {
    this.contentRootDir = resolve(contentRootDir);
  }

  public async saveGeneratorSkill(
    input: SaveGeneratorSkillInput,
  ): Promise<string> {
    const contentLocation = `generators/${this.safeFileName(input.generatorId)}`;
    await rm(this.resolve(contentLocation), { recursive: true, force: true });
    await this.writeZipToLocation(input.zipBuffer, contentLocation);
    return contentLocation;
  }

  public async replaceGeneratorSkill(
    input: SaveGeneratorSkillInput,
  ): Promise<string> {
    const contentLocation = `generators/${this.safeFileName(input.generatorId)}`;
    const tempLocation = `tmp/generator-upload-${this.safeFileName(input.generatorId)}-${globalThis.crypto.randomUUID()}`;
    const backupLocation = `tmp/generator-backup-${this.safeFileName(input.generatorId)}-${globalThis.crypto.randomUUID()}`;
    const target = this.resolve(contentLocation);
    const backup = this.resolve(backupLocation);

    await this.writeZipToLocation(input.zipBuffer, tempLocation);

    try {
      await rm(backup, { recursive: true, force: true });
      await cp(target, backup, { recursive: true, force: true });
      await rm(target, { recursive: true, force: true });
      await rename(this.resolve(tempLocation), target);
      await rm(backup, { recursive: true, force: true });
      return contentLocation;
    } catch (error) {
      await rm(this.resolve(tempLocation), { recursive: true, force: true });
      await rm(target, { recursive: true, force: true });
      try {
        await rename(backup, target);
      } catch {
        throw error;
      }
      throw error;
    }
  }

  public async readGeneratorSkill(
    contentLocation: string,
  ): Promise<GeneratorSkillOverview> {
    const root = this.resolve(contentLocation);
    const skillMarkdown = await readFile(join(root, "SKILL.md"), "utf8");
    return {
      skillMarkdown,
      entries: await this.listEntries(root),
    };
  }

  public async removeGeneratorSkill(contentLocation: string): Promise<void> {
    await rm(this.resolve(contentLocation), { recursive: true, force: true });
  }

  private async writeZipToLocation(
    zipBuffer: Buffer,
    contentLocation: string,
  ): Promise<void> {
    const target = this.resolve(contentLocation);
    const entries = this.stripSingleRootDirectory(this.readZipEntries(zipBuffer));
    if (!entries.some((entry) => entry.path === "SKILL.md")) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "生成器 Skill 必须包含 SKILL.md",
        400,
      );
    }

    await rm(target, { recursive: true, force: true });
    await mkdir(target, { recursive: true });

    try {
      for (const entry of entries) {
        const output = this.resolveInside(target, entry.path);
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, entry.data);
      }
      await readFile(join(target, "SKILL.md"), "utf8");
    } catch (error) {
      await rm(target, { recursive: true, force: true });
      throw error;
    }
  }

  private readZipEntries(zipBuffer: Buffer): ZipEntry[] {
    try {
      const eocdOffset = this.findEndOfCentralDirectory(zipBuffer);
      const centralDirectorySize = zipBuffer.readUInt32LE(eocdOffset + 12);
      const centralDirectoryOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
      const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;
      const entries: ZipEntry[] = [];
      let offset = centralDirectoryOffset;

      while (offset < centralDirectoryEnd) {
        if (zipBuffer.readUInt32LE(offset) !== 0x02014b50) {
          throw this.invalidZip();
        }

        const compressionMethod = zipBuffer.readUInt16LE(offset + 10);
        const compressedSize = zipBuffer.readUInt32LE(offset + 20);
        const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
        const extraLength = zipBuffer.readUInt16LE(offset + 30);
        const commentLength = zipBuffer.readUInt16LE(offset + 32);
        const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);
        const rawName = zipBuffer
          .subarray(offset + 46, offset + 46 + fileNameLength)
          .toString("utf8");
        const normalizedPath = this.normalizeZipEntryPath(rawName);

        if (normalizedPath !== null) {
          entries.push({
            path: normalizedPath,
            data: this.readZipEntryData(
              zipBuffer,
              localHeaderOffset,
              compressedSize,
              compressionMethod,
            ),
          });
        }

        offset += 46 + fileNameLength + extraLength + commentLength;
      }

      return entries;
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw this.invalidZip();
    }
  }

  private readZipEntryData(
    zipBuffer: Buffer,
    localHeaderOffset: number,
    compressedSize: number,
    compressionMethod: number,
  ): Buffer {
    if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw this.invalidZip();
    }

    const fileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
    const extraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
    const compressed = zipBuffer.subarray(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      return Buffer.from(compressed);
    }

    if (compressionMethod === 8) {
      return inflateRawSync(compressed);
    }

    throw new ApplicationError(
      "VALIDATION_ERROR",
      "生成器 zip 包含暂不支持的压缩方式",
      400,
    );
  }

  private findEndOfCentralDirectory(zipBuffer: Buffer): number {
    const minOffset = Math.max(0, zipBuffer.length - 65_557);
    for (let offset = zipBuffer.length - 22; offset >= minOffset; offset -= 1) {
      if (zipBuffer.readUInt32LE(offset) === 0x06054b50) {
        return offset;
      }
    }
    throw this.invalidZip();
  }

  private normalizeZipEntryPath(rawPath: string): string | null {
    const normalized = rawPath.replaceAll("\\", "/").replace(/^\.\/+/, "");
    const segments = normalized.split("/").filter((segment) => segment.length > 0);

    if (normalized.endsWith("/")) {
      return null;
    }

    if (
      segments.length === 0 ||
      normalized.startsWith("/") ||
      /^[a-zA-Z]:\//.test(normalized) ||
      segments.includes("..")
    ) {
      throw this.invalidContentLocation();
    }

    return segments.join("/");
  }

  private stripSingleRootDirectory(entries: ZipEntry[]): ZipEntry[] {
    if (entries.length === 0) {
      return entries;
    }

    const firstSegments = entries.map((entry) => entry.path.split("/")[0] ?? "");
    const root = firstSegments[0] ?? "";
    if (
      root.length === 0 ||
      entries.some((entry) => !entry.path.startsWith(`${root}/`))
    ) {
      return entries;
    }

    return entries.map((entry) => ({
      path: entry.path.slice(root.length + 1),
      data: entry.data,
    }));
  }

  private async listEntries(root: string): Promise<string[]> {
    const result: string[] = [];
    await this.collectEntries(root, root, result);
    return result.sort((left, right) => {
      if (left < right) {
        return -1;
      }
      if (left > right) {
        return 1;
      }
      return 0;
    });
  }

  private async collectEntries(
    root: string,
    directory: string,
    result: string[],
  ): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      const relativePath = relative(root, absolutePath).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        await this.collectEntries(root, absolutePath, result);
      } else {
        result.push(relativePath);
      }
    }
  }

  private resolve(contentLocation: string): string {
    const segments = contentLocation.replaceAll("\\", "/").split("/");
    if (
      contentLocation.trim().length === 0 ||
      isAbsolute(contentLocation) ||
      segments.includes("..")
    ) {
      throw this.invalidContentLocation();
    }

    const target = resolve(this.contentRootDir, contentLocation);
    const relativePath = relative(this.contentRootDir, target);
    if (
      relativePath.length === 0 ||
      relativePath.startsWith("..") ||
      isAbsolute(relativePath)
    ) {
      throw this.invalidContentLocation();
    }

    return target;
  }

  private resolveInside(root: string, relativePath: string): string {
    const target = resolve(root, relativePath);
    const rootRelative = relative(root, target);
    if (
      rootRelative.length === 0 ||
      rootRelative.startsWith("..") ||
      isAbsolute(rootRelative)
    ) {
      throw this.invalidContentLocation();
    }
    return target;
  }

  private safeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
  }

  private invalidZip(): ApplicationError {
    return new ApplicationError(
      "CONTENT_ACCESS_ERROR",
      "生成器 zip 无法读取或内容已损坏",
      400,
    );
  }

  private invalidContentLocation(): ApplicationError {
    return new ApplicationError(
      "CONTENT_ACCESS_ERROR",
      "内容位置必须是运行时内容根目录下的相对路径",
      500,
    );
  }
}
