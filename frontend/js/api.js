// Thin fetch wrapper for the Django API.
// Same-origin requests carry the session cookie + CSRF token automatically.
const API = (() => {
  const BASE = "/api";

  function csrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }

  async function request(path, { method = "GET", body, headers = {} } = {}) {
    const opts = {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" && method !== "HEAD" ? { "X-CSRFToken": csrfToken() } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    };

    const res = await fetch(`${BASE}${path}`, opts);
    const payload = res.status === 204 ? null : await res.json().catch(() => null);

    if (!res.ok) {
      const detail = payload && (payload.detail || payload.non_field_errors?.[0]);
      throw new Error(detail || `Request failed (${res.status})`);
    }
    return payload;
  }

  return {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: "POST", body }),
    patch: (p, body) => request(p, { method: "PATCH", body }),
    del: (p) => request(p, { method: "DELETE" }),
  };
})();
