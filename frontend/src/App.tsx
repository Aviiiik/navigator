import { useEffect, useState, useRef } from "react";
import { Message } from "./components/Message";
import { useNavigatorStore } from "./hooks/useNavigatorStore";
import { MessageSquare, Send, Stethoscope, ChevronDown } from "lucide-react";

export default function App() {
  const { messages, initSession, sendMessage, isThinking } = useNavigatorStore();
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize session and set the initial Nurse greeting
  useEffect(() => {
    initSession();
    
    // Add the initial Nurse greeting to the store if it's empty
    // This ensures the user is welcomed as soon as they open the app
    if (messages.length === 0) {
      useNavigatorStore.setState({
        messages: [{
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Hello! Welcome to the Medical Navigator. I am here to help you find the right specialist for your needs. Could you please describe the symptoms or health concerns you are currently experiencing?",
          timestamp: Date.now()
        }]
      });
    }
  }, [initSession]);

  // Auto-scroll to bottom whenever messages or thinking state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <>
      <style>{`
        :root {
          --primary-blue: #2563eb;
          --user-bubble: #2563eb;
          --assistant-bubble: #ffffff;
          --bg-chat: #f1f5f9;
          --text-main: #1e293b;
          --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }

        *, *::before, *::after { box-sizing: border-box; }

        .medical-nav-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Floating Trigger Button */
        .fab-trigger {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: var(--primary-blue);
          color: white;
          border: none;
          border-radius: 50px;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: transform 0.2s ease, opacity 0.2s ease;
          z-index: 999;
        }
        .fab-trigger:hover { transform: scale(1.05); }
        .fab-trigger.hidden { opacity: 0; pointer-events: none; }

        /* Chat Widget Container */
        .chat-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 440px;
          height: 750px;
          max-height: 85vh;
          background: white;
          border-radius: 20px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: translateY(20px) scale(0.95);
          opacity: 0;
          pointer-events: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1000;
        }
        .chat-widget.open {
          transform: translateY(0) scale(1);
          opacity: 1;
          pointer-events: all;
        }

        /* Header */
        .chat-header {
          background: var(--primary-blue);
          padding: 16px 20px;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-brand { display: flex; gap: 12px; align-items: center; }
        .brand-icon { background: rgba(255,255,255,0.2); padding: 8px; border-radius: 12px; }
        .chat-header h2 { font-size: 1rem; margin: 0; font-weight: 600; }
        .status-indicator { font-size: 0.75rem; opacity: 0.9; display: flex; align-items: center; gap: 4px; }
        .status-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; }

        .close-btn { background: transparent; border: none; color: white; cursor: pointer; }

        /* Conversational Window */
        .chat-window {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: var(--bg-chat);
          display: flex;
          flex-direction: column;
        }

        /* Conversation Rows */
        .message-row { display: flex; gap: 10px; margin-bottom: 20px; max-width: 90%; }
        .message-row--user { flex-direction: row-reverse; align-self: flex-end; margin-left: auto; }
        .message-row--assistant { align-self: flex-start; }

        /* Avatars & Labels */
        .avatar-container { display: flex; flex-direction: column; align-items: center; min-width: 55px; }
        .message-avatar {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }
        .avatar--user { background: #cbd5e1; color: #475569; }
        .avatar--assistant { background: var(--primary-blue); color: white; }
        .avatar-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; margin-top: 4px; }

        /* Bubbles */
        .chat-bubble { padding: 12px 16px; border-radius: 18px; font-size: 0.95rem; line-height: 1.5; }
        .message-row--user .chat-bubble { background: var(--user-bubble); color: white; border-bottom-right-radius: 4px; }
        .message-row--assistant .chat-bubble { background: var(--assistant-bubble); color: #1e293b; border-bottom-left-radius: 4px; border: 1px solid #e2e8f0; }

        /* Doctor Card Grid Fix */
        .doctor-card { background: white; border-radius: 16px; padding: 16px; margin-top: 12px; border: 1px solid #e2e8f0; width: 100%; box-sizing: border-box; }
        .doctor-card--primary { border: 2px solid var(--primary-blue); }
        .doctor-card__badge { background: var(--primary-blue); color: white; font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 4px; margin-bottom: 12px; display: inline-block; }
        .doctor-card__header { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; }
        .doctor-card__avatar { width: 40px; height: 40px; background: #eff6ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: var(--primary-blue); }
        .doctor-card__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 12px; }
        .doc-stat { display: flex; flex-direction: column; }
        .doc-stat__label { font-size: 9px; color: #94a3b8; font-weight: 700; text-transform: uppercase; display: flex; align-items: center; gap: 4px; }
        .doc-stat__value { font-size: 12px; font-weight: 500; color: #334155; }
        .doc-stat__value--avail { color: #059669; font-weight: 700; }
        .reason-tag { display: inline-block; background: #f0fdf4; color: #166534; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin: 4px 4px 0 0; border: 1px solid #bbf7d0; }

        /* Input Area */
        .chat-input-area { padding: 16px; background: white; border-top: 1px solid #e2e8f0; }
        .input-wrapper { display: flex; background: #f1f5f9; border-radius: 12px; padding: 4px 4px 4px 12px; align-items: center; }
        .input-wrapper input { flex: 1; background: transparent; border: none; padding: 10px 0; outline: none; font-size: 0.95rem; }
        .send-btn { background: var(--primary-blue); color: white; border: none; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .send-btn:disabled { opacity: 0.4; }

        .thinking { font-size: 0.8rem; color: #94a3b8; margin-bottom: 10px; font-style: italic; }

        /* ── Responsive ── */

        /* Small tablet / large phone landscape (481–680px) */
        @media (max-width: 680px) and (min-width: 481px) {
          .chat-widget {
            width: calc(100vw - 32px);
            right: 16px;
            bottom: 16px;
          }
          .fab-trigger {
            right: 16px;
            bottom: 16px;
          }
        }

        /* Mobile phones (≤ 480px) — full-screen bottom sheet */
        @media (max-width: 480px) {
          .chat-widget {
            width: 100%;
            height: 100vh;
            height: 100dvh;
            max-height: 100%;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
          .fab-trigger {
            bottom: 16px;
            right: 16px;
            padding: 10px 16px;
            gap: 8px;
            font-size: 0.9rem;
          }
          .chat-window {
            padding: 12px;
          }
          .chat-input-area {
            padding: 12px;
            padding-bottom: max(12px, env(safe-area-inset-bottom));
          }
          .message-row {
            max-width: 98%;
          }
          .chat-bubble {
            font-size: 0.9rem;
          }
        }
      `}</style>

      <div className="medical-nav-wrapper">
        {/* Floating Action Button */}
        <button 
          className={`fab-trigger ${isOpen ? 'hidden' : ''}`} 
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare size={24} />
          <strong>Care Navigator</strong>
        </button>

        {/* Chat Widget Container */}
        <div className={`chat-widget ${isOpen ? 'open' : ''}`}>
          <header className="chat-header">
            <div className="header-brand">
              <div className="brand-icon">
                <Stethoscope size={20} />
              </div>
              <div>
                <h2>Care Navigator</h2>
                <div className="status-indicator">
                  <span className="status-dot"></span> Online AI Assistant
                </div>
              </div>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <ChevronDown size={24} />
            </button>
          </header>
          
          <main className="chat-window" ref={scrollRef}>
            {messages.map((msg, idx) => (
              <Message key={idx} message={msg} />
            ))}
            
            {isThinking && (
              <div className="thinking">Nurse is typing...</div>
            )}
          </main>

          <footer className="chat-input-area">
            <div className="input-wrapper">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Describe your symptoms..."
              />
              <button 
                className="send-btn" 
                onClick={handleSend} 
                disabled={isThinking || !input.trim()}
              >
                <Send size={18} />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}