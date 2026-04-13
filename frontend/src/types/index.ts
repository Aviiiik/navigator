export type Urgency = "normal" | "high" | "critical";
export type Gender = "M" | "F";
export type Availability = "immediate" | "today" | "tomorrow" | "this_week";

export interface TimeSlot {
  date: string;
  time: string;
  label: string;
}

export interface Doctor {
  id: string;
  name: string;
  initials: string;
  specialty: string;
  subspecialty: string;
  gender: Gender;
  languages: string[];
  insuranceAccepted: string[];
  availableSlots: TimeSlot[];
  nextAvailable: Availability;
  rating: number;
  reviewCount: number;
  yearsExperience: number;
  qualifications: string[];
  hospital: string;
  department: string;
  bio: string;
  consultationFee: number;
  acceptsWalkIn: boolean;
  emergencySpecialist: boolean;
}

export interface DoctorMatch {
  doctor: Doctor;
  score: number;
  confidencePct: number;
  matchReasons: string[];
  isPrimary: boolean;
}

export interface ChatResponse {
  sessionId: string;
  urgency: Urgency;
  agentMessage: string;
  matches: DoctorMatch[];
  _meta?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    concurrency: { running: number; queued: number };
    sessionMessageCount: number;
  };
}

export interface Session {
  sessionId: string;
  preferences: Preferences;
  createdAt: string;
}

export interface Preferences {
  language: string;
  insurance: string;
  genderPreference?: string;
}

export interface Booking {
  bookingId: string;
  doctor: { id: string; name: string; specialty: string; hospital: string };
  slot: TimeSlot;
  patient: { name: string; phone: string };
  insurance: string;
  status: string;
  bookedAt: string;
  instructions: string[];
}

// UI-layer chat message
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  urgency?: Urgency;
  matches?: DoctorMatch[];
  isStreaming?: boolean;
}
