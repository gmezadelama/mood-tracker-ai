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
