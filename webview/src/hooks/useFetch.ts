import { useVsCodeApi } from "@hooks/useVsCodeApi";
import { useCallback, useEffect, useState } from "react";

interface FetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(command: string, initialPayload?: any): FetchResult<T> {
  const vscode = useVsCodeApi();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    vscode.postMessage({ command, payload: initialPayload });
  }, [vscode, command, initialPayload]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === `${command}Update`) {
        setData(message.payload);
        setLoading(false);
      } else if (message.type === `${command}Error`) {
        setError(message.payload);
        setLoading(false);
      }
    };

    window.addEventListener("message", handleMessage);
    vscode.postMessage({ command, payload: initialPayload });

    return () => window.removeEventListener("message", handleMessage);
  }, [command, initialPayload, vscode]);

  return { data, loading, error, refetch: fetchData };
}
