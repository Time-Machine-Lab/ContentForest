export type MediaAssetType = 'image' | 'video'
export type MediaAssetSourceType = 'user_upload' | 'generated_output' | 'imported'
export type SupportedMediaMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif'
  | 'video/mp4'
  | 'video/webm'
  | 'video/quicktime'

export interface CreateMediaAssetRequest {
  seedId: string
  fileName: string
  mimeType: SupportedMediaMimeType
  contentBase64: string
  sourceType?: MediaAssetSourceType
  sourceId?: string | null
}

export interface MediaAssetSummary {
  id: string
  seedId: string
  mediaType: MediaAssetType
  mimeType: string
  fileName: string
  sizeBytes: number
  sourceType: MediaAssetSourceType
  sourceId: string | null
  contentUrl: string
  createdAt: string
  updatedAt: string
}

export interface MediaAssetDetail extends MediaAssetSummary {
  canReference: boolean
}

export interface ApiErrorResponse {
  code: string
  message: string
}
