export function subscribeToProgress(
  taskId: string,
  endpoint: "documents" | "reimbursements",
  callbacks: {
    onProgress: (stage: string, data: Record<string, unknown>) => void;
    onComplete: (result: Record<string, unknown>) => void;
    onError: (error: string) => void;
  }
): { close: () => void } {
  if (typeof window === "undefined") {
    callbacks.onError("SSE not available server-side");
    return { close: () => {} };
  }

  const path =
    endpoint === "reimbursements"
      ? `/api/v1/reimbursements/analyze/progress/${taskId}`
      : `/api/v1/documents/progress/${taskId}`;
  const eventSource = new EventSource(path);

  eventSource.addEventListener("progress", (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    callbacks.onProgress(data.stage, data);
  });

  eventSource.addEventListener("complete", (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    callbacks.onComplete(data);
    eventSource.close();
  });

  eventSource.addEventListener("error", (event: Event) => {
    if (event instanceof MessageEvent) {
      try {
        const data = JSON.parse(event.data as string);
        callbacks.onError(data.message || data.error || "Server processing error");
      } catch {
        callbacks.onError("Server error event received");
      }
    } else {
      callbacks.onError("SSE connection failed");
    }
    eventSource.close();
  });

  return { close: () => eventSource.close() };
}
