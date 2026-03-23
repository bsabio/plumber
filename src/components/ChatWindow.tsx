'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, UserRole, ChatResponse } from '@/lib/types';
import MessageBubble from './MessageBubble';
import RoleSelector from './RoleSelector';

export default function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<UserRole>('anon');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Show welcome message on mount or role change
  useEffect(() => {
    const welcomeId = `welcome-${role}-${Date.now()}`;
    const welcomeMessage: ChatMessage = {
      id: welcomeId,
      role: 'assistant',
      content: getWelcomeMessage(role),
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  }, [role]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, role }),
      });

      const data: ChatResponse = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
        toolResult: data.toolResult,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action suggestions
  const suggestions = getSuggestions(role);

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          <div className="chat-logo">
            <span className="logo-icon">🔧</span>
            <div className="logo-text">
              <h1>Pipe Dream Plumbing</h1>
              <span className="logo-subtitle">Virtual Employee Assistant</span>
            </div>
          </div>
        </div>
        <div className="chat-header-right">
          <RoleSelector currentRole={role} onRoleChange={setRole} />
          <div className="status-indicator">
            <span className="status-dot"></span>
            <span className="status-text">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="message-bubble-wrapper assistant">
            <div className="message-avatar">🔧</div>
            <div className="message-bubble assistant">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="chat-suggestions">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              className="suggestion-chip"
              onClick={() => {
                setInput(suggestion);
                inputRef.current?.focus();
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            id="send-button"
            className="send-button"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <span className="send-spinner"></span>
            ) : (
              <span className="send-icon">➤</span>
            )}
          </button>
        </div>
        <div className="chat-input-footer">
          <span className="role-indicator" style={{ color: `var(--role-${role === 'authenticated' ? 'auth' : role})` }}>
            {role === 'anon' ? '👤 Guest' : role === 'authenticated' ? '🔑 Customer' : '⚡ Admin'}
          </span>
          <span className="powered-by">Powered by MCP · Drizzle ORM · Next.js</span>
        </div>
      </div>
    </div>
  );
}

function getWelcomeMessage(role: UserRole): string {
  const roleNames = { anon: 'Guest', authenticated: 'Customer', admin: 'Admin' };
  return `👋 **Welcome to Pipe Dream Plumbing!** You're signed in as **${roleNames[role]}**.\n\nI'm your Virtual Employee assistant. I can help you with plumbing tips, scheduling appointments, and managing support tickets.\n\nHow can I help you today?`;
}

function getSuggestions(role: UserRole): string[] {
  switch (role) {
    case 'anon':
      return [
        'Any plumbing tips?',
        'When should I call a plumber?',
        'What promotions do you have?',
      ];
    case 'authenticated':
      return [
        'I need service for a leaking faucet',
        'Check availability for next Tuesday',
        'Show my tickets',
        'Show my appointments',
      ];
    case 'admin':
      return [
        'Show business metrics',
        'Show all tickets',
        'Check availability for next Monday',
        'Show all users',
      ];
  }
}
