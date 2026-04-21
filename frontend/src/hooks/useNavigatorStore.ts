import { create } from "zustand";
import type { ChatMessage, Preferences, Urgency } from "../types/index.js";
import * as api from "../services/api.js";

interface NavigatorState {
  // Session
  sessionId: string | null;
  preferences: Preferences;
  sessionLoading: boolean;

  // Chat
  messages: ChatMessage[];
  isThinking: boolean;
  streamingContent: string;
  lastUrgency: Urgency;
  error: string | null;

  // Actions
  initSession: () => Promise<void>;
  setPreferences: (prefs: Partial<Preferences>) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendMessageStream: (text: string) => void;
  clearError: () => void;
  reset: () => void;
}

/**
 * Generates a unique ID for frontend-side message tracking
 */
function makeId() {
  return crypto.randomUUID();
}

export const useNavigatorStore = create<NavigatorState>((set, get) => ({
  // Initial State
  sessionId: null,
  preferences: { language: "English", insurance: "Self-pay" },
  sessionLoading: false,
  messages: [],
  isThinking: false,
  streamingContent: "",
  lastUrgency: "normal",
  error: null,

  /**
   * Initializes a new session if one does not exist.
   */
  initSession: async () => {
    if (get().sessionId) return;
    set({ sessionLoading: true, error: null });
    try {
      const session = await api.createSession(get().preferences);
      set({ sessionId: session.sessionId, sessionLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to start clinical session",
        sessionLoading: false,
      });
    }
  },

  /**
   * Updates user preferences (language/insurance) and syncs with backend.
   */
  setPreferences: async (prefs) => {
    const next = { ...get().preferences, ...prefs };
    set({ preferences: next });
    const { sessionId } = get();
    if (sessionId) {
      try {
        await api.updatePreferences(sessionId, next);
      } catch {
        // Silently fail preference sync; local state is maintained
      }
    }
  },

  /**
   * Standard Message: Sends a symptom and waits for the full AI response.
   * Utilizes context-aware matching from the backend.
   */
  sendMessage: async (text: string) => {
    const { sessionId } = get();
    if (!sessionId) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    // Update UI immediately to show user input
    set((s) => ({
      messages: [...s.messages, userMsg],
      isThinking: true,
      error: null,
    }));

    try {
      const response = await api.sendMessage(sessionId, text);

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        content: response.agentMessage,
        timestamp: Date.now(),
        urgency: response.urgency,
        matches: response.matches, // Matches are now anchored to primary condition
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isThinking: false,
        lastUrgency: response.urgency,
      }));
    } catch (err) {
      // Ensure 'isThinking' is reset even on error to prevent UI hang
      set({
        isThinking: false,
        error: err instanceof Error ? err.message : "The Medical Navigator is temporarily unavailable.",
      });
    }
  },

  /**
   * Streaming Message: Real-time token streaming for faster perceived response time.
   */
  sendMessageStream: (text: string) => {
    const { sessionId } = get();
    if (!sessionId) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

    const assistantId = makeId();

    set((s) => ({
      messages: [...s.messages, userMsg],
      isThinking: true,
      streamingContent: "",
      error: null,
    }));

    const es = api.createChatStream(sessionId, text);
    let accumulated = "";

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // First event usually contains matched doctors
        if (data.type === "matches") {
          const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            timestamp: Date.now(),
            urgency: data.urgency,
            matches: data.matches,
            isStreaming: true,
          };
          set((s) => ({
            messages: [...s.messages, assistantMsg],
            isThinking: false,
            lastUrgency: data.urgency ?? "normal",
          }));
        } 
        // Subsequent events contain text chunks
        else if (data.type === "text" && data.chunk) {
          accumulated += data.chunk;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, isStreaming: true }
                : m
            ),
          }));
        } 
        else if (data.type === "done") {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            ),
          }));
          es.close();
        } 
        else if (data.type === "error") {
          set({ isThinking: false, error: "AI service error — please retry" });
          es.close();
        }
      } catch {
        // Handle malformed JSON chunks gracefully
      }
    };

    es.onerror = () => {
      set({ isThinking: false, error: "Connection to Navigator lost — please retry" });
      es.close();
    };
  },

  clearError: () => set({ error: null }),

  /**
   * Fully resets the session and conversation history.
   */
  reset: () =>
    set({
      sessionId: null,
      messages: [],
      isThinking: false,
      streamingContent: "",
      lastUrgency: "normal",
      error: null,
    }),
}));