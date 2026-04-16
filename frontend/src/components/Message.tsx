import type { ChatMessage } from "../types/index.ts";
import { DoctorCard } from "./DoctorCard.tsx";
import { User, Stethoscope } from "lucide-react";

interface Props {
  message: ChatMessage;
}

export function Message({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`message-row ${isUser ? "message-row--user" : "message-row--assistant"}`}>
      <div className="avatar-container">
        <div className={`message-avatar ${isUser ? "avatar--user" : "avatar--assistant"}`}>
          {isUser ? <User size={16} /> : <Stethoscope size={16} />}
        </div>
        <span className="avatar-label">{isUser ? "Patient" : "Nurse"}</span>
      </div>

      <div className="message-content-wrapper">
        {message.content && (
          <div className="chat-bubble">
            {message.content}
            {message.isStreaming && <span className="cursor-blink">▌</span>}
          </div>
        )}

        {message.matches && message.matches.length > 0 && (
          <div className="matches-list">
            {message.matches.map((match, i) => (
              <DoctorCard key={match.doctor.id} match={match} isFirst={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}