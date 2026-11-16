type Callbacks = {
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
  onCode: (code: string) => void;
};

/** Owns one request at a time, including its timeout and stale-response guard. */
export class GenerationRequest {
  private active: { controller: AbortController; timer?: ReturnType<typeof setTimeout> } | null = null;
  private callbacks: Callbacks;
  private timeoutMs: number;

  constructor(callbacks: Callbacks, timeoutMs = 90_000) {
    this.callbacks = callbacks;
    this.timeoutMs = timeoutMs;
  }

  cancel(notify = true) {
    const request = this.active;
    this.active = null;
    if (request) {
      clearTimeout(request.timer);
      request.controller.abort();
      if (notify) this.callbacks.onBusy(false);
    }
  }

  async generate(file: File, url: string) {
    if (this.active) return;
    const request = { controller: new AbortController(), timer: undefined as ReturnType<typeof setTimeout> | undefined };
    this.active = request;
    this.callbacks.onBusy(true);
    this.callbacks.onError("");
    request.timer = setTimeout(() => {
      if (this.active !== request) return;
      this.cancel();
      this.callbacks.onError("Generation timed out. Your previous code is preserved. Please try again.");
    }, this.timeoutMs);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(url, { method: "POST", body, signal: request.controller.signal });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new Error("The server returned an unreadable response. Please try again shortly.");
      }
      if (this.active !== request) return;
      const result = data && typeof data === "object" ? data as Record<string, unknown> : {};
      if (!response.ok || result.error) {
        let message = typeof result.error === "string" ? result.error : "Generation failed. Please try again shortly.";
        const retry = response.headers.get("Retry-After");
        if ((response.status === 429 || response.status === 503) && retry && /^\d+$/.test(retry)) {
          message += ` Try again in ${retry} seconds.`;
        }
        throw new Error(message);
      }
      if (typeof result.code !== "string" || !result.code.trim()) {
        throw new Error("No code was returned. Your previous code is preserved. Please try again.");
      }
      const { validateGeneratedCode } = await import("./validateCode.ts");
      if (this.active !== request) return;
      const validationError = validateGeneratedCode(result.code);
      if (validationError) {
        throw new Error(`The generated component could not be used: ${validationError} Your previous code is preserved. Please regenerate.`);
      }
      this.callbacks.onCode(result.code);
    } catch (error) {
      if (this.active !== request) return;
      this.callbacks.onError(error instanceof TypeError
        ? "Could not reach the server. Check your connection and try again."
        : error instanceof Error ? error.message : "Generation failed. Please try again.");
    } finally {
      clearTimeout(request.timer);
      if (this.active === request) {
        this.active = null;
        this.callbacks.onBusy(false);
      }
    }
  }
}
