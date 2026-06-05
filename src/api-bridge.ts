export interface JsonErrorEnvelope {
  error?: string;
  message?: string;
}

export async function postJSON<T>(
  url: string,
  body: Record<string, unknown>,
  timeoutMs = 90_000,
): Promise<T> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const raw = await response.text();
  let parsedBody: T;
  try {
    parsedBody = JSON.parse(raw) as T;
  } catch {
    throw new Error(`Malformed JSON response (HTTP ${response.status}): ${raw.slice(0, 160)}`);
  }

  if (!response.ok) {
    const env = parsedBody as JsonErrorEnvelope;
    throw new Error(env.message || env.error || `HTTP ${response.status}`);
  }

  return parsedBody;
}
