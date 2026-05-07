export const PUBLICATION_PUBLISHER_TYPES = {
  manual: "manual",
} as const;

export type PublicationPublisherType =
  (typeof PUBLICATION_PUBLISHER_TYPES)[keyof typeof PUBLICATION_PUBLISHER_TYPES];

export interface PublicationRecord {
  id: string;
  fruitId: string;
  publisherType: PublicationPublisherType;
  publicationTarget: string;
  publicationEvidence: string;
  publicationNote: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

