import { api } from "../services/api";

// Saves a paid file using its one-time token. The token travels in a header, never in
// the URL, so it cannot end up in server, proxy or browser history logs.
export async function saveDownloadWithToken(token, fileName = "download") {
  const res = await api.get("/downloads/stream", {
    responseType: "blob",
    headers: { "X-Download-Token": token },
  });
  const url = URL.createObjectURL(res.data);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
