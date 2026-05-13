import { ApplicationError } from "../../../shared/errors/application-error.js";
import type { IdGenerator } from "../../../shared/utils/id-generator.js";
import { RandomIdGenerator } from "../../../shared/utils/id-generator.js";
import type { FeedbackStoragePort } from "../../../storage/ports/feedback-storage-port.js";
import {
  FEEDBACK_MONITOR_TYPES,
  type FeedbackHistory,
  type FeedbackMonitorAttachment,
  type FeedbackSnapshot,
} from "../domain/feedback-types.js";
import type {
  NetworkObservation,
  NetworkObservationPort,
} from "./network-observation-port.js";
import type { PublicationRecordPort } from "./publication-record-port.js";

export interface CreateFeedbackSnapshotInput {
  performanceData: Record<string, unknown>;
  userObservation?: string;
  capturedAt?: string;
}

export interface UpdateFeedbackSnapshotInput {
  performanceData?: Record<string, unknown>;
  userObservation?: string;
  capturedAt?: string;
}

export interface FeedbackServiceDependencies {
  storage: FeedbackStoragePort;
  publicationRecordPort: PublicationRecordPort;
  networkObservationPort?: NetworkObservationPort;
  idGenerator?: IdGenerator;
  now?: () => Date;
}

export class FeedbackService {
  private readonly storage: FeedbackStoragePort;
  private readonly publicationRecordPort: PublicationRecordPort;
  private readonly networkObservationPort: NetworkObservationPort | undefined;
  private readonly idGenerator: IdGenerator;
  private readonly now: () => Date;

  public constructor(dependencies: FeedbackServiceDependencies) {
    this.storage = dependencies.storage;
    this.publicationRecordPort = dependencies.publicationRecordPort;
    this.networkObservationPort = dependencies.networkObservationPort;
    this.idGenerator = dependencies.idGenerator ?? new RandomIdGenerator();
    this.now = dependencies.now ?? (() => new Date());
  }

  public async attachManualMonitor(
    publicationRecordId: string,
  ): Promise<FeedbackMonitorAttachment> {
    const normalizedPublicationRecordId = this.requireNonBlank(
      publicationRecordId,
      "Publication record id is required",
    );
    await this.publicationRecordPort.assertPublicationRecordExists(
      normalizedPublicationRecordId,
    );
    if (
      await this.storage.hasMonitorAttachmentForPublicationRecord(
        normalizedPublicationRecordId,
      )
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Publication record already has a monitor attachment",
        400,
      );
    }

    const timestamp = this.timestamp();
    const attachment: FeedbackMonitorAttachment = {
      id: this.idGenerator.nextId("feedback-monitor"),
      publicationRecordId: normalizedPublicationRecordId,
      monitorType: FEEDBACK_MONITOR_TYPES.manual,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.createMonitorAttachment(attachment);
    return { ...attachment };
  }

  public async createFeedbackSnapshot(
    publicationRecordId: string,
    input: CreateFeedbackSnapshotInput,
  ): Promise<FeedbackSnapshot> {
    const normalizedPublicationRecordId = this.requireNonBlank(
      publicationRecordId,
      "Publication record id is required",
    );
    await this.publicationRecordPort.assertPublicationRecordExists(
      normalizedPublicationRecordId,
    );
    const attachment =
      await this.storage.findMonitorAttachmentByPublicationRecordId(
        normalizedPublicationRecordId,
      );
    if (attachment === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "A monitor attachment is required before creating feedback snapshots",
        400,
      );
    }

    const timestamp = this.timestamp();
    const snapshot: FeedbackSnapshot = {
      id: this.idGenerator.nextId("feedback-snapshot"),
      publicationRecordId: normalizedPublicationRecordId,
      monitorAttachmentId: attachment.id,
      performanceData: this.clonePerformanceData(input.performanceData),
      userObservation: this.normalizeOptionalText(input.userObservation),
      capturedAt:
        input.capturedAt === undefined
          ? timestamp
          : this.requireNonBlank(input.capturedAt, "Captured time is required"),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.storage.createFeedbackSnapshot(snapshot);
    return this.cloneSnapshot(snapshot);
  }

