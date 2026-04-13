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

function makeId() {
  return crypto.randomUUID();
}

export const useNavigatorStore = create<NavigatorState>((set, get) => ({
  sessionId: null,
  preferences: { language: "English", insurance: "Self-pay" },
  sessionLoading: false,
  messages: [],
  isThinking: false,
  streamingContent: "",
  lastUrgency: "normal",
  error: null,

  initSession: async () => {
    if (get().sessionId) return;
    set({ sessionLoading: true, error: null });
    try {
      const session = await api.createSession(get().preferences);
      set({ sessionId: session.sessionId, sessionLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to start session",
        sessionLoading: false,
      });
    }
  },

  setPreferences: async (prefs) => {
    const next = { ...get().preferences, ...prefs };
    set({ preferences: next });
    const { sessionId } = get();
    if (sessionId) {
      try {
        await api.updatePreferences(sessionId, next);
      } catch {
        // Preferences saved locally even if network fails
      }
    }
  },

  sendMessage: async (text) => {
    const { sessionId } = get();
    if (!sessionId) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };

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
        matches: response.matches,
      };

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isThinking: false,
        lastUrgency: response.urgency,
      }));
    } catch (err) {
      set({
        isThinking: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  },

  sendMessageStream: (text) => {
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
        const data = JSON.parse(event.data) as {
          type: string;
          chunk?: string;
          urgency?: Urgency;
          matches?: ChatMessage["matches"];
        };

        if (data.type === "matches") {
          // Add assistant placeholder card immediately with matches
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
        } else if (data.type === "text" && data.chunk) {
          accumulated += data.chunk;
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, isStreaming: true }
                : m
            ),
          }));
        } else if (data.type === "done") {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, isStreaming: false } : m
            ),
          }));
          es.close();
        } else if (data.type === "error") {
          set({ error: "AI service error — please retry" });
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      set({ isThinking: false, error: "Connection error — please retry" });
      es.close();
    };
  },

  clearError: () => set({ error: null }),

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
