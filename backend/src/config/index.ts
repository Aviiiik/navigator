import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  // UPDATED: Now correctly validates your Gemini key
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  MAX_CONCURRENT_AI_REQUESTS: z.coerce.number().default(50),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(30_000),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;