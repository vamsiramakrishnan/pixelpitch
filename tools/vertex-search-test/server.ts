const HTML_PATH = new URL("./index.html", import.meta.url).pathname;

async function getAccessToken(): Promise<string> {
  const proc = Bun.spawn(["gcloud", "auth", "application-default", "print-access-token"], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const token = (await new Response(proc.stdout).text()).trim();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const err = await new Response(proc.stderr).text();
    throw new Error(`gcloud auth failed: ${err}`);
  }
  return token;
}

const PROJECT_ID = "vital-octagon-19612";

Bun.serve({
  port: 20500,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(Bun.file(HTML_PATH), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (url.pathname === "/api/search" && req.method === "POST") {
      const body = await req.json() as {
        query: string;
        model: string;
        location: string;
        enableImageSearch: boolean;
        enableWebSearch: boolean;
      };

      const token = await getAccessToken();
      const location = body.location || "us-central1";
      const model = body.model || "gemini-2.5-flash";

      const searchTool: Record<string, unknown> = {};
      if (body.enableImageSearch || body.enableWebSearch) {
        const searchTypes: Record<string, unknown> = {};
        if (body.enableWebSearch) searchTypes.webSearch = {};
        if (body.enableImageSearch) searchTypes.imageSearch = {};
        searchTool.googleSearch = { searchTypes };
      } else {
        searchTool.googleSearch = {};
      }

      const host = location === "global"
        ? "aiplatform.googleapis.com"
        : `${location}-aiplatform.googleapis.com`;
      const endpoint = `https://${host}/v1beta1/projects/${PROJECT_ID}/locations/${location}/publishers/google/models/${model}:generateContent`;

      const payload = {
        contents: [{ role: "user", parts: [{ text: body.query }] }],
        tools: [searchTool],
      };

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await resp.text();
      let data: unknown;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: { code: resp.status, status: "PARSE_ERROR", message: raw.slice(0, 500) } };
      }
      return Response.json({
        status: resp.status,
        endpoint,
        requestPayload: payload,
        response: data,
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log("Vertex Search Test → http://localhost:20500");
