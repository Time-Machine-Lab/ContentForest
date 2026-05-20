import type {
  CreateMediaContentInput,
  MediaContentAccessPort,
} from "../ports/media-content-access-port.js";
import { ApplicationError } from "../../shared/errors/application-error.js";

export class InMemoryMediaContentAccessAdapter
  implements MediaContentAccessPort
{
  private readonly contents = new Map<string, Buffer>();

  public async createMediaContent(
    input: CreateMediaContentInput,
  ): Promise<string> {
    const contentLocation = `media/${this.safeFileName(input.mediaAssetId)}/${this.safeFileName(input.fileName) || "content.bin"}`;
    this.contents.set(contentLocation, Buffer.from(input.content));
    return contentLocation;
  }

  public async readMediaContent(contentLocation: string): Promise<Buffer> {
    const content = this.contents.get(contentLocation);
    if (content === undefined) {
      throw new ApplicationError("CONTENT_ACCESS_ERROR", "媒体内容不存在", 500);
    }
    return Buffer.from(content);
  }

  public async removeMediaContent(contentLocation: string): Promise<void> {
    this.contents.delete(contentLocation);
  }

  private safeFileName(value: string): string {
    return value.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+$/, "");
  }
}
