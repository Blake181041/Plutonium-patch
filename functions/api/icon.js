import { handleRequest } from "vanilliapxy";

export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  url.pathname = "/api/icon";

  const chunks = [];
  const headers = new Headers();
  let statusCode = 200;

  const req = {
    method: request.method,
    url: url.pathname + url.search,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.body,
    on() {}
  };

  const res = {
    statusCode,
    setHeader(name, value) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : String(value));
    },
    writeHead(status, responseHeaders) {
      statusCode = status;
      for (const [name, value] of Object.entries(responseHeaders || {})) this.setHeader(name, value);
    },
    write(chunk) {
      chunks.push(chunk);
    },
    end(chunk) {
      if (chunk !== undefined) chunks.push(chunk);
    }
  };

  await handleRequest(req, res);

  const body = chunks.map(chunk =>
    typeof chunk === "string" ? new TextEncoder().encode(chunk) :
    chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
  );
  const total = body.reduce((n, chunk) => n + chunk.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of body) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(output, { status: statusCode, headers });
}
