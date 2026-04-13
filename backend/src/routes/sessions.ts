import { type FastifyInstance } from "fastify";
import { sessionStore } from "../db/sessions.js";
import { createSessionSchema, updatePreferencesSchema } from "../utils/schemas.js";
import { SessionExpiredError, ValidationError } from "../utils/errors.js";

export async function sessionRoutes(app: FastifyInstance) {
  // POST /api/sessions — create a new session
  app.post("/", async (request, reply) => {
    const result = createSessionSchema.safeParse(request.body);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const session = sessionStore.create(result.data);
    return reply.status(201).send({
      sessionId: session.id,
      preferences: session.preferences,
      createdAt: new Date(session.createdAt).toISOString(),
    });
  });

  // GET /api/sessions/:id — fetch session info
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const session = sessionStore.get(request.params.id);
    if (!session) throw new SessionExpiredError();
    return reply.send({
      sessionId: session.id,
      preferences: session.preferences,
      messageCount: session.messages.length,
      createdAt: new Date(session.createdAt).toISOString(),
      lastActivity: new Date(session.lastActivity).toISOString(),
    });
  });

  // PATCH /api/sessions/:id/preferences — update preferences mid-session
  app.patch<{ Params: { id: string } }>("/:id/preferences", async (request, reply) => {
    const result = updatePreferencesSchema.safeParse({
      ...(request.body as object),
      sessionId: request.params.id,
    });
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const ok = sessionStore.updatePreferences(request.params.id, result.data);
    if (!ok) throw new SessionExpiredError();

    const session = sessionStore.get(request.params.id)!;
    return reply.send({ preferences: session.preferences });
  });

  // DELETE /api/sessions/:id — explicit session teardown
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    sessionStore.delete(request.params.id);
    return reply.status(204).send();
  });
}
