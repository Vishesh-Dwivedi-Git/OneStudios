const API_BASE = "http://localhost:5000";

export async function apiRequest(
  endpoint: string,
  data?: any,
  method: "POST" | "GET" = "POST"
) 
 {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include", // 🔴 REQUIRED for cookies
    body: method === "GET" ? undefined : JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}
