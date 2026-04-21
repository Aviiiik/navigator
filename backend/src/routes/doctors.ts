import { type FastifyInstance } from "fastify";
import { DOCTORS, DOCTOR_BY_ID } from "../db/doctors.js";
import { sessionStore } from "../db/sessions.js";
import { bookingSchema, doctorFilterSchema } from "../utils/schemas.js";
import { NotFoundError, ValidationError, SessionExpiredError } from "../utils/errors.js";
import { v4 as uuidv4 } from "uuid";

export async function doctorRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    const result = doctorFilterSchema.safeParse(request.query);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const { specialty, language, insurance, gender, availability, limit, offset } = result.data;

    let filtered = DOCTORS;
    if (specialty) filtered = filtered.filter((d) => d.specialty.toLowerCase().includes(specialty.toLowerCase()));
    if (language) filtered = filtered.filter((d) => d.languages.some((l) => l.toLowerCase() === language.toLowerCase()));
    if (insurance) filtered = filtered.filter((d) => d.insuranceAccepted.some((i) => i.toLowerCase() === insurance.toLowerCase()) || d.insuranceAccepted.includes("All"));
    if (gender) filtered = filtered.filter((d) => d.gender === gender);
    if (availability) filtered = filtered.filter((d) => d.nextAvailable === availability);

    return reply.send({
      total: filtered.length,
      limit,
      offset,
      doctors: filtered.slice(offset, offset + limit),
    });
  });

  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const doctor = DOCTOR_BY_ID.get(request.params.id);
    if (!doctor) throw new NotFoundError("Doctor not found");
    return reply.send({ doctor });
  });

  app.post("/book", async (request, reply) => {
    const result = bookingSchema.safeParse(request.body);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const { sessionId, doctorId, slotIndex, patientName, patientPhone } = result.data;
    const session = sessionStore.get(sessionId);
    if (!session) throw new SessionExpiredError();

    const doctor = DOCTOR_BY_ID.get(doctorId);
    if (!doctor) throw new NotFoundError("Doctor not found");

    const slot = doctor.availableSlots[slotIndex];
    if (!slot) throw new ValidationError("Selected slot is no longer available");

    return reply.status(201).send({
      booking: {
        bookingId: uuidv4(),
        status: "confirmed",
        doctor: {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          hospital: doctor.hospital,
        },
        slot,
        patient: { name: patientName, phone: patientPhone },
        insurance: session.preferences.insurance,
        bookedAt: new Date().toISOString(),
        instructions: [
          "Please arrive 15 minutes before your appointment.",
          "Bring a valid government-issued photo ID.",
          "Carry your insurance card and any prior medical records.",
        ],
      },
    });
  });
}
