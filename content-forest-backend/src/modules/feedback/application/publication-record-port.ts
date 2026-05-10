export interface PublicationRecordPort {
  assertPublicationRecordExists(publicationRecordId: string): Promise<void>;
}
