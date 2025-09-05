import { verifyAuth } from "#verifyAuth";
import { z } from "zod";
import { zerialize } from "zodex";
import { serializeError } from "#serializeError";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE = process.env.OPENAI_API_BASE; // optional override

const inputSchema = z.object({
  prompt: z.string().min(4),
  ast: z.any().optional(),
  model: z.string().optional(),
});

const buildInput = ({ prompt, ast }) => {
  const guidelines = [
    "Create a concise, human-readable title for a saved CRM search.",
    "Requirements:",
    "- 3 to 10 words, 80 chars max.",
    "- Use Title Case where natural.",
    "- No quotes, code fences, or markdown.",
    "- Avoid punctuation except hyphen when helpful.",
    "- Make it specific (include year/instance name if present).",
  ].join("\n");

  const parts = [
    guidelines,
    "",
    "User Prompt:",
    prompt,
  ];
  if (ast) {
    parts.push("", "Segment AST (optional):", JSON.stringify(ast));
  }
  parts.push("", "Return ONLY the title text.");
  return parts.join("\n");
};

const sanitizeTitle = (t) => {
  if (!t) return "";
  let s = String(t).trim();
  // remove wrapping quotes or code fences
  s = s.replace(/^```[a-zA-Z]*\n?|```$/g, "");
  s = s.replace(/^"|"$/g, "");
  s = s.replace(/^'|'$/g, "");
  // collapse newlines
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 80) s = s.slice(0, 80).trim();
  return s;
};

export const post = [
  verifyAuth(["manager"]),
  async (req, res) => {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ message: "Server missing OPENAI_API_KEY" });
    }

    const parsed = inputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: serializeError(parsed) });
    }
    const { prompt, ast, model = process.env.OPENAI_MODEL || "gpt-5-nano" } = parsed.data;

    try {
      const client = new OpenAI({ apiKey: OPENAI_API_KEY, baseURL: OPENAI_BASE });
      const input = buildInput({ prompt, ast });
      const data = await client.responses.create({ model, input, reasoning: { effort: "minimal" } });
      const content = data?.output_text || "";
      const title = sanitizeTitle(content);
      if (!title) return res.status(502).json({ message: "LLM returned empty title" });
      return res.json({ title });
    } catch (e) {
      console.error("[CRM SAVED SEGMENTS][SUGGEST TITLE][POST] Error:", e);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
];

export const query = [
  verifyAuth(["manager"]),
  (_req, res) => res.json(zerialize(inputSchema)),
];

