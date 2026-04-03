import { useVsCodeApi } from "@hooks/useVsCodeApi";
import { useEffect, useState } from "react";

interface StreamResult {
  isStreaming: boolean;
  error: string | null;
}

export function useStream(
  onChunk: (chunk: any, id: string | number | undefined) => void
): StreamResult {
  const _vscode = useVsCodeApi();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (
        message.type === "agentUpdate" &&
        message.payload &&
        (message.payload.type === "done" || message.payload.type === "error")
      ) {
        setIsStreaming(false);
        return;
      }

      if (
        message.type === "streamChunk" ||
        message.type === "agentUpdate" ||
        message.type === "thoughtChunk" ||
        message.type === "activityLine"
      ) {
        setIsStreaming(true);
        onChunk(message.payload, message.id);
      } else if (message.type === "streamEnd") {
        setIsStreaming(false);
      } else if (message.type === "done") {
        setIsStreaming(false);
      } else if (message.type === "streamError" || message.type === "error") {
        setError(message.payload);
        setIsStreaming(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onChunk]);

  return { isStreaming, error };
}