  public async editFeedbackSnapshot(
    snapshotId: string,
    input: UpdateFeedbackSnapshotInput,
  ): Promise<FeedbackSnapshot> {
    const snapshot = await this.requireFeedbackSnapshot(snapshotId);
    if (
      input.performanceData === undefined &&
      input.userObservation === undefined &&
      input.capturedAt === undefined
    ) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "At least one editable feedback snapshot field is required",
        400,
      );
    }

    const updated: FeedbackSnapshot = {
      ...snapshot,
      performanceData:
        input.performanceData === undefined
          ? this.clonePerformanceData(snapshot.performanceData)
          : this.clonePerformanceData(input.performanceData),
      userObservation:
        input.userObservation === undefined
          ? snapshot.userObservation
          : this.normalizeOptionalText(input.userObservation),
      capturedAt:
        input.capturedAt === undefined
          ? snapshot.capturedAt
          : this.requireNonBlank(input.capturedAt, "Captured time is required"),
      updatedAt: this.timestamp(),
    };
    await this.storage.saveFeedbackSnapshot(updated);
    return this.cloneSnapshot(updated);
  }

  public async getFeedbackHistory(
    publicationRecordId: string,
  ): Promise<FeedbackHistory> {
    const normalizedPublicationRecordId = this.requireNonBlank(
      publicationRecordId,
      "Publication record id is required",
    );
    await this.publicationRecordPort.assertPublicationRecordExists(
      normalizedPublicationRecordId,
    );
    const monitorAttachment =
      await this.storage.findMonitorAttachmentByPublicationRecordId(
        normalizedPublicationRecordId,
      );
    const snapshots =
      await this.storage.listFeedbackSnapshotsByPublicationRecord(
        normalizedPublicationRecordId,
      );
    return {
      publicationRecordId: normalizedPublicationRecordId,
      monitorAttachment:
        monitorAttachment === null ? null : { ...monitorAttachment },
      snapshots: snapshots.map((snapshot) => this.cloneSnapshot(snapshot)),
    };
  }

  public async observePublicationLink(
    publicationRecordId: string,
    input: { url: string; platform?: string },
  ): Promise<NetworkObservation> {
    const normalizedPublicationRecordId = this.requireNonBlank(
      publicationRecordId,
      "Publication record id is required",
    );
    await this.publicationRecordPort.assertPublicationRecordExists(
      normalizedPublicationRecordId,
    );
    const attachment =
      await this.storage.findMonitorAttachmentByPublicationRecordId(
        normalizedPublicationRecordId,
      );
    if (attachment === null) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "A monitor attachment is required before observing publication data",
        400,
      );
    }
    if (this.networkObservationPort === undefined) {
      throw new ApplicationError(
        "AGENT_TOOL_ERROR",
        "联网观测能力尚未装配",
        502,
      );
    }
    return this.networkObservationPort.observeUrl({
      url: this.requireNonBlank(input.url, "Observation url is required"),
      platform: input.platform,
    });
  }

  private async requireFeedbackSnapshot(
    snapshotId: string,
  ): Promise<FeedbackSnapshot> {
    const id = this.requireNonBlank(snapshotId, "Feedback snapshot id is required");
    const snapshot = await this.storage.findFeedbackSnapshotById(id);
    if (snapshot === null) {
      throw new ApplicationError(
        "NOT_FOUND",
        "Feedback snapshot does not exist",
        404,
      );
    }
    return snapshot;
  }

  private requireNonBlank(value: string, message: string): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new ApplicationError("VALIDATION_ERROR", message, 400);
    }
    return normalized;
  }

  private normalizeOptionalText(value: string | undefined): string {
    return value?.trim() ?? "";
  }

  private clonePerformanceData(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new ApplicationError(
        "VALIDATION_ERROR",
        "Performance data must be a structured object",
        400,
      );
    }
    return structuredClone(value);
  }

  private cloneSnapshot(snapshot: FeedbackSnapshot): FeedbackSnapshot {
    return {
      ...snapshot,
      performanceData: this.clonePerformanceData(snapshot.performanceData),
    };
  }

  private timestamp(): string {
    return this.now().toISOString();
  }
}
