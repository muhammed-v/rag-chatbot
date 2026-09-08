import { useEffect, useRef, useState } from "react";

function App() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [asking, setAsking] = useState(false);

  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");

  // Stores messages displayed in the chat UI
  const [chatMessages, setChatMessages] = useState([]);

  // Used to automatically scroll to the latest message
  const chatEndRef = useRef(null);

  // Scroll to the bottom whenever a new message appears
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chatMessages, asking]);

  function handleFileChange(event) {
    setFiles(Array.from(event.target.files));
    setMessage("");
  }

  async function handleUpload() {
    if (files.length === 0) {
      setMessage("Please select at least one PDF.");
      return;
    }

    setUploading(true);
    setMessage("");

    // New PDF set = new conversation
    setChatMessages([]);
    setQuestion("");
    setUploadedFiles([]);

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch(
        "/upload", //was originally http://127.0.0.1:8000/upload but changed for deployment. still works in local due to the proxy created in vite.config.js
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Upload failed"
        );
      }

      setUploadedFiles(data.files || []);
      setMessage(data.message);

      // Clear selected files after successful upload
      setFiles([]);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || asking) {
      return;
    }

    // Immediately show the user's message
    setChatMessages((previousMessages) => [
      ...previousMessages,
      {
        role: "user",
        content: trimmedQuestion,
      },
    ]);

    // Clear input immediately
    setQuestion("");

    setAsking(true);

    try {
      const response = await fetch(
        "/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.error || "Request failed"
        );
      }

      const assistantResponse =
        data.error || data.response || "No response received.";

      // Add assistant response to chat
      setChatMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: assistantResponse,
        },
      ]);
    } catch (error) {
      setChatMessages((previousMessages) => [
        ...previousMessages,
        {
          role: "assistant",
          content: `Error: ${error.message}`,
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function handleKeyDown(event) {
    // Enter sends the message
    // Shift + Enter creates a new line
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleAsk();
    }
  }

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <h1>PDF RAG Chatbot</h1>

        <p>
          Upload your PDFs and ask questions about them.
        </p>
      </header>


      {/* PDF Upload Section */}
      <section className="upload-section">

        <h2>Documents</h2>

        <div className="upload-controls">

          <input
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileChange}
            disabled={uploading || asking}
          />

          <button
            onClick={handleUpload}
            disabled={
              uploading ||
              asking ||
              files.length === 0
            }
          >
            {uploading
              ? "Processing..."
              : "Upload PDFs"}
          </button>

        </div>


        {/* Selected files */}
        {files.length > 0 && (
          <div className="file-list">

            <h3>Selected files</h3>

            <ul>
              {files.map((file, index) => (
                <li key={index}>
                  {file.name}
                </li>
              ))}
            </ul>

          </div>
        )}


        {/* Uploaded files */}
        {uploadedFiles.length > 0 && (
          <div className="file-list">

            <h3>Current documents</h3>

            <ul>
              {uploadedFiles.map((filename, index) => (
                <li key={index}>
                  {filename}
                </li>
              ))}
            </ul>

          </div>
        )}

        {message && (
          <p className="status-message">
            {message}
          </p>
        )}

      </section>


      {/* Chat Section */}
      <section className="chat-container">

        <div className="chat-header">
          <h2>Chat</h2>
        </div>


        {/* Messages */}
        <div className="chat-messages">

          {chatMessages.length === 0 && !asking && (
            <div className="empty-chat">
              <h3>Start a conversation</h3>

              <p>
                Upload your PDFs and ask a question
                about their contents.
              </p>
            </div>
          )}


          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`message-row ${msg.role}`}
            >

              <div className="message-bubble">

                <div className="message-role">
                  {msg.role === "user"
                    ? "You"
                    : "Assistant"}
                </div>

                <div className="message-content">
                  {msg.content}
                </div>

              </div>

            </div>
          ))}


          {/* Thinking indicator */}
          {asking && (
            <div className="message-row assistant">

              <div className="message-bubble">

                <div className="message-role">
                  Assistant
                </div>

                <div className="typing-indicator">
                  Thinking...
                </div>

              </div>

            </div>
          )}


          <div ref={chatEndRef} />

        </div>


        {/* Chat Input */}
        <div className="chat-input-container">

          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder={
              uploading
                ? "Processing your PDFs..."
                : "Ask a question about your PDFs..."
            }
            disabled={uploading || asking}
            rows={1}
          />

          <button
            onClick={handleAsk}
            disabled={
              uploading ||
              asking ||
              !question.trim()
            }
          >
            {asking ? "..." : "Send"}
          </button>

        </div>

        <p className="input-hint">
          Press Enter to send · Shift + Enter for a new line
        </p>

      </section>

    </div>
  );
}

export default App;