import { type FastifyReply, type FastifyRequest } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, "VALIDATION_ERROR");
  }
}

export class SessionExpiredError extends AppError {
  constructor() {
    super(410, "Session expired or not found. Please start a new session.", "SESSION_EXPIRED");
  }
}

export class AIServiceError extends AppError {
  constructor(message = "AI service temporarily unavailable") {
    super(503, message, "AI_SERVICE_ERROR");
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super(429, "Too many requests. Please slow down.", "RATE_LIMIT_EXCEEDED");
  }
}

// Fastify error handler
export function errorHandler(
  error: Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const log = request.log;

  if (error instanceof AppError) {
    log.warn({ err: error, code: error.code }, error.message);
    reply.status(error.statusCode).send({
      error: {
        code: error.code ?? "APP_ERROR",
        message: error.message,
        requestId: request.id,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    log.warn({ err: error }, "Validation error");
    reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        details: error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
        requestId: request.id,
      },
    });
    return;
  }

  // Unexpected errors
  log.error({ err: error }, "Unhandled error");
  reply.status(500).send({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      requestId: request.id,
    },
  });
}
