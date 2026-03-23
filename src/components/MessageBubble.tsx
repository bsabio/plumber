'use client';

import type { ChatMessage } from '@/lib/types';
import ToolResultCard from './ToolResultCard';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-avatar">
        {isUser ? '👤' : '🔧'}
      </div>
      <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
        <div className="message-content">
          {message.content.split('\n').map((line, idx) => {
            // Handle markdown-style bold
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={idx}>
                {parts.map((part, pIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                  }
                  return <span key={pIdx}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>
        {message.toolResult && (
          <div className="message-tool-result">
            <ToolResultCard result={message.toolResult} />
          </div>
        )}
        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
