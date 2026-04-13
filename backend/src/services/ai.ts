import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { config } from "../config/index.js";
import { type Doctor } from "../db/doctors.js";
import { type Urgency } from "../services/matcher.js";
import { type Message } from "../db/sessions.js";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview" 
});

// backend/src/services/ai.ts

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private max: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  // ADD THIS METHOD BACK
  stats() {
    return { running: this.running, queued: this.queue.length };
  }
}

export const aiLimiter = new ConcurrencyLimiter(config.MAX_CONCURRENT_AI_REQUESTS);

function buildSystemPrompt(
  primaryDoctor: Doctor,
  language: string,
  insurance: string,
  urgency: Urgency
): string {
  return `You are a hospital Navigator Agent — a compassionate, expert medical routing assistant.

CONTEXT:
- Primary recommended specialist: ${primaryDoctor.name} (${primaryDoctor.specialty})
- Patient language preference: ${language}
- Patient insurance: ${insurance}
- Detected urgency: ${urgency}

YOUR ROLE:
1. Acknowledge symptoms with empathy.
2. Explain recommendation for ${primaryDoctor.specialty}.
3. Mention the doctor by name.
4. Handle urgency (critical/high).
5. If the user input is very short (one word), ask a brief follow-up question.
6. Close with one practical next step.

TONE: Warm, clear, concise. Max 4-6 sentences.`;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export async function getNavigatorResponse(
  userMessage: string,
  history: Message[],
  primaryDoctor: Doctor,
  language: string,
  insurance: string,
  urgency: Urgency
): Promise<AIResponse> {
  return aiLimiter.run(async () => {
    const start = Date.now();

    // Map history to Gemini format (user/model)
    const contents: Content[] = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // FIX: Passing systemInstruction as a structured Content object
    const chat = model.startChat({
      history: contents,
      systemInstruction: {
        role: "system",
        parts: [{ text: buildSystemPrompt(primaryDoctor, language, insurance, urgency) }]
      },
    });

    const result = await chat.sendMessage(userMessage);
    const response = await result.response;

    return {
      text: response.text(),
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      durationMs: Date.now() - start,
    };
  });
}
////