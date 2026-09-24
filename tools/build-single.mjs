import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, "dist-single");
const outputHtml = path.join(outputDir, "plutonium.html");
const outputSvg = path.join(outputDir, "plutonium.svg");
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wasm": "application/wasm",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm"
};

function createServer() {
  return http.createServer((request, response) => {
    try {
      const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
      const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
      const filePath = path.resolve(root, relativePath);

      if (filePath !== root && !filePath.startsWith(root + path.sep)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
          response.writeHead(404);
          response.end("Not Found");
          return;
        }

        response.writeHead(200, {
          "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
          "Cache-Control": "no-store"
        });
        fs.createReadStream(filePath).pipe(response);
      });
    } catch {
      response.writeHead(400);
      response.end("Bad Request");
    }
  });
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function findBrowser() {
  if (process.env.PLUTONIUM_BROWSER) {
    return process.env.PLUTONIUM_BROWSER;
  }

  const candidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable"
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function createSvg(html) {
  const encoded = Buffer.from(html).toString("base64");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="100%" height="100%" viewBox="0 0 1280 720">',
    "<title>Plutonium Network</title>",
    "<desc>Standalone SVG wrapper containing the generated Plutonium single-file HTML.</desc>",
    '<foreignObject x="0" y="0" width="1280" height="720">',
    '<xhtml:iframe src="data:text/html;base64,' + encoded + '" width="1280" height="720" frameborder="0" style="width:100%;height:100%;border:0;display:block;background:#111"></xhtml:iframe>',
    "</foreignObject>",
    "</svg>"
  ].join("\n");
}

await fs.promises.rm(outputDir, { recursive: true, force: true });
await fs.promises.mkdir(outputDir, { recursive: true });

const browser = findBrowser();
if (!browser) {
  throw new Error("Chromium was not found. Set PLUTONIUM_BROWSER or install Chromium before running the build.");
}

const server = createServer();

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  await run(
    process.execPath,
    [
      path.join(root, "node_modules", "single-file-cli", "single-file-node.js"),
      `http://127.0.0.1:${port}/index.html`,
      outputHtml,
      `--browser-executable-path=${browser}`,
      '--browser-args=["--no-sandbox","--disable-dev-shm-usage"]',
      "--browser-wait-until=load",
      "--browser-wait-until-delay=4000",
      "--browser-load-max-time=120000",
      "--browser-capture-max-time=120000",
      "--block-scripts=false",
      "--block-fonts=false",
      "--block-images=false",
      "--block-audios=false",
      "--block-videos=false",
      "--remove-frames=false",
      "--remove-hidden-elements=false",
      "--remove-unused-styles=false",
      "--remove-unused-fonts=false",
      "--remove-alternative-fonts=false",
      "--remove-alternative-images=false",
      "--remove-alternative-medias=false",
      "--load-deferred-images=true",
      "--compress-HTML=true",
      "--self-extracting-archive=false",
      "--filename-conflict-action=overwrite"
    ]
  );

  if (!fs.existsSync(outputHtml) || fs.statSync(outputHtml).size === 0) {
    throw new Error("SingleFile did not produce dist-single/plutonium.html.");
  }

  const html = await fs.promises.readFile(outputHtml);
  await fs.promises.writeFile(outputSvg, createSvg(html));

  if (fs.statSync(outputSvg).size === 0) {
    throw new Error("SVG output was empty.");
  }

  console.log(`Built ${outputHtml} (${html.length} bytes)`);
  console.log(`Built ${outputSvg} (${fs.statSync(outputSvg).size} bytes)`);
} finally {
  await new Promise(resolve => server.close(resolve));
}
