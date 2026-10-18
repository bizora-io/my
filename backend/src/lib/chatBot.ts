import { KNOWLEDGE_BASE, type KnowledgeEntry } from "./knowledgeBase.js";

const GREETING_WORDS = ["hi", "hello", "hey", "assalamu", "salam"];

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function scoreEntry(message: string, entry: KnowledgeEntry): number {
  let score = 0;
  for (const keyword of entry.keywords) {
    if (message.includes(keyword.toLowerCase())) {
      // Longer/more specific keyword phrases count for more than single words.
      score += keyword.split(" ").length;
    }
  }
  return score;
}

export interface BotReply {
  text: string;
  matched: boolean;
  category?: string;
}

// Pure keyword-overlap matching against KNOWLEDGE_BASE - no network calls,
// no external AI API, runs entirely on this server.
export function getBotReply(userMessage: string): BotReply {
  const message = normalize(userMessage);

  if (!message) {
    return { text: "How can I help you today? You can ask me about sales, inventory, staff, billing, or your account.", matched: false };
  }

  if (GREETING_WORDS.some(w => message.startsWith(w))) {
    return {
      text: "Hello! I'm the Bizora Support Assistant. Ask me a question about using Bizora - like adding products, processing sales, staff logins, or your subscription - and I'll do my best to help. If I can't answer it, I'll connect you with a real support agent.",
      matched: false,
    };
  }

  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of KNOWLEDGE_BASE) {
    const score = scoreEntry(message, entry);
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  if (best) {
    return { text: best.entry.answer, matched: true, category: best.entry.category };
  }

  return {
    text: "I don't have an answer for that yet in my knowledge base. Tap \"Talk to an Agent\" above and a real support agent will help you out.",
    matched: false,
  };
}
