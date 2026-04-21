import { type FastifyInstance } from "fastify";
import { sessionStore } from "../db/sessions.js";
import { matchDoctors, detectUrgency } from "../services/matcher.js";
import { getNavigatorResponse, aiLimiter } from "../services/ai.js";
import { chatMessageSchema } from "../utils/schemas.js";
import {
  SessionExpiredError,
  ValidationError,
  AIServiceError,
} from "../utils/errors.js";

export async function chatRoutes(app: FastifyInstance) {
  app.post("/", async (request, reply) => {
    // 1. Validate Input
    const result = chatMessageSchema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0].message);
    }

    const { sessionId, message } = result.data;

    // 2. Retrieve Session
    const session = sessionStore.get(sessionId);
    if (!session) {
      throw new SessionExpiredError();
    }

    const { language, insurance } = session.preferences;

    /**
     * 3. Contextual Match
     * Retrieves doctors based on the full conversation history to maintain clinical anchoring.
     */
    // Note: matchDoctors returns DoctorMatch objects containing { doctor, score, confidencePct, matchReasons }
    const matches = matchDoctors(message, session.messages, { language, insurance });

    if (matches.length === 0) {
      throw new ValidationError("Please describe your symptoms so we can route you to the correct department.");
    }

    const primaryMatch = matches[0];
    const urgency = detectUrgency(message);

    // 4. Persist User Message to History
    sessionStore.addMessage(sessionId, {
      role: "user",
      content: message,
      timestamp: Date.now(),
    });

    // 5. Generate AI Response
    try {
      const aiResponse = await getNavigatorResponse(
        message,
        session.messages.slice(-10),
        primaryMatch.doctor, // Ensure we pass the doctor object
        language,
        insurance,
        urgency
      );

      // 6. Persist Assistant Message
      sessionStore.addMessage(sessionId, {
        role: "assistant",
        content: aiResponse.text,
        timestamp: Date.now(),
      });

      // 7. Response Payload
      return reply.send({
        sessionId,
        urgency,
        agentMessage: aiResponse.text,
        matches: matches.map((m, idx) => ({
          // CRITICAL: We must include these fields for DoctorCard.tsx
          confidencePct: m.confidencePct ?? 95, 
          matchReasons: m.matchReasons ?? [],
          isPrimary: idx === 0,
          doctor: {
            id: m.doctor.id,
            name: m.doctor.name,
            initials: m.doctor.initials,
            specialty: m.doctor.specialty,
            subspecialty: m.doctor.subspecialty,
            languages: m.doctor.languages,
            hospital: m.doctor.hospital,
            department: m.doctor.department,
            nextAvailable: m.doctor.nextAvailable,
            availableSlots: m.doctor.availableSlots,
            rating: m.doctor.rating,
            reviewCount: m.doctor.reviewCount,
            yearsExperience: m.doctor.yearsExperience,
            consultationFee: m.doctor.consultationFee,
            emergencySpecialist: m.doctor.emergencySpecialist,
            bio: m.doctor.bio
          }
        })),
        _meta: {
          inputTokens: aiResponse.usage.promptTokens,
          outputTokens: aiResponse.usage.completionTokens,
          durationMs: aiResponse.durationMs,
          concurrency: aiLimiter.stats(),
          sessionMessageCount: sessionStore.get(sessionId)?.messages.length ?? 0,
        },
      });
    } catch (err) {
      request.log.error({ err }, "AI service generation failure");
      throw new AIServiceError();
    }
  });

  app.delete("/:sessionId", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const session = sessionStore.get(sessionId);
    if (!session) throw new SessionExpiredError();
    
    session.messages = [];
    return reply.status(204).send();
  });
}