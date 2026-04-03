const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || "https://whitesmoke-lapwing-348992.hostingersite.com";
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || PUBLIC_API_URL;

const API_URL = PUBLIC_API_URL;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${INTERNAL_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    ...(typeof window === "undefined" ? { next: { revalidate: 300 } } : {})
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export { API_URL };
