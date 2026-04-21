import { v4 as uuidv4 } from "uuid";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  messages: Message[];
  preferences: {
    language: string;
    insurance: string;
    genderPreference?: string;
  };
  createdAt: number;
  lastActivity: number;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // cleanup every 5 minutes
const MAX_SESSIONS = 100_000;
const MAX_MESSAGES_PER_SESSION = 50;

class SessionStore {
  private sessions = new Map<string, Session>();
  private cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Don't block process exit
    this.cleanupTimer.unref();
  }

  create(preferences: Session["preferences"]): Session {
    if (this.sessions.size >= MAX_SESSIONS) {
      // Evict oldest session
      const oldest = [...this.sessions.entries()].sort(
        ([, a], [, b]) => a.lastActivity - b.lastActivity
      )[0];
      if (oldest) this.sessions.delete(oldest[0]);
    }

    const session: Session = {
      id: uuidv4(),
      messages: [],
      preferences,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    if (Date.now() - session.lastActivity > SESSION_TTL_MS) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  addMessage(sessionId: string, message: Message): boolean {
    const session = this.get(sessionId);
    if (!session) return false;
    // Trim history to prevent context window blowout
    if (session.messages.length >= MAX_MESSAGES_PER_SESSION) {
      session.messages.splice(0, Math.min(2, session.messages.length));
    }
    session.messages.push(message);
    session.lastActivity = Date.now();
    return true;
  }

  updatePreferences(sessionId: string, prefs: Partial<Session["preferences"]>): boolean {
    const session = this.get(sessionId);
    if (!session) return false;
    session.preferences = { ...session.preferences, ...prefs };
    session.lastActivity = Date.now();
    return true;
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > SESSION_TTL_MS) {
        this.sessions.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      console.log(`[SessionStore] Cleaned up ${removed} expired sessions. Active: ${this.sessions.size}`);
    }
  }

  stats() {
    return { activeSessions: this.sessions.size, maxSessions: MAX_SESSIONS };
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
  }
}

// Singleton
export const sessionStore = new SessionStore();
