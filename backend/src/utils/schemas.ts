import { z } from "zod";

export const createSessionSchema = z.object({
  language: z.string().min(1).max(50).default("English"),
  insurance: z.string().min(1).max(100).default("Self-pay"),
  genderPreference: z.enum(["M", "F", "any"]).optional(),
});

export const chatMessageSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  message: z
    .string()
    .min(2, "Message too short")
    .max(1000, "Message too long — please be more concise"),
});

export const updatePreferencesSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  language: z.string().min(1).max(50).optional(),
  insurance: z.string().min(1).max(100).optional(),
  genderPreference: z.enum(["M", "F", "any"]).optional(),
});

export const bookingSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  doctorId: z.string().min(1),
  slotIndex: z.number().int().min(0),
  patientName: z.string().min(2).max(100),
  patientPhone: z.string().regex(/^\+?[0-9]{8,15}$/, "Invalid phone number"),
});

export const doctorFilterSchema = z.object({
  specialty: z.string().optional(),
  language: z.string().optional(),
  insurance: z.string().optional(),
  gender: z.enum(["M", "F"]).optional(),
  availability: z.enum(["immediate", "today", "tomorrow", "this_week"]).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
export type DoctorFilterInput = z.infer<typeof doctorFilterSchema>;
