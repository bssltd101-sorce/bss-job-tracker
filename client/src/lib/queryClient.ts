import { QueryClient } from "@tanstack/react-query";

// Use __PORT_5000__ placeholder so deploy_website can rewrite it for the proxy
const BASE =
  typeof window !== "undefined" && (window as any).__PORT_5000__
    ? (window as any).__PORT_5000__
    : "";

export const API_BASE = BASE;

async function throwIfNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  body?: unknown,
  opts?: RequestInit
): Promise<Response> {
  const fullUrl = `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers: body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {},
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
    credentials: "include",
    ...opts,
  });
  await throwIfNotOk(res);
  return res;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const [url] = queryKey as string[];
        const res = await fetch(`${API_BASE}${url}`, { credentials: "include" });
        if (res.status === 401) throw new Error("UNAUTHORISED");
        await throwIfNotOk(res);
        return res.json();
      },
      retry: false,
      staleTime: 30_000,
    },
  },
});
