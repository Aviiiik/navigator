import type { ChatMessage } from "../types/index.ts";
import { DoctorCard } from "./DoctorCard.tsx";

interface Props {
  message: ChatMessage;
}

function UrgencyBanner({ urgency }: { urgency: ChatMessage["urgency"] }) {
  if (!urgency || urgency === "normal") return null;
  return (
    <div className={`urgency-banner urgency-banner--${urgency}`}>
      {urgency === "critical" ? (
        <>
          <span className="urgency-icon">⚠</span>
          <strong>Critical urgency detected</strong> — Emergency triage recommended. Please proceed to the nearest ER or call emergency services.
        </>
      ) : (
        <>
          <span className="urgency-icon">!</span>
          <strong>High priority</strong> — This needs prompt medical attention.
        </>
      )}
    </div>
  );
}

export function Message({ message }: Props) {
  if (message.role === "user") {
    return (
      <div className="message message--user">
        <div className="message__avatar message__avatar--user">P</div>
        <div className="message__bubble message__bubble--user">{message.content}</div>
      </div>
    );
  }

  return (
    <div className="message message--assistant">
      <div className="message__avatar message__avatar--agent">N</div>
      <div className="message__content">
        {message.urgency && <UrgencyBanner urgency={message.urgency} />}

        {message.content && (
          <div className="message__bubble message__bubble--agent">
            {message.content}
            {message.isStreaming && <span className="cursor-blink">▌</span>}
          </div>
        )}

        {message.matches && message.matches.length > 0 && (
          <div className="matches-container">
            {message.matches.map((match, i) => (
              <DoctorCard key={match.doctor.id} match={match} isFirst={i === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
