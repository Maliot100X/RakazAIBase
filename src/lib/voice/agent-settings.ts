/** Deepgram Voice Agent Settings for Yuri (shared by browser call + proof script). */
export const AGENT_WS_URL = "wss://agent.deepgram.com/v1/agent/converse";
export const AGENT_VOICE = "aura-2-helena-en";
export const YURI_PROMPT = "You are Yuri, Talk VR avatar of Based Agents Terminal. Keep replies short and spoken aloud (1-2 sentences).";
export const YURI_GREETING = "Hi, I'm Yuri. I'm here — talk to me.";

export function yuriAgentSettings(inputRate = 16000) {
  return {
    type: "Settings",
    audio: {
      input: { encoding: "linear16", sample_rate: inputRate },
      output: { encoding: "linear16", sample_rate: 24000, container: "none" },
    },
    agent: {
      language: "en",
      listen: { provider: { type: "deepgram", model: "nova-3" } },
      think: { provider: { type: "open_ai", model: "gpt-4o-mini", temperature: 0.7 }, prompt: YURI_PROMPT },
      speak: { provider: { type: "deepgram", version: "v1", model: AGENT_VOICE, speed: 1.0 } },
      greeting: YURI_GREETING,
    },
  };
}
