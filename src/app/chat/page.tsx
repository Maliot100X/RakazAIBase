"use client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";
import { avatar } from "@/lib/avatar/bus";

export default function ChatPage() {
  const { messages, sendMessage, status, error } = useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) });
  const [input, setInput] = useState("");
  useEffect(() => {
    if (status === "submitted") avatar.emit("think");
    else if (status === "streaming") avatar.emit("speak:start");
    else avatar.emit("speak:end");
  }, [status]);
  const idle = !!error && /idle|503/i.test(error.message);
  return (
    <section className="rk-card-hard mx-auto w-full max-w-[424px] p-4 font-mono text-sm">
      <h1 className="mb-3 text-rk-honey">rakaza@base:~$ chat</h1>
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-rk-lav" : "text-foreground"}>
            <span className="opacity-60">{m.role === "user" ? "> " : "rakaza: "}</span>
            {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
          </div>
        ))}
        {status === "submitted" && <div className="opacity-60">rakaza is thinking…</div>}
        {error && (
          <div className="text-rk-pink">
            {idle ? "Brain is idle (no LLM configured yet). Chat will wake up once keys are set." : "Brain didn't answer. Try again."}
          </div>
        )}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input });
            setInput("");
          }
        }}
      >
        <input
          className="min-h-11 flex-1 rounded-full border-2 border-rk-ink bg-card px-4 outline-none focus:ring-2 focus:ring-rk-pink"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready" && status !== "error"}
          placeholder="say hi, or try /sing"
        />
        <button className="rk-btn-honey disabled:opacity-40" disabled={status !== "ready" && status !== "error"}>
          send
        </button>
      </form>
    </section>
  );
}
