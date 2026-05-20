export interface CreateMediaContentInput {
  mediaAssetId: string;
  fileName: string;
  content: Buffer;
}

export interface MediaContentAccessPort {
  createMediaContent(input: CreateMediaContentInput): Promise<string>;
  readMediaContent(contentLocation: string): Promise<Buffer>;
  removeMediaContent(contentLocation: string): Promise<void>;
}
