export const config = { runtime: "nodejs" };

const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/$/, "");

export default async function handler(req, res) {
  if (!BACKEND_URL) {
    return res.status(500).json({
      error: "BACKEND_URL belum dikonfigurasi di Vercel."
    });
  }

  try {
    const pathParts = req.query?.path;
    const backendPath = Array.isArray(pathParts)
      ? pathParts.join("/")
      : String(pathParts || "");

    const queryIndex = req.url.indexOf("?");
    const query = queryIndex >= 0 ? req.url.slice(queryIndex) : "";
    const targetUrl = `${BACKEND_URL}/${backendPath}${query}`;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers || {})) {
      const lower = key.toLowerCase();
      if (["host", "connection", "content-length"].includes(lower)) continue;
      if (value !== undefined) headers[key] = Array.isArray(value) ? value.join(",") : value;
    }

    let body;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      body = Buffer.concat(chunks);
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual"
    });

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!["transfer-encoding", "connection", "content-encoding"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("[VERCEL PROXY ERROR]", error);
    res.status(502).json({
      error: "Backend tidak dapat dihubungi.",
      detail: error.message
    });
  }
}
