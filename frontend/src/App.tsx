import { useEffect, useState } from "react";
import { Message } from "./components/Message";
import { useNavigatorStore } from "./hooks/useNavigatorStore";

export default function App() {
  const { messages, initSession, sendMessage, isThinking } = useNavigatorStore();
  const [input, setInput] = useState("");

  // Step 1: Initialize the session on load
  useEffect(() => {
    initSession();
  }, [initSession]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Medical Navigator AI</h1>
      </header>
      
      <main className="chat-window">
        {/* Step 2: Render existing messages */}
        {messages.map((msg, idx) => (
          <Message key={idx} message={msg} />
        ))}
        
        {isThinking && <div className="thinking">Agent is thinking...</div>}
      </main>

      {/* Step 3: Add the missing input UI */}
      <footer className="chat-input">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Describe your symptoms..."
        />
        <button onClick={handleSend} disabled={isThinking}>Send</button>
      </footer>
    </div>
  );
}