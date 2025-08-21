export async function adminFetch<T = any>(input: RequestInfo | URL, init: RequestInit = {}) {
    const res = await fetch(input, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
      cache: "no-store",
    });
  
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = await res.json();
        msg = j?.error || j?.message || msg;
      } catch {
        // pas besoin de throw res.statusText 2x ici, juste ça
      }
      throw new Error(msg);
    }
  
    return res.json() as Promise<T>; // JSON direct
  }
  