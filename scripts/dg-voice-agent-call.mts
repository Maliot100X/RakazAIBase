import { readFileSync, writeFileSync, appendFileSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { AGENT_WS_URL, yuriAgentSettings } from "../src/lib/voice/agent-settings.ts";

const envTxt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const KEY = /^DEEPGRAM_API_KEY=["']?([^"'\r\n]+)/m.exec(envTxt)?.[1];
if (!KEY) { console.error("no DEEPGRAM_API_KEY"); process.exit(2); }
const OUT = "/workspace/rakaza-prep/drive5";
const EV = `${OUT}/talk-yuri-agent-events.jsonl`;
writeFileSync(EV, "");
const chunks: Buffer[] = [];
let applied = false, doneCount = 0, injected = false, failed = false;

// Node's global WebSocket accepts a protocols arg; Deepgram supports ["token", KEY] subprotocol auth.
const ws = new WebSocket(AGENT_WS_URL, ["token", KEY]);
ws.binaryType = "arraybuffer";
const finish = (code: number) => { try { ws.close(); } catch {} ; setTimeout(() => process.exit(code), 200); };
const timer = setTimeout(() => { console.error("timeout"); wrap(); }, 45000);

function wrap() {
  clearTimeout(timer);
  const pcm = Buffer.concat(chunks);
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24);
  h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  writeFileSync(`${OUT}/talk-yuri-agent-call.wav`, Buffer.concat([h, pcm]));
  execSync(`ffmpeg -y -loglevel error -i ${OUT}/talk-yuri-agent-call.wav ${OUT}/talk-yuri-agent-call.mp3`);
  const size = statSync(`${OUT}/talk-yuri-agent-call.mp3`).size;
  console.log(JSON.stringify({ applied, agentAudioDone: doneCount, pcmBytes: pcm.length, mp3Bytes: size, seconds: pcm.length / 48000 }));
  finish(!failed && applied && doneCount > 0 && size > 2048 ? 0 : 1);
}

ws.onopen = () => console.log("open");
ws.onmessage = (e) => {
  if (typeof e.data !== "string") { chunks.push(Buffer.from(e.data as ArrayBuffer)); return; }
  const m = JSON.parse(e.data);
  appendFileSync(EV, JSON.stringify({ t: Date.now(), ...m }) + "\n");
  console.log("evt", m.type, m.content ?? m.description ?? "");
  if (m.type === "Welcome") ws.send(JSON.stringify(yuriAgentSettings()));
  if (m.type === "SettingsApplied") applied = true;
  if (m.type === "Error") { failed = true; console.error("ERROR", e.data); wrap(); }
  if (m.type === "AgentAudioDone") {
    doneCount++;
    if (!injected) { injected = true; ws.send(JSON.stringify({ type: "InjectUserMessage", content: "Hey Yuri, say hi and tell me you can hear me." })); }
    else wrap();
  }
};
ws.onerror = (e) => { console.error("ws error", (e as any).message ?? e); failed = true; };
ws.onclose = (e) => console.log("close", e.code, e.reason);
