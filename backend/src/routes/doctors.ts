import { type FastifyInstance } from "fastify";
import { DOCTORS, DOCTOR_BY_ID } from "../db/doctors.js";
import { sessionStore } from "../db/sessions.js";
import { doctorFilterSchema, bookingSchema } from "../utils/schemas.js";
import {
  NotFoundError,
  ValidationError,
  SessionExpiredError,
} from "../utils/errors.js";
import { v4 as uuidv4 } from "uuid";

export async function doctorRoutes(app: FastifyInstance) {
  // GET /api/doctors — list with optional filters
  app.get("/", async (request, reply) => {
    const result = doctorFilterSchema.safeParse(request.query);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const { specialty, language, insurance, gender, availability, limit, offset } =
      result.data;

    let filtered = DOCTORS;

    if (specialty) {
      const q = specialty.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.specialty.toLowerCase().includes(q) ||
          d.subspecialty.toLowerCase().includes(q)
      );
    }
    if (language) {
      filtered = filtered.filter((d) => d.languages.includes(language));
    }
    if (insurance) {
      filtered = filtered.filter(
        (d) =>
          d.insuranceAccepted.includes(insurance) ||
          d.insuranceAccepted.includes("All insurance accepted")
      );
    }
    if (gender) {
      filtered = filtered.filter((d) => d.gender === gender);
    }
    if (availability) {
      const order = ["immediate", "today", "tomorrow", "this_week"];
      const maxIdx = order.indexOf(availability);
      filtered = filtered.filter(
        (d) => order.indexOf(d.nextAvailable) <= maxIdx
      );
    }

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit).map(sanitizeDoctor);

    return reply.send({ total, limit, offset, doctors: page });
  });

  // GET /api/doctors/:id — doctor detail
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const doctor = DOCTOR_BY_ID.get(request.params.id);
    if (!doctor) throw new NotFoundError(`Doctor not found: ${request.params.id}`);
    return reply.send({ doctor: sanitizeDoctor(doctor) });
  });

  // POST /api/doctors/book — book an appointment slot
  app.post("/book", async (request, reply) => {
    const result = bookingSchema.safeParse(request.body);
    if (!result.success) throw new ValidationError(result.error.issues[0].message);

    const { sessionId, doctorId, slotIndex, patientName, patientPhone } = result.data;

    const session = sessionStore.get(sessionId);
    if (!session) throw new SessionExpiredError();

    const doctor = DOCTOR_BY_ID.get(doctorId);
    if (!doctor) throw new NotFoundError(`Doctor not found: ${doctorId}`);

    const slot = doctor.availableSlots[slotIndex];
    if (!slot) {
      throw new ValidationError(
        `Slot index ${slotIndex} not available. Doctor has ${doctor.availableSlots.length} slot(s).`
      );
    }

    // In production: persist booking to DB, send SMS/email confirmation
    const bookingId = uuidv4();
    const booking = {
      bookingId,
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        hospital: doctor.hospital,
        department: doctor.department,
      },
      slot,
      patient: { name: patientName, phone: patientPhone },
      insurance: session.preferences.insurance,
      status: "confirmed",
      bookedAt: new Date().toISOString(),
      instructions: [
        "Please arrive 15 minutes early",
        "Bring your insurance card and a photo ID",
        "Carry any previous medical records or test reports",
        doctor.consultationFee > 0
          ? `Consultation fee: ₹${doctor.consultationFee}`
          : "No consultation fee for emergency",
      ],
    };

    request.log.info(
      { bookingId, doctorId, slotIndex, patientPhone },
      "Appointment booked"
    );

    return reply.status(201).send({ booking });
  });
}

// Strip internal-only fields before sending to client
function sanitizeDoctor(d: (typeof DOCTORS)[number]) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { keywords, ...safe } = d;
  return safe;
}
