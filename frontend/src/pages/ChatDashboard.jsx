
import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Waves,
  Thermometer,
  ShieldAlert,
  Activity,
  User,
  RefreshCw,
  MessageCircle,
} from "lucide-react";

import {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
} from "../services/api";

import "../styles/ChatDashboard.css";

const CONVERSATION_ID = "default";

const suggestions = [
  {
    icon: Activity,
    text: "Explain the latest sensor readings",
  },
  {
    icon: ShieldAlert,
    text: "What is the current environmental risk?",
  },
  {
    icon: Thermometer,
    text: "Explain the 24-hour temperature prediction",
  },
  {
    icon: Waves,
    text: "Are any ocean anomalies detected?",
  },
];

function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatDashboard() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  async function loadHistory() {
    setHistoryLoading(true);
    setError("");

    try {
      const data = await getChatHistory(CONVERSATION_ID);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || "Unable to load chat history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSend(event) {
    event?.preventDefault();

    const message = input.trim();

    if (!message || loading) return;

    setInput("");
    setError("");

    const temporaryMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, temporaryMessage]);
    setLoading(true);

    try {
      const response = await sendChatMessage(
        message,
        CONVERSATION_ID
      );

      setMessages((previous) => [
        ...previous.filter(
          (item) => item.id !== temporaryMessage.id
        ),
        temporaryMessage,
        response.message,
      ]);
    } catch (err) {
      setError(err.message || "Unable to send your message.");

      // Keep the user's message visible so it can be retried.
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleClearChat() {
    if (loading) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?"
    );

    if (!confirmed) return;

    try {
      setError("");
      await clearChatHistory(CONVERSATION_ID);
      setMessages([]);
    } catch (err) {
      setError(err.message || "Unable to clear chat history.");
    }
  }

  function handleSuggestion(question) {
    setInput(question);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  return (
    <section className="chat-dashboard">
      <div className="chat-panel">

        {/* Chat header */}
        <div className="chat-header">
          <div className="chat-header-left">
            <div className="chat-avatar">
              <Bot size={25} />
              <span className="chat-online-dot" />
            </div>

            <div>
              <h2>Ocean Eye AI Assistant</h2>
              <p>
                <span className="chat-status-dot" />
                Local AI assistant · Qwen 2.5
              </p>
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              className="chat-icon-button"
              onClick={loadHistory}
              disabled={historyLoading || loading}
              title="Refresh conversation"
              type="button"
            >
              <RefreshCw size={17} />
            </button>

            <button
              className="chat-clear-button"
              onClick={handleClearChat}
              disabled={loading || messages.length === 0}
              type="button"
            >
              <Trash2 size={16} />
              <span>Clear chat</span>
            </button>
          </div>
        </div>

        {/* Simulator notice */}
        <div className="chat-data-notice">
          <Sparkles size={16} />
          <span>
            <strong>Demonstration mode:</strong> Sensor readings
            are simulated data, not verified live ocean measurements.
          </span>
        </div>

        {/* Messages */}
        <div className="chat-messages">

          {historyLoading ? (
            <div className="chat-loading-history">
              <RefreshCw size={20} className="chat-spin" />
              Loading conversation...
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <div className="chat-welcome-icon">
                    <Bot size={34} />
                  </div>

                  <h2>Welcome to Ocean Eye AI</h2>

                  <p>
                    I'm your ocean-monitoring assistant. Ask me
                    about sensor readings, environmental risk,
                    predictions and anomaly detection.
                  </p>

                  <div className="chat-suggestions">
                    <h3>
                      <Sparkles size={15} />
                      Suggested questions
                    </h3>

                    <div className="chat-suggestion-grid">
                      {suggestions.map((item) => {
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.text}
                            className="chat-suggestion"
                            type="button"
                            onClick={() =>
                              handleSuggestion(item.text)
                            }
                          >
                            <Icon size={18} />
                            <span>{item.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message-row ${
                    message.role === "user"
                      ? "user-message-row"
                      : "assistant-message-row"
                  }`}
                >
                  <div className="chat-message-avatar">
                    {message.role === "user" ? (
                      <User size={18} />
                    ) : (
                      <Bot size={19} />
                    )}
                  </div>

                  <div className="chat-message-content">
                    <div className="chat-message-name">
                      {message.role === "user"
                        ? "You"
                        : "Ocean Eye AI"}
                    </div>

                    <div className="chat-message-bubble">
                      {message.content}
                    </div>

                    <span className="chat-message-time">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chat-message-row assistant-message-row">
                  <div className="chat-message-avatar">
                    <Bot size={19} />
                  </div>

                  <div className="chat-message-content">
                    <div className="chat-message-name">
                      Ocean Eye AI
                    </div>

                    <div className="chat-typing">
                      <span />
                      <span />
                      <span />
                      <small>Analyzing ocean data...</small>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="chat-error">
            <MessageCircle size={16} />
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Input area */}
        <form className="chat-input-area" onSubmit={handleSend}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Ocean Eye AI about your ocean data..."
            rows={1}
            disabled={historyLoading}
          />

          <button
            className="chat-send-button"
            type="submit"
            disabled={!input.trim() || loading || historyLoading}
            title="Send message"
          >
            <Send size={19} />
          </button>
        </form>

        <div className="chat-input-footer">
          <span>Enter to send · Shift + Enter for a new line</span>
          <span>Powered by local Ollama AI</span>
        </div>

      </div>
    </section>
  );
}
