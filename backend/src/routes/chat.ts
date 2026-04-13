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
  // POST /api/chat — send a message, get AI response + matched doctors
  app.post("/", async (request, reply) => {
    const result = chatMessageSchema.safeParse(request.body);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const { sessionId, message } = result.data;

    const session = sessionStore.get(sessionId);
    if (!session) throw new SessionExpiredError();

    const { language, insurance, genderPreference } = session.preferences;

    // 1. Detect urgency
    const urgency = detectUrgency(message);

    // 2. Match doctors
    const matches = matchDoctors(
      { symptoms: message, language, insurance, genderPreference, urgency },
      3
    );

    if (matches.length === 0) {
      throw new ValidationError("Could not match any doctors. Please describe your symptoms.");
    }

    const primaryMatch = matches[0];

    // 3. Persist user message
    sessionStore.addMessage(sessionId, {
      role: "user",
      content: message,
      timestamp: Date.now(),
    });

    // 4. Call AI
    let aiText: string;
    let aiMeta: { inputTokens: number; outputTokens: number; durationMs: number };
    try {
      const aiResponse = await getNavigatorResponse(
        message,
        session.messages.slice(-10), // last 5 turns for context
        primaryMatch.doctor,
        language,
        insurance,
        urgency
      );
      aiText = aiResponse.text;
      aiMeta = {
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        durationMs: aiResponse.durationMs,
      };
    } catch (err) {
      request.log.error({ err }, "AI service error");
      throw new AIServiceError();
    }

    // 5. Persist assistant message
    sessionStore.addMessage(sessionId, {
      role: "assistant",
      content: aiText,
      timestamp: Date.now(),
    });

    // 6. Shape response
    return reply.send({
      sessionId,
      urgency,
      agentMessage: aiText,
      matches: matches.map((m) => ({
        doctor: {
          id: m.doctor.id,
          name: m.doctor.name,
          initials: m.doctor.initials,
          specialty: m.doctor.specialty,
          subspecialty: m.doctor.subspecialty,
          gender: m.doctor.gender,
          languages: m.doctor.languages,
          insuranceAccepted: m.doctor.insuranceAccepted,
          availableSlots: m.doctor.availableSlots,
          nextAvailable: m.doctor.nextAvailable,
          rating: m.doctor.rating,
          reviewCount: m.doctor.reviewCount,
          yearsExperience: m.doctor.yearsExperience,
          qualifications: m.doctor.qualifications,
          hospital: m.doctor.hospital,
          department: m.doctor.department,
          bio: m.doctor.bio,
          consultationFee: m.doctor.consultationFee,
          acceptsWalkIn: m.doctor.acceptsWalkIn,
          emergencySpecialist: m.doctor.emergencySpecialist,
        },
        score: m.score,
        confidencePct: m.confidencePct,
        matchReasons: m.matchReasons,
        isPrimary: m === matches[0],
      })),
      _meta: {
        ...aiMeta,
        concurrency: aiLimiter.stats(),
        sessionMessageCount: sessionStore.get(sessionId)?.messages.length ?? 0,
      },
    });
  });

  // GET /api/chat/stream?sessionId=&message= — SSE streaming variant
  app.get<{ Querystring: { sessionId: string; message: string } }>(
    "/stream",
    async (request, reply) => {
      const { sessionId, message } = request.query;

      if (!sessionId || !message) {
        throw new ValidationError("sessionId and message are required");
      }

      const session = sessionStore.get(sessionId);
      if (!session) throw new SessionExpiredError();

      const { language, insurance, genderPreference } = session.preferences;
      const urgency = detectUrgency(message);
      const matches = matchDoctors(
        { symptoms: message, language, insurance, genderPreference, urgency },
        3
      );

      if (matches.length === 0) throw new ValidationError("No doctors matched");

      sessionStore.addMessage(sessionId, {
        role: "user",
        content: message,
        timestamp: Date.now(),
      });

      reply.raw.setHeader("Content-Type", "text/event-stream");
      reply.raw.setHeader("Cache-Control", "no-cache");
      reply.raw.setHeader("Connection", "keep-alive");
      reply.raw.setHeader("X-Accel-Buffering", "no");

      // Send matches immediately before AI starts
      const matchPayload = JSON.stringify({
        type: "matches",
        urgency,
        matches: matches.map((m) => ({
          doctor: {
            id: m.doctor.id,
            name: m.doctor.name,
            initials: m.doctor.initials,
            specialty: m.doctor.specialty,
            subspecialty: m.doctor.subspecialty,
            gender: m.doctor.gender,
            languages: m.doctor.languages,
            insuranceAccepted: m.doctor.insuranceAccepted,
            availableSlots: m.doctor.availableSlots,
            nextAvailable: m.doctor.nextAvailable,
            rating: m.doctor.rating,
            reviewCount: m.doctor.reviewCount,
            yearsExperience: m.doctor.yearsExperience,
            qualifications: m.doctor.qualifications,
            hospital: m.doctor.hospital,
            bio: m.doctor.bio,
            consultationFee: m.doctor.consultationFee,
            acceptsWalkIn: m.doctor.acceptsWalkIn,
            emergencySpecialist: m.doctor.emergencySpecialist,
          },
          score: m.score,
          confidencePct: m.confidencePct,
          matchReasons: m.matchReasons,
          isPrimary: m === matches[0],
        })),
      });
      reply.raw.write(`data: ${matchPayload}\n\n`);

      // Stream AI text chunks
      let fullText = "";
      try {
        const { streamNavigatorResponse } = await import("../services/ai.js");
        for await (const chunk of streamNavigatorResponse(
          message,
          session.messages.slice(-10),
          matches[0].doctor,
          language,
          insurance,
          urgency
        )) {
          fullText += chunk;
          reply.raw.write(`data: ${JSON.stringify({ type: "text", chunk })}\n\n`);
        }
      } catch (err) {
        request.log.error({ err }, "Stream AI error");
        reply.raw.write(
          `data: ${JSON.stringify({ type: "error", message: "AI service error" })}\n\n`
        );
      }

      // Persist assistant message
      if (fullText) {
        sessionStore.addMessage(sessionId, {
          role: "assistant",
          content: fullText,
          timestamp: Date.now(),
        });
      }

      reply.raw.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      reply.raw.end();
    }
  );
}
