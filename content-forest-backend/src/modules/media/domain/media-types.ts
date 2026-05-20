export const MEDIA_TYPES = {
  image: "image",
  video: "video",
} as const;

export type MediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES];

export const MEDIA_ASSET_SOURCE_TYPES = {
  userUpload: "user_upload",
  generatedOutput: "generated_output",
  imported: "imported",
} as const;

export type MediaAssetSourceType =
  (typeof MEDIA_ASSET_SOURCE_TYPES)[keyof typeof MEDIA_ASSET_SOURCE_TYPES];

export const FRUIT_MEDIA_DISPLAY_ROLES = {
  primary: "primary",
  inline: "inline",
  reference: "reference",
  attachment: "attachment",
} as const;

export type FruitMediaDisplayRole =
  (typeof FRUIT_MEDIA_DISPLAY_ROLES)[keyof typeof FRUIT_MEDIA_DISPLAY_ROLES];

export interface MediaAssetSummary {
  id: string;
  seedId: string;
  mediaType: MediaType;
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  sourceType: MediaAssetSourceType;
  sourceId: string | null;
  contentUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAssetDetail extends MediaAssetSummary {
  canReference: boolean;
}

export interface FruitMediaAttachmentSummary extends MediaAssetSummary {
  displayRole: FruitMediaDisplayRole;
  sortOrder: number;
  attachedAt: string;
}
