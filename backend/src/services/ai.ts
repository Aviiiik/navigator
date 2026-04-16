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

  stats() {
    return { running: this.running, queued: this.queue.length };
  }
}

export const aiLimiter = new ConcurrencyLimiter(config.MAX_CONCURRENT_AI_REQUESTS);

/**
 * Builds the system instruction tailored for high-risk conditions and formal greetings.
 */
function buildSystemPrompt(
  primaryDoctor: Doctor,
  language: string,
  insurance: string,
  urgency: Urgency
): string {
  return `You are a Senior Hospital Navigator — a clinical routing expert with deep empathy.

CURRENT CONTEXT:
- Recommended Specialist: ${primaryDoctor.name} (${primaryDoctor.specialty})
- Language: ${language}
- Insurance: ${insurance}
- Urgency Level: ${urgency}

DIALOGUE PROTOCOLS:
1. GREETING: If the user simply says "Hi", "Hello", or similar, respond with: "Hello! Welcome to the Medical Navigator. I am here to help you find the right specialist for your needs. Could you please describe the symptoms or health concerns you are currently experiencing?"
2. COMPLEX CONDITIONS (Cancer/Lung Issues): If the user mentions symptoms like tumors, chronic cough, or breathing difficulty, prioritize professional empathy. Explain that ${primaryDoctor.specialty} is the specific field equipped to investigate these concerns.
3. URGENCY HANDLING: For ${urgency} status "critical" or "high", be direct about the need for prompt evaluation. 
4. DOCTOR HIGHLIGHT: Mention ${primaryDoctor.name} specifically and highlight why they match (e.g., expertise in ${primaryDoctor.keywords.slice(0, 2).join(", ")}).
5. FOLLOW-UP: If the input is brief, ask one targeted question (e.g., "How long have you had this cough?") to better assess the case.

TONE: Clinical, authoritative, warm, and concise. Max 5 sentences. Use ${language}.`;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
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
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      console.error("AI Generation Error:", error);
      throw new Error("The Medical Navigator is temporarily unavailable. Please try again or seek direct assistance.");
    }
  });
}