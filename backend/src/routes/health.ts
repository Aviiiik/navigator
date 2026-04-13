import { type FastifyInstance } from "fastify";
import { sessionStore } from "../db/sessions.js";
import { aiLimiter } from "../services/ai.js";
import { DOCTORS } from "../db/doctors.js";

const startTime = Date.now();

export async function healthRoutes(app: FastifyInstance) {
  // GET /health — liveness check (load balancer friendly)
  app.get("/", async (_request, reply) => {
    return reply.send({ status: "ok", timestamp: new Date().toISOString() });
  });

  // GET /health/ready — readiness check (verify dependencies)
  app.get("/ready", async (_request, reply) => {
    const checks = {
      database: DOCTORS.length > 0 ? "ok" : "empty",
      sessions: "ok",
    };
    const healthy = Object.values(checks).every((v) => v === "ok");
    return reply
      .status(healthy ? 200 : 503)
      .send({ status: healthy ? "ready" : "degraded", checks });
  });

  // GET /health/metrics — internal metrics (should be protected in prod)
  app.get("/metrics", async (_request, reply) => {
    const mem = process.memoryUsage();
    return reply.send({
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        rss: formatBytes(mem.rss),
        heapUsed: formatBytes(mem.heapUsed),
        heapTotal: formatBytes(mem.heapTotal),
      },
      sessions: sessionStore.stats(),
      aiConcurrency: aiLimiter.stats(),
      doctors: { total: DOCTORS.length },
      node: process.version,
    });
  });
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
