export type PublicationPublisherType = 'manual'

export interface PublicationRecord {
  id: string
  fruitId: string
  publisherType: PublicationPublisherType
  publicationTarget: string
  publicationEvidence: string
  publicationNote: string
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface CreatePublicationRecordRequest {
  fruitId: string
  publicationTarget: string
  publicationEvidence: string
  publicationNote?: string
}

export interface UpdatePublicationRecordRequest {
  publicationTarget?: string
  publicationEvidence?: string
  publicationNote?: string
}
