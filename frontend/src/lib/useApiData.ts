import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import api, { errorMessage } from "./api";
export function useApiData<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<T>(path, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setData(response.data);
      })
      .catch((error) => {
        if (!axios.isCancel(error)) setError(errorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, version]);
  return { data, loading, error, reload };
}
