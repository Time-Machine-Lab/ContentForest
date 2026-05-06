export type ApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONTENT_ACCESS_ERROR";

export class ApplicationError extends Error {
  public readonly code: ApplicationErrorCode;
  public readonly status: number;

  public constructor(code: ApplicationErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
    this.status = status;
  }
}

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof ApplicationError;
}

