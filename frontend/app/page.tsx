"use client";

import { useEffect, useMemo, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
  route?: string;
};

type SystemStatus = "checking" | "online" | "offline";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

function createSessionId() {
  return `web-${crypto.randomUUID()}`;
}

function routeLabel(route?: string) {
  if (!route) return "NovaRAG";
  return route.toUpperCase();
}

function routeStyle(route?: string) {
  const value = route?.toLowerCase();
  if (value?.includes("rag")) return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
  if (value?.includes("analysis")) return "border-violet-400/20 bg-violet-400/10 text-violet-300";
  return "border-slate-400/20 bg-slate-400/10 text-slate-300";
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
  const [activePanel, setActivePanel] = useState<"knowledge" | "session">("knowledge");

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

  const lastRoute = useMemo(() => {
    const latest = [...messages].reverse().find((message) => message.role === "assistant" && message.route);
    return latest?.route || "GENERAL";
  }, [messages]);

  const sendMessage = async () => {
    if (!query.trim() || loading) return;
    const currentQuery = query.trim();
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
        {
          role: "assistant",
          content: "Unable to connect to the NovaRAG backend. Configure the production API and try again.",
          route: "SYSTEM",
        },
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
    setUploadStatus(`Indexing ${file.name}...`);
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
      setUploadStatus(`Indexed ${data.filename} · ${data.chunks_added} chunks`);
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
    setMemoryStatus("New isolated session created.");
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
      setUploadStatus("Knowledge base cleared for this session.");
    } catch (error) {
      console.error(error);
      setUploadStatus("Unable to clear session documents.");
    }
  };

  const statusText = systemStatus === "online" ? "Operational" : systemStatus === "offline" ? "Offline" : "Connecting";
  const statusDot = systemStatus === "online" ? "bg-emerald-400" : systemStatus === "offline" ? "bg-rose-400" : "bg-amber-400";

  return (
    <main className="min-h-screen overflow-hidden bg-[#070b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 grid-fade" />

      <div className="relative mx-auto flex min-h-screen max-w-[1700px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 shadow-2xl shadow-black/20 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-violet-500/20 shadow-lg shadow-blue-950/40">
              <div className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-cyan-200 to-blue-500 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><span className="truncate text-base font-semibold tracking-tight">NovaRAG</span><span className="hidden rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:inline">Workspace</span></div>
              <p className="truncate text-xs text-slate-500">Enterprise multi-agent document intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex"><span className={`h-2 w-2 rounded-full ${statusDot} ${systemStatus === "checking" ? "animate-pulse-soft" : ""}`} /> {statusText}</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-right">
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Active route</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-300">{routeLabel(lastRoute)}</p>
            </div>
          </div>
        </header>

        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[270px_minmax(0,1fr)_290px]">
          <aside className="glass flex min-h-[760px] flex-col rounded-2xl border border-white/10 shadow-2xl shadow-black/20">
            <div className="border-b border-white/7 p-4">
              <div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</span><span className="rounded-full border border-emerald-400/15 bg-emerald-400/8 px-2 py-1 text-[9px] font-semibold text-emerald-300">LIVE</span></div>
              <button onClick={startNewChat} className="group flex w-full items-center gap-3 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-cyan-400/10 to-blue-500/10 px-3 py-3 text-left transition hover:border-cyan-300/35 hover:bg-cyan-400/15">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/15 text-lg text-cyan-300">+</span>
                <span><span className="block text-sm font-semibold">New session</span><span className="text-[11px] text-slate-500">Start with isolated context</span></span>
              </button>
            </div>

            <div className="border-b border-white/7 p-4">
              <div className="mb-2 flex gap-1 rounded-xl bg-black/20 p-1">
                <button onClick={() => setActivePanel("knowledge")} className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-medium transition ${activePanel === "knowledge" ? "bg-white/8 text-white" : "text-slate-500 hover:text-slate-300"}`}>Knowledge</button>
                <button onClick={() => setActivePanel("session")} className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-medium transition ${activePanel === "session" ? "bg-white/8 text-white" : "text-slate-500 hover:text-slate-300"}`}>Session</button>
              </div>

              {activePanel === "knowledge" ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div><p className="text-sm font-semibold">Knowledge base</p><p className="text-[11px] text-slate-500">PDF context for this session</p></div>
                    <div className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-center"><p className="text-sm font-semibold text-white">{documents.length}</p><p className="text-[9px] uppercase tracking-wider text-slate-600">files</p></div>
                  </div>
                  <label className="block cursor-pointer rounded-xl border border-dashed border-cyan-300/20 bg-cyan-400/[0.04] p-3 text-center transition hover:border-cyan-300/40 hover:bg-cyan-400/[0.08]">
                    <span className="text-xs font-semibold text-cyan-300">{uploading ? "Indexing document…" : "Upload PDF"}</span>
                    <span className="mt-1 block text-[10px] text-slate-600">Drag-style upload · session scoped</span>
                    <input type="file" accept=".pdf,application/pdf" onChange={uploadFile} disabled={uploading} className="hidden" />
                  </label>
                  {uploadStatus && <p className="mt-2 break-words rounded-lg bg-white/[0.025] p-2 text-[10px] leading-4 text-slate-500">{uploadStatus}</p>}

                  <div className="mt-4 space-y-2">
                    {documents.length === 0 ? (
                      <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-5 text-center"><div className="mx-auto mb-2 text-xl opacity-60">◫</div><p className="text-xs font-medium text-slate-400">No documents yet</p><p className="mt-1 text-[10px] text-slate-600">Add a PDF to enable grounded answers.</p></div>
                    ) : documents.map((document, index) => (
                      <div key={`${document}-${index}`} className="rounded-xl border border-white/7 bg-white/[0.025] p-3 hover:border-white/12">
                        <div className="flex items-start gap-2"><span className="mt-0.5 text-cyan-300">▧</span><p className="break-words text-[11px] leading-4 text-slate-300">{document}</p></div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[10px] text-slate-600"><span>{totalChunks.toLocaleString()} indexed chunks</span>{documents.length > 0 && <button onClick={clearDocuments} className="text-rose-400/80 hover:text-rose-300">Clear</button>}</div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3"><p className="text-[9px] uppercase tracking-[0.18em] text-slate-600">Session ID</p><p className="mt-2 break-all text-[10px] leading-4 text-slate-400">{sessionId}</p></div>
                  <button onClick={clearCurrentMemory} className="w-full rounded-xl border border-rose-400/15 bg-rose-400/[0.04] px-3 py-2.5 text-left text-[11px] font-semibold text-rose-300 transition hover:bg-rose-400/[0.08]">Clear conversation memory</button>
                  {memoryStatus && <p className="text-[10px] leading-4 text-slate-500">{memoryStatus}</p>}
                </div>
              )}
            </div>

            <div className="mt-auto p-4">
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3">
                <div className="mb-3 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Agents</p><span className="text-[9px] text-slate-600">3 online</span></div>
                <div className="space-y-2 text-[11px] text-slate-400"><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> General agent</span><span className="text-[9px] text-slate-600">Direct</span></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400"/> RAG agent</span><span className="text-[9px] text-slate-600">Grounded</span></div><div className="flex items-center justify-between"><span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-400"/> Analysis agent</span><span className="text-[9px] text-slate-600">Deep</span></div></div>
              </div>
            </div>
          </aside>

          <section className="surface flex min-h-[760px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/25">
            <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
              <div><p className="text-sm font-semibold text-white">Document intelligence</p><p className="mt-0.5 text-[11px] text-slate-500">Ask questions, synthesize evidence, and analyze your workspace context.</p></div>
              <div className="hidden items-center gap-2 sm:flex"><span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">Memory on</span><span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-slate-500">Session isolated</span></div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-7">
              {messages.length === 0 && (
                <div className="flex min-h-[570px] items-center justify-center px-2">
                  <div className="w-full max-w-2xl">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300"/> Ready to reason</div>
                    <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">Turn your documents into answers.</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">NovaRAG routes each request to the appropriate agent, keeps session memory isolated, and uses your indexed documents as context.</p>

                    <div className="mt-8 grid gap-3 sm:grid-cols-3">
                      <button onClick={() => setQuery("Summarize the key points from my documents")} className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-white/[0.04]"><p className="text-xl">◌</p><p className="mt-3 text-xs font-semibold text-slate-200">Summarize</p><p className="mt-1 text-[10px] leading-4 text-slate-600">Extract the essential ideas.</p></button>
                      <button onClick={() => setQuery("Find the most important risks or issues")} className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-300/20 hover:bg-white/[0.04]"><p className="text-xl">⌁</p><p className="mt-3 text-xs font-semibold text-slate-200">Analyze</p><p className="mt-1 text-[10px] leading-4 text-slate-600">Surface patterns and risks.</p></button>
                      <button onClick={() => setQuery("What does this workspace tell me?")} className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300/20 hover:bg-white/[0.04]"><p className="text-xl">⌘</p><p className="mt-3 text-xs font-semibold text-slate-200">Ask anything</p><p className="mt-1 text-[10px] leading-4 text-slate-600">Use general reasoning when needed.</p></button>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={`mb-6 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] text-[11px] font-bold text-cyan-300">N</div>}
                  <div className={`${message.role === "user" ? "max-w-[85%]" : "max-w-[88%]"}`}>
                    {message.role === "assistant" && <div className="mb-2 flex items-center gap-2"><span className="text-[10px] font-semibold text-slate-500">NovaRAG</span>{message.route && <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${routeStyle(message.route)}`}>{routeLabel(message.route)} agent</span>}</div>}
                    <div className={message.role === "user" ? "rounded-2xl rounded-tr-md border border-blue-300/15 bg-blue-500/15 px-4 py-3 text-sm leading-6 text-slate-100" : "rounded-2xl rounded-tl-md border border-white/7 bg-white/[0.035] px-4 py-3.5 text-sm leading-6 text-slate-300"}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {loading && <div className="mb-6 flex items-start"><div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] text-[11px] font-bold text-cyan-300">N</div><div className="rounded-2xl rounded-tl-md border border-white/7 bg-white/[0.035] px-4 py-3.5"><div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse-soft"/><span className="h-1.5 w-1.5 rounded-full bg-blue-300 animate-pulse-soft [animation-delay:150ms]"/><span className="h-1.5 w-1.5 rounded-full bg-violet-300 animate-pulse-soft [animation-delay:300ms]"/><span className="ml-2 text-xs text-slate-500">Routing request across agents…</span></div></div></div>}
            </div>

            <div className="border-t border-white/7 bg-black/10 p-4 sm:p-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] shadow-inner shadow-black/20 focus-within:border-cyan-300/25">
                <textarea value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} placeholder="Ask NovaRAG anything about your workspace…" className="w-full resize-none bg-transparent px-4 pt-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600" />
                <div className="flex items-center justify-between px-3 pb-3 pt-1"><div className="text-[9px] uppercase tracking-[0.15em] text-slate-700">Enter to send · Shift + Enter for newline</div><button onClick={() => void sendMessage()} disabled={loading || !query.trim()} className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{loading ? "Working…" : "Send ↗"}</button></div>
              </div>
            </div>
          </section>

          <aside className="glass min-h-[760px] rounded-2xl border border-white/10 p-4 shadow-2xl shadow-black/20">
            <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Observability</p><h3 className="mt-1 text-sm font-semibold text-white">Agent trace</h3></div>

            <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3">
              <div className="flex items-center justify-between"><span className="text-[10px] text-slate-500">Current route</span><span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase ${routeStyle(lastRoute)}`}>{routeLabel(lastRoute)}</span></div>
              <div className="mt-4 space-y-2">
                <div className="relative flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10 text-[10px] text-emerald-300">01</span><div><p className="text-[11px] font-medium text-slate-300">Router agent</p><p className="text-[9px] text-slate-600">Intent classification</p></div></div>
                <div className="ml-3 h-4 w-px bg-white/8" />
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-400/10 text-[10px] text-cyan-300">02</span><div><p className="text-[11px] font-medium text-slate-300">{routeLabel(lastRoute)} agent</p><p className="text-[9px] text-slate-600">Context + response generation</p></div></div>
                <div className="ml-3 h-4 w-px bg-white/8" />
                <div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-400/10 text-[10px] text-violet-300">03</span><div><p className="text-[11px] font-medium text-slate-300">Memory layer</p><p className="text-[9px] text-slate-600">Session persistence</p></div></div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3"><p className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Docs</p><p className="mt-1 text-lg font-semibold text-white">{documents.length}</p></div>
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3"><p className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Chunks</p><p className="mt-1 text-lg font-semibold text-white">{totalChunks.toLocaleString()}</p></div>
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3"><p className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Messages</p><p className="mt-1 text-lg font-semibold text-white">{messages.length}</p></div>
              <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3"><p className="text-[9px] uppercase tracking-[0.15em] text-slate-600">Status</p><p className={`mt-1 text-sm font-semibold ${systemStatus === "online" ? "text-emerald-300" : systemStatus === "offline" ? "text-rose-300" : "text-amber-300"}`}>{statusText}</p></div>
            </div>

            <div className="mt-3 rounded-xl border border-white/7 bg-white/[0.025] p-3">
              <p className="text-[10px] font-semibold text-slate-300">System</p>
              <div className="mt-3 space-y-2 text-[10px]"><div className="flex justify-between"><span className="text-slate-600">Vector store</span><span className="text-slate-400">FAISS</span></div><div className="flex justify-between"><span className="text-slate-600">Memory</span><span className="text-slate-400">SQLite</span></div><div className="flex justify-between"><span className="text-slate-600">API</span><span className="text-slate-400">FastAPI</span></div><div className="flex justify-between"><span className="text-slate-600">Isolation</span><span className="text-emerald-300">Enabled</span></div></div>
            </div>

            <div className="mt-3 rounded-xl border border-cyan-300/10 bg-cyan-400/[0.035] p-3">
              <p className="text-[10px] font-semibold text-cyan-300">Grounding</p>
              <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Document-aware answers are generated from the active session context when the RAG route is selected.</p>
            </div>
          </aside>
        </div>

        <footer className="flex flex-col items-center justify-between gap-2 px-2 py-3 text-[9px] uppercase tracking-[0.15em] text-slate-700 sm:flex-row"><span>NovaRAG · Enterprise AI workspace</span><span>{sessionId.slice(0, 22)}…</span></footer>
      </div>
    </main>
  );
}
