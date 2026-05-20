import type {
  CreateMediaAssetUploadInput,
  MediaContentReadResult,
  MediaService,
} from "../../modules/media/application/media-service.js";
import type { HttpResult } from "./seed-controller.js";

export class MediaController {
  private readonly mediaService: MediaService;

  public constructor(mediaService: MediaService) {
    this.mediaService = mediaService;
  }

  public async createMediaAsset(
    body: CreateMediaAssetUploadInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.mediaService.createMediaAssetFromUpload(body),
    };
  }

  public async getMediaAsset(
    mediaAssetId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.mediaService.getMediaAsset(mediaAssetId),
    };
  }

  public async readMediaContent(
    mediaAssetId: string,
  ): Promise<MediaContentReadResult> {
    return this.mediaService.readMediaContent(mediaAssetId);
  }
}
