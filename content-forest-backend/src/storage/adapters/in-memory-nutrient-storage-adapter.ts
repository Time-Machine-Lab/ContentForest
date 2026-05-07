import {
  NUTRIENT_ARCHIVE_STATES,
  NUTRIENT_LIBRARY_SCOPES,
} from "../../modules/nutrient/domain/nutrient-types.js";
import type {
  NutrientContentListFilter,
  NutrientContentRecord,
  NutrientLibraryListFilter,
  NutrientLibraryRecord,
  NutrientStoragePort,
  ReferableNutrientContentRecord,
} from "../ports/nutrient-storage-port.js";

export class InMemoryNutrientStorageAdapter implements NutrientStoragePort {
  private readonly libraries = new Map<string, NutrientLibraryRecord>();
  private readonly contents = new Map<string, NutrientContentRecord>();

  public async createLibrary(record: NutrientLibraryRecord): Promise<void> {
    this.libraries.set(record.id, { ...record });
  }

  public async findLibraryById(
    libraryId: string,
  ): Promise<NutrientLibraryRecord | null> {
    const record = this.libraries.get(libraryId);
    return record === undefined ? null : { ...record };
  }

  public async saveLibrary(record: NutrientLibraryRecord): Promise<void> {
    this.libraries.set(record.id, { ...record });
  }

  public async listLibraries(
    filter: NutrientLibraryListFilter = {},
  ): Promise<NutrientLibraryRecord[]> {
    return [...this.libraries.values()]
      .filter((record) => filter.scope === undefined || record.scope === filter.scope)
      .filter(
        (record) =>
          filter.archiveState === undefined ||
          record.archiveState === filter.archiveState,
      )
      .filter((record) => filter.seedId === undefined || record.seedId === filter.seedId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async countContentsByLibrary(libraryId: string): Promise<number> {
    return [...this.contents.values()].filter(
      (record) => record.libraryId === libraryId,
    ).length;
  }

  public async createContent(record: NutrientContentRecord): Promise<void> {
    this.contents.set(record.id, { ...record });
  }

  public async findContentById(
    contentId: string,
  ): Promise<NutrientContentRecord | null> {
    const record = this.contents.get(contentId);
    return record === undefined ? null : { ...record };
  }

  public async saveContent(record: NutrientContentRecord): Promise<void> {
    this.contents.set(record.id, { ...record });
  }

  public async listContentsByLibrary(
    libraryId: string,
    filter: NutrientContentListFilter = {},
  ): Promise<NutrientContentRecord[]> {
    return [...this.contents.values()]
      .filter((record) => record.libraryId === libraryId)
      .filter(
        (record) =>
          filter.archiveState === undefined ||
          record.archiveState === filter.archiveState,
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((record) => ({ ...record }));
  }

  public async listReferableContents(
    seedId: string,
  ): Promise<ReferableNutrientContentRecord[]> {
    return [...this.contents.values()]
      .flatMap((content) => {
        const library = this.libraries.get(content.libraryId);
        if (library === undefined) {
          return [];
        }
        const libraryReferable =
          library.archiveState === NUTRIENT_ARCHIVE_STATES.active &&
          (library.scope === NUTRIENT_LIBRARY_SCOPES.public ||
            library.seedId === seedId);
        if (
          !libraryReferable ||
          content.archiveState !== NUTRIENT_ARCHIVE_STATES.active
        ) {
          return [];
        }
        return [{
          content: { ...content },
          library: { ...library },
        }];
      })
      .sort((left, right) =>
        right.content.updatedAt.localeCompare(left.content.updatedAt),
      );
  }
}
