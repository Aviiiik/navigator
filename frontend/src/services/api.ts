import axios, { type AxiosError } from "axios";
import type {
  Session,
  Preferences,
  ChatResponse,
  Doctor,
  Booking,
} from "../types/index.js";

// --- Configuration ---
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 35_000,
  headers: { "Content-Type": "application/json" },
});

// --- Interceptors ---

/**
 * Request interceptor: Attaches a unique Correlation ID to every request.
 * Useful for tracing logs from the frontend through to the backend.
 */
api.interceptors.request.use((config) => {
  config.headers["X-Correlation-ID"] = crypto.randomUUID();
  return config;
});

/**
 * Response interceptor: Unwraps error messages.
 * This ensures that if the backend throws a ValidationError or AIServiceError,
 * the frontend gets the specific message (e.g., "Too many requests") 
 * instead of a generic "Request failed with status code 503".
 */
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ error: { code: string; message: string } }>) => {
    const msg =
      error.response?.data?.error?.message ??
      error.message ??
      "Network error - The Medical Navigator is currently unavailable.";
    return Promise.reject(new Error(msg));
  }
);

// --- 1. Session Management ---

/** * Creates a new hospital navigator session with user preferences.
 */
export async function createSession(prefs: Partial<Preferences>): Promise<Session> {
  const res = await api.post<Session>("/sessions", prefs);
  return res.data;
}

/** * Retrieves an existing session by ID to restore state.
 */
export async function getSession(sessionId: string): Promise<Session> {
  const res = await api.get<Session>(`/sessions/${sessionId}`);
  return res.data;
}

/** * Updates patient preferences mid-session.
 */
export async function updatePreferences(
  sessionId: string,
  prefs: Partial<Preferences>
): Promise<{ preferences: Preferences }> {
  const res = await api.patch<{ preferences: Preferences }>(
    `/sessions/${sessionId}/preferences`,
    prefs
  );
  return res.data;
}

// --- 2. Chat Interaction ---

/** * Sends a message to the AI Navigator.
 * The backend now utilizes cumulative history to maintain anchoring.
 */
export async function sendMessage(
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  const res = await api.post<ChatResponse>("/chat", { sessionId, message });
  return res.data;
}

/** * Returns an EventSource for real-time token streaming.
 * Note: Browser EventSource API does not support custom headers natively.
 */
export function createChatStream(sessionId: string, message: string): EventSource {
  const params = new URLSearchParams({ sessionId, message });
  return new EventSource(`/api/chat/stream?${params}`);
}

// --- 3. Doctor Discovery & Booking ---

export interface DoctorListResponse {
  total: number;
  limit: number;
  offset: number;
  doctors: Doctor[];
}

/** * Lists doctors based on various filters.
 */
export async function listDoctors(filters?: {
  specialty?: string;
  language?: string;
  insurance?: string;
  gender?: string;
  availability?: string;
  limit?: number;
  offset?: number;
}): Promise<DoctorListResponse> {
  const res = await api.get<DoctorListResponse>("/doctors", { params: filters });
  return res.data;
}

/** * Retrieves full details for a specific doctor.
 */
export async function getDoctor(id: string): Promise<{ doctor: Doctor }> {
  const res = await api.get<{ doctor: Doctor }>(`/doctors/${id}`);
  return res.data;
}

/** * Books an appointment slot.
 * Now references the sessionId to pull patient insurance and context.
 */
export async function bookAppointment(payload: {
  sessionId: string;
  doctorId: string;
  slotIndex: number;
  patientName: string;
  patientPhone: string;
}): Promise<{ booking: Booking }> {
  const res = await api.post<{ booking: Booking }>("/doctors/book", payload);
  return res.data;
}