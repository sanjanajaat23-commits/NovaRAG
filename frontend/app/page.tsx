"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  route?: string;
};

type SystemStatus = "checking" | "online" | "offline";

// Empty means same-origin in production. Set NEXT_PUBLIC_API_URL for local development.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function createSessionId() {
  return `web-${crypto.randomUUID()}`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState("web-session-1");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [memoryStatus, setMemoryStatus] = useState("");
  const [documents, setDocuments] = useState<string[]>([]);
  const [totalChunks, setTotalChunks] = useState(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const healthResponse = await fetch(`${API_URL}/api/v1/health`);
        if (!healthResponse.ok) throw new Error("Backend unavailable");
        if (!cancelled) setSystemStatus("online");
      } catch (error) {
        console.error(error);
        if (!cancelled) setSystemStatus("offline");
      }

      try {
        const response = await fetch(`${API_URL}/api/v1/documents/${sessionId}`);
        if (!response.ok) throw new Error("Unable to load documents");
        const data = await response.json();
        if (!cancelled) {
          setDocuments(data.documents || []);
          setTotalChunks(data.total_chunks || 0);
        }
      } catch (error) {
        console.error(error);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const sendMessage = async () => {
    if (!query.trim() || loading) return;
    const currentQuery = query;
    setMessages((previous) => [...previous, { role: "user", content: currentQuery }]);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, query: currentQuery }),
      });
      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);
      const data = await response.json();
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: data.answer, route: data.route },
      ]);
      setSystemStatus("online");
    } catch (error) {
      console.error(error);
      setSystemStatus("offline");
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Unable to connect to the NovaRAG backend. Configure the production API and try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadStatus("Only PDF files are supported.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    try {
      const response = await fetch(`${API_URL}/api/v1/upload`, { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || `Upload failed: ${response.status}`);
      }
      const data = await response.json();
      setDocuments(data.documents || []);
      setTotalChunks(data.total_chunks || 0);
      setUploadStatus(`Uploaded ${data.filename} successfully. ${data.chunks_added} chunks added.`);
      setSystemStatus("online");
    } catch (error) {
      console.error(error);
      setUploadStatus(error instanceof Error ? error.message : "Document upload failed.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const startNewChat = () => {
    const newSessionId = createSessionId();
    setSessionId(newSessionId);
    setMessages([]);
    setQuery("");
    setDocuments([]);
    setTotalChunks(0);
    setUploadStatus("");
    setMemoryStatus("New isolated chat session started.");
  };

  const clearCurrentMemory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/chat/memory/${sessionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to clear memory");
      setMessages([]);
      setQuery("");
      setMemoryStatus("Conversation memory cleared.");
    } catch (error) {
      console.error(error);
      setMemoryStatus("Unable to clear conversation memory.");
    }
  };

  const clearDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/documents/${sessionId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to clear documents");
      setDocuments([]);
      setTotalChunks(0);
      setUploadStatus("All documents for this session were cleared.");
    } catch (error) {
      console.error(error);
      setUploadStatus("Unable to clear session documents.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col p-6">
        <header className="mb-6 flex flex-col justify-between gap-4 border-b border-gray-800 pb-5 md:flex-row md:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold">N</div>
              <div><h1 className="text-3xl font-bold tracking-tight">NovaRAG</h1><p className="text-sm text-gray-400">Enterprise Multi-Agent AI</p></div>
            </div>
            <p className="mt-3 text-gray-400">Multi-agent AI • RAG • Document analysis • Session-aware memory</p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
            <div className="flex items-center gap-2"><span className={systemStatus === "online" ? "h-3 w-3 rounded-full bg-green-500" : systemStatus === "offline" ? "h-3 w-3 rounded-full bg-red-500" : "h-3 w-3 rounded-full bg-yellow-500"} /><span className="text-sm">{systemStatus === "online" ? "Backend Online" : systemStatus === "offline" ? "Backend Offline" : "Checking Backend"}</span></div>
          </div>
        </header>

        <div className="grid flex-1 gap-6 md:grid-cols-[300px_1fr]">
          <aside className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="mb-4 text-lg font-semibold">Conversation</h2>
            <button onClick={startNewChat} className="w-full rounded-lg bg-green-600 px-4 py-3 font-medium hover:bg-green-500">+ New Chat</button>
            <button onClick={clearCurrentMemory} className="mt-3 w-full rounded-lg border border-red-500 px-4 py-3 font-medium text-red-400 hover:bg-red-500 hover:text-white">Clear Memory</button>
            {memoryStatus && <p className="mt-3 text-sm text-gray-400">{memoryStatus}</p>}

            <div className="mt-8 border-t border-gray-800 pt-5">
              <h2 className="mb-4 text-lg font-semibold">Knowledge Base</h2>
              <label className="block cursor-pointer rounded-lg bg-blue-600 px-4 py-3 text-center font-medium hover:bg-blue-500">{uploading ? "Processing PDF..." : "+ Upload PDF"}<input type="file" accept=".pdf,application/pdf" onChange={uploadFile} disabled={uploading} className="hidden" /></label>
              {uploadStatus && <p className="mt-3 break-words text-sm text-gray-400">{uploadStatus}</p>}
              <div className="mt-5"><div className="flex items-center justify-between"><p className="text-xs uppercase text-gray-500">Documents</p><span className="text-xs text-gray-500">{documents.length}</span></div>{documents.length === 0 ? <p className="mt-3 text-sm text-gray-500">No documents uploaded.</p> : <div className="mt-3 space-y-2">{documents.map((document, index) => <div key={`${document}-${index}`} className="rounded-lg border border-gray-800 bg-gray-950 p-3"><p className="break-words text-sm text-gray-300">📄 {document}</p></div>)}</div>}{documents.length > 0 && <><p className="mt-3 text-xs text-gray-500">Total chunks: {totalChunks}</p><button onClick={clearDocuments} className="mt-4 w-full rounded-lg border border-orange-500 px-3 py-2 text-sm text-orange-400 hover:bg-orange-500 hover:text-white">Clear Documents</button></>}</div>
            </div>

            <div className="mt-8 border-t border-gray-800 pt-5"><p className="text-xs uppercase text-gray-500">Current Session</p><p className="mt-2 break-all text-xs text-gray-300">{sessionId}</p></div>
            <div className="mt-8"><p className="text-xs uppercase text-gray-500">Available Agents</p><div className="mt-3 space-y-2 text-sm"><p>🟢 General Agent</p><p>🔵 RAG Agent</p><p>🟣 Analysis Agent</p></div></div>
          </aside>

          <section className="flex min-h-[650px] flex-col rounded-xl border border-gray-800 bg-gray-900">
            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              {messages.length === 0 && <div className="flex h-full items-center justify-center text-center"><div><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold">N</div><h2 className="mt-5 text-2xl font-semibold">Ask NovaRAG</h2><p className="mt-2 text-gray-400">Upload documents, ask questions, or request document analysis.</p><p className="mt-2 text-sm text-gray-500">Each chat has isolated document context and session memory.</p></div></div>}
              {messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-auto max-w-[80%] rounded-xl bg-blue-600 p-4" : "max-w-[85%] rounded-xl bg-gray-800 p-4"}>{message.route && <div className="mb-2 text-xs font-semibold uppercase text-purple-400">{message.route} Agent</div>}<p className="whitespace-pre-wrap">{message.content}</p></div>)}
              {loading && <div className="max-w-[85%] rounded-xl bg-gray-800 p-4 text-gray-400">NovaRAG is thinking...</div>}
            </div>
            <div className="border-t border-gray-800 p-4"><div className="flex gap-3"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void sendMessage(); }} placeholder="Ask about your documents..." className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-3 outline-none focus:border-blue-500" /><button onClick={() => void sendMessage()} disabled={loading} className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Thinking..." : "Send"}</button></div></div>
          </section>
        </div>
      </div>
    </main>
  );
}
