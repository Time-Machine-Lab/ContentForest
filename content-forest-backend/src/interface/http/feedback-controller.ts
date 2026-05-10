import type {
  CreateFeedbackSnapshotInput,
  FeedbackService,
  UpdateFeedbackSnapshotInput,
} from "../../modules/feedback/application/feedback-service.js";
import type { HttpResult } from "./seed-controller.js";

export class FeedbackController {
  private readonly feedbackService: FeedbackService;

  public constructor(feedbackService: FeedbackService) {
    this.feedbackService = feedbackService;
  }

  public async attachManualMonitor(
    publicationRecordId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.feedbackService.attachManualMonitor(publicationRecordId),
    };
  }

  public async createFeedbackSnapshot(
    publicationRecordId: string,
    body: CreateFeedbackSnapshotInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 201,
      body: await this.feedbackService.createFeedbackSnapshot(
        publicationRecordId,
        body,
      ),
    };
  }

  public async editFeedbackSnapshot(
    snapshotId: string,
    body: UpdateFeedbackSnapshotInput,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.feedbackService.editFeedbackSnapshot(snapshotId, body),
    };
  }

  public async getFeedbackHistory(
    publicationRecordId: string,
  ): Promise<HttpResult<unknown>> {
    return {
      status: 200,
      body: await this.feedbackService.getFeedbackHistory(publicationRecordId),
    };
  }
}
