import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type {
  CreateMediaContentInput,
  MediaContentAccessPort,
} from "../ports/media-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class LocalMediaContentAccessAdapter
  implements MediaContentAccessPort
{
  private readonly contentRootDir: string;

  public constructor(contentRootDir: string) {
    this.contentRootDir = resolve(contentRootDir);
  }

  public async createMediaContent(
    input: CreateMediaContentInput,
  ): Promise<string> {
    const contentLocation = [
      "media",
      this.safeFileName(input.mediaAssetId),
      this.safeFileName(input.fileName) || "content.bin",
    ].join("/");
    const target = this.resolve(contentLocation);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, input.content);
    return contentLocation;
  }

  public async readMediaContent(contentLocation: string): Promise<Buffer> {
    return readFile(this.resolve(contentLocation));
  }

  public async removeMediaContent(contentLocation: string): Promise<void> {
    await rm(this.resolve(contentLocation), { force: true });
  }

  private resolve(contentLocation: string): string {
    const normalized = contentLocation.replaceAll("\\", "/");
    const segments = normalized.split("/");
    if (
      normalized.trim().length === 0 ||
      isAbsolute(normalized) ||
      segments.includes("..")
    ) {
      throw this.invalidContentLocation();
    }

    const target = resolve(this.contentRootDir, normalized);
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

  private safeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+$/, "");
  }

  private invalidContentLocation(): ApplicationError {
    return new ApplicationError(
      "CONTENT_ACCESS_ERROR",
      "媒体内容位置必须是运行时内容根目录下的相对路径",
      500,
    );
  }
}
