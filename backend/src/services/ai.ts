import { GoogleGenerativeAI, Content } from "@google/generative-ai";
import { config } from "../config/index.js";
import { type Doctor } from "../db/doctors.js";
import { type Urgency } from "../services/matcher.js";
import { type Message } from "../db/sessions.js";

// Initialize Gemini 3 Flash
const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-3-flash-preview" 
});

/**
 * Manages API throughput to prevent hitting rate limits
 */
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

  /**
   * Returns current limiter state.
   * Required by health and chat routes for monitoring.
   */
  stats() {
    return { 
      running: this.running, 
      queued: this.queue.length,
      max: this.max 
    };
  }
}

export const aiLimiter = new ConcurrencyLimiter(config.MAX_CONCURRENT_AI_REQUESTS);

/**
 * Builds the system instruction tailored for superspeciality care and anchoring.
 */
function buildSystemPrompt(
  primaryDoctor: Doctor,
  language: string,
  insurance: string,
  urgency: Urgency
): string {
  return `You are a Senior Hospital Navigator — a clinical routing expert with deep empathy.

CURRENT CLINICAL LEAD:
- Primary Specialist: ${primaryDoctor.name}
- Department: ${primaryDoctor.specialty}
- Insurance Context: ${insurance}
- Urgency: ${urgency}

STRATEGIC INSTRUCTIONS:
1. ANCHORING: The user's case is primarily a ${primaryDoctor.specialty} matter. If they mention new symptoms (like fever, pain, or nausea), acknowledge them, but explain that ${primaryDoctor.name} is the best specialist to coordinate their overall care plan.
2. GREETING: If the user says "Hi" or "Hello", respond with: "Hello! Welcome to the Medical Navigator. I am here to help you find the right specialist for your needs. Could you please describe the symptoms or health concerns you are currently experiencing?"
3. COMPLEX CONDITIONS: For high-priority conditions like Cancer or Heart issues, maintain a tone of professional empathy. Highlight that ${primaryDoctor.name} has specific expertise in ${primaryDoctor.keywords.slice(0, 3).join(", ")}.
4. CRITICAL ESCALATION: If urgency is "critical", immediately advise the user to seek emergency intervention while noting that ${primaryDoctor.name} will be their lead consultant for follow-up care.
5. CONCISION: Keep responses warm but clinical. Max 4 sentences. Use ${language}.`;
}

export interface AIResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  durationMs: number;
}

/**
 * Fetches a clinical navigation response from the Gemini model.
 */
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

    // Map chat history to Gemini's format
    const contents: Content[] = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: contents,
      systemInstruction: {
        role: "system",
        parts: [{ text: buildSystemPrompt(primaryDoctor, language, insurance, urgency) }]
      },
    });

    try {
      const result = await chat.sendMessage(userMessage);
      const response = await result.response;

      return {
        text: response.text(),
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        durationMs: Date.now() - start,
      };
    } catch (error) {
      throw new Error("The Medical Navigator is temporarily unavailable. Please seek direct assistance.");
    }
  });
}