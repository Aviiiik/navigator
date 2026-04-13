import { type FastifyInstance } from "fastify";
import { v4 as uuidv4 } from "uuid";

export async function requestLogger(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    // Attach correlation ID — use existing header or generate new one
    const correlationId =
      (request.headers["x-correlation-id"] as string) ?? uuidv4();
    request.headers["x-correlation-id"] = correlationId;

    request.log.info(
      {
        method: request.method,
        url: request.url,
        correlationId,
        ip: request.ip,
        userAgent: request.headers["user-agent"],
      },
      "→ incoming request"
    );
  });

  app.addHook("onResponse", async (request, reply) => {
    const correlationId = request.headers["x-correlation-id"];
    reply.header("x-correlation-id", correlationId as string);
    reply.header("x-request-id", request.id);

    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        correlationId,
      },
      "← response sent"
    );
  });
}
