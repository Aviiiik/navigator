import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import compress from "@fastify/compress";

import { config } from "./config/index.js";
import { errorHandler } from "./utils/errors.js";
import { requestLogger } from "./middleware/logger.js";
import { sessionRoutes } from "./routes/sessions.js";
import { chatRoutes } from "./routes/chat.js";
import { doctorRoutes } from "./routes/doctors.js";
import { healthRoutes } from "./routes/health.js";

async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...(config.NODE_ENV === "development"
        ? {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
            },
          }
        : {}),
    },
    // Generate unique request IDs for tracing
    genReqId: () => crypto.randomUUID(),
    // Strict body parsing
    ajv: {
      customOptions: {
        strict: false,
        coerceTypes: true,
        removeAdditional: true,
      },
    },
    // Tune for high throughput
    bodyLimit: 1024 * 64, // 64 KB max body
    connectionTimeout: 60_000,
    keepAliveTimeout: 30_000,
  });

  // ── Security headers ──────────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Let frontend handle CSP
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(",").map((o) => o.trim()),
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Correlation-ID"],
    exposedHeaders: ["X-Request-ID", "X-Correlation-ID"],
    credentials: true,
    maxAge: 86400,
  });

  // ── Compression ───────────────────────────────────────────────────────────
  await app.register(compress, { global: true, threshold: 1024 });

  // ── Rate limiting ─────────────────────────────────────────────────────────
  await app.register(rateLimit, {
    global: true,
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    // Stricter limit for AI chat endpoint
    keyGenerator: (request) => {
      const forwarded = request.headers["x-forwarded-for"];
      const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded?.split(",")[0] ?? request.ip;
      return ip;
    },
    errorResponseBuilder: () => ({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests — please slow down",
      },
    }),
    // More restrictive for the AI chat endpoint
    hook: "preHandler",
  });

  // ── Request logging middleware ────────────────────────────────────────────
  await app.register(requestLogger);

  // ── Global error handler ──────────────────────────────────────────────────
  app.setErrorHandler(errorHandler);

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: "/health" });
  await app.register(sessionRoutes, { prefix: "/api/sessions" });
  await app.register(chatRoutes, { prefix: "/api/chat" });
  await app.register(doctorRoutes, { prefix: "/api/doctors" });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.id,
      },
    });
  });

  return app;
}

async function start() {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  try {
    app = await buildApp();
    await app.listen({ port: config.PORT, host: config.HOST });
    app.log.info(`🏥 Navigator Agent backend running on port ${config.PORT}`);
    app.log.info(`📋 Health check: http://localhost:${config.PORT}/health`);
    app.log.info(`📊 Metrics: http://localhost:${config.PORT}/health/metrics`);
    app.log.info(`🤖 AI concurrency limit: ${config.MAX_CONCURRENT_AI_REQUESTS}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    app?.log.info(`Received ${signal} — shutting down gracefully`);
    try {
      await app?.close();
      app?.log.info("Server closed cleanly");
      process.exit(0);
    } catch (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
    process.exit(1);
  });
}

start();
