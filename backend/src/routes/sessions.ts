import { type FastifyInstance } from "fastify";
import { sessionStore } from "../db/sessions.js";
import { createSessionSchema, updatePreferencesSchema } from "../utils/schemas.js";
import { SessionExpiredError, ValidationError } from "../utils/errors.js";

export async function sessionRoutes(app: FastifyInstance) {
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

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const session = sessionStore.get(request.params.id);
    if (!session) throw new SessionExpiredError();
    return reply.send(session);
  });

  app.patch<{ Params: { id: string } }>("/:id/preferences", async (request, reply) => {
    const session = sessionStore.get(request.params.id);
    if (!session) throw new SessionExpiredError();

    const result = updatePreferencesSchema.omit({ sessionId: true }).safeParse(request.body);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    sessionStore.updatePreferences(request.params.id, result.data);
    return reply.send({ preferences: sessionStore.get(request.params.id)!.preferences });
  });

  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    sessionStore.delete(request.params.id);
    return reply.status(204).send();
  });
}