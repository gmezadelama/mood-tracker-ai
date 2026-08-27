export class UnauthenticatedError extends Error {
  constructor(message = "Authentication is required") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// A request that is well-formed and authenticated but violates a product
// rule (e.g. the mood entry is outside the AI eligibility window).
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
