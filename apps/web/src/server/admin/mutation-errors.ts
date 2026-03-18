import { ZodError } from "zod";

export const adminMutationErrorCodes = [
  "unauthorized",
  "forbidden",
  "recent_auth_required",
  "validation",
  "not_found",
  "conflict",
] as const;

export type AdminMutationErrorCode = (typeof adminMutationErrorCodes)[number];

export class AdminMutationError extends Error {
  readonly code: AdminMutationErrorCode;

  constructor(code: AdminMutationErrorCode, message: string) {
    super(message);
    this.name = "AdminMutationError";
    this.code = code;
  }
}

export function isAdminMutationError(error: unknown): error is AdminMutationError {
  return error instanceof AdminMutationError;
}

function defaultMessageForCode(code: AdminMutationErrorCode) {
  switch (code) {
    case "unauthorized":
      return "Please sign in before trying this action.";
    case "forbidden":
      return "You do not have permission to perform this action.";
    case "recent_auth_required":
      return "Please sign in again before performing this admin write action.";
    case "validation":
      return "Please review the submitted fields and try again.";
    case "not_found":
      return "The requested record no longer exists.";
    case "conflict":
      return "This action conflicts with current data. Refresh and try again.";
    default:
      return "Could not complete this action.";
  }
}

export function createAdminMutationError(code: AdminMutationErrorCode, message?: string) {
  return new AdminMutationError(code, message ?? defaultMessageForCode(code));
}

function sanitizeValidationMessage(error: ZodError) {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return defaultMessageForCode("validation");
  }
  if (!firstIssue.path.length) {
    return firstIssue.message;
  }
  return `${firstIssue.path.join(".")}: ${firstIssue.message}`;
}

export type AdminMutationFeedback = {
  type: "error" | "success";
  code: AdminMutationErrorCode | "unknown" | "success";
  message: string;
};

export function mapAdminMutationError(error: unknown): AdminMutationFeedback {
  if (isAdminMutationError(error)) {
    return {
      type: "error",
      code: error.code,
      message: error.message,
    };
  }

  if (error instanceof ZodError) {
    return {
      type: "error",
      code: "validation",
      message: sanitizeValidationMessage(error),
    };
  }

  if (error instanceof Error) {
    return {
      type: "error",
      code: "unknown",
      message: "Could not complete this action. Please try again.",
    };
  }

  return {
    type: "error",
    code: "unknown",
    message: "Could not complete this action. Please try again.",
  };
}
