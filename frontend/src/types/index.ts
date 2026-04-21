/**
 * Global Type Definitions for the Medical Navigator
 */

export type Urgency = "normal" | "high" | "critical";
export type Gender = "M" | "F";
export type Availability = "immediate" | "today" | "tomorrow" | "this_week";

/**
 * Represents a specific appointment slot for a doctor
 */
export interface TimeSlot {
  date: string;
  time: string;
  label: string;
}

/**
 * Core Doctor entity as returned by the discovery and chat services
 */
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

/**
 * Result of the clinical matching algorithm
 */
export interface DoctorMatch {
  doctor: Doctor;
  isPrimary: boolean;
  score?: number;          // Optional to handle variations in scaling logic
  confidencePct?: number;  // Optional to prevent UI crashes if missing
  matchReasons?: string[];
}

/**
 * Standard response from the /api/chat endpoint
 */
export interface ChatResponse {
  sessionId: string;
  urgency: Urgency;
  agentMessage: string;
  matches: DoctorMatch[];
  _meta?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
    concurrency: { 
      running: number; 
      queued: number;
      max: number; 
    };
    sessionMessageCount: number;
  };
}

/**
 * Active session state
 */
export interface Session {
  sessionId: string;
  preferences: Preferences;
  createdAt: string;
}

/**
 * User-defined routing preferences
 */
export interface Preferences {
  language: string;
  insurance: string;
  genderPreference?: string;
}

/**
 * Confirmed booking record
 */
export interface Booking {
  bookingId: string;
  doctor: { 
    id: string; 
    name: string; 
    specialty: string; 
    hospital: string 
  };
  slot: TimeSlot;
  patient: { 
    name: string; 
    phone: string 
  };
  insurance: string;
  status: string;
  bookedAt: string;
  instructions: string[];
}

/**
 * UI-layer message for the conversation thread
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  urgency?: Urgency;
  matches?: DoctorMatch[];
  isStreaming?: boolean;
}