export const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const API_ORIGIN = API.replace(/\/api\/?$/, "");

// Uploaded photos are saved as "/api/images/<id>"; older products may use a full web link.
export const imgSrc = (url) => (!url ? "" : /^https?:/.test(url) ? url : API_ORIGIN + url);

// Always returns a list of { url, color }, including products made before multiple photos existed.
export const productImages = (p) =>
  p.images && p.images.length ? p.images : p.imageUrl ? [{ url: p.imageUrl, color: p.color || "" }] : [];

export const pkr = (n) => `PKR ${Number(n || 0).toLocaleString("en-PK")}`;

export const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });

// Small fetch wrapper. Throws an Error (with .status) when the request fails.
export async function api(path, { auth = false, method = "GET", body, raw } = {}) {
  const headers = { "Content-Type": raw ? raw.type : "application/json" };
  if (auth) headers.Authorization = `Bearer ${sessionStorage.getItem("adminToken")}`;

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: raw ? raw : body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Check that the backend is running.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "The request failed.");
    error.status = response.status;
    throw error;
  }
  return data;
}
