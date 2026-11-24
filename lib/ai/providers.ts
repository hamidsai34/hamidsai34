/**
 * Calls the AI provider chosen by the user, with the user's own API key.
 * Runs on the server only. Keys are never sent to the browser and never logged.
 */

export type Provider = "gemini" | "openai" | "anthropic";

export const PROVIDERS: Record<Provider, { label: string; defaultModel: string; keyPrefix: string; keyUrl: string }> = {
  gemini: {
    label: "Google Gemini",
    defaultModel: "gemini-2.5-flash",
    keyPrefix: "AIza",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  openai: {
    label: "OpenAI (ChatGPT)",
    defaultModel: "gpt-4o-mini",
    keyPrefix: "sk-",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Anthropic (Claude)",
    defaultModel: "claude-haiku-5-5",
    keyPrefix: "sk-ant-",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
};

export function isProvider(value: string): value is Provider {
  return value === "gemini" || value === "openai" || value === "anthropic";
}

export type ImageInput = { mimeType: string; data: Buffer };

export type AIRequest = {
  provider: Provider;
  model: string;
  apiKey: string;
  system: string;
  prompt: string;
  images?: ImageInput[];
  maxTokens?: number;
};

export class AIError extends Error {}

const TIMEOUT_MS = 60_000;

export async function callAI(req: AIRequest): Promise<string> {
  const images = req.images ?? [];
  const maxTokens = req.maxTokens ?? 1024;
  switch (req.provider) {
    case "gemini":
      return callGemini(req, images, maxTokens);
    case "openai":
      return callOpenAI(req, images, maxTokens);
    case "anthropic":
      return callAnthropic(req, images, maxTokens);
  }
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AIError("Impossible de joindre le fournisseur d'IA. Vérifiez votre connexion.");
  }
  // Gemini answers an invalid key with 400, so 400 is treated as a possible key problem too.
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new AIError("Requête refusée : vérifiez la clé API et le nom du modèle dans Paramètres.");
  }
  if (res.status === 429) {
    throw new AIError("Limite d'utilisation atteinte chez le fournisseur. Réessayez plus tard.");
  }
  if (!res.ok) {
    throw new AIError(`Le fournisseur d'IA a répondu avec une erreur (${res.status}).`);
  }
  return res.json();
}

async function callGemini(req: AIRequest, images: ImageInput[], maxTokens: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`;
  const parts: unknown[] = [{ text: req.prompt }];
  for (const img of images) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") } });
  }
  const json = (await post(url, { "x-goog-api-key": req.apiKey }, {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
  })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new AIError("Réponse vide du fournisseur d'IA.");
  return text;
}

async function callOpenAI(req: AIRequest, images: ImageInput[], maxTokens: number): Promise<string> {
  const content: unknown[] = [{ type: "text", text: req.prompt }];
  for (const img of images) {
    content.push({ type: "image_url", image_url: { url: `data:${img.mimeType};base64,${img.data.toString("base64")}` } });
  }
  const json = (await post("https://api.openai.com/v1/chat/completions", {
    authorization: `Bearer ${req.apiKey}`,
  }, {
    model: req.model,
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content },
    ],
  })) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AIError("Réponse vide du fournisseur d'IA.");
  return text;
}

async function callAnthropic(req: AIRequest, images: ImageInput[], maxTokens: number): Promise<string> {
  const content: unknown[] = [];
  for (const img of images) {
    content.push({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data.toString("base64") } });
  }
  content.push({ type: "text", text: req.prompt });
  const json = (await post("https://api.anthropic.com/v1/messages", {
    "x-api-key": req.apiKey,
    "anthropic-version": "2023-06-01",
  }, {
    model: req.model,
    max_tokens: maxTokens,
    system: req.system,
    messages: [{ role: "user", content }],
  })) as { content?: { type: string; text?: string }[] };
  const text = json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
  if (!text) throw new AIError("Réponse vide du fournisseur d'IA.");
  return text;
}
