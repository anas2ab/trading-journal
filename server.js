const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "journal.json");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.url === "/api/journal" && request.method === "GET") {
      await sendJournal(response);
      return;
    }

    if (request.url === "/api/journal" && request.method === "PUT") {
      await saveJournal(request, response);
      return;
    }

    if (request.method === "GET") {
      await sendStatic(request, response);
      return;
    }

    send(response, 405, "Method not allowed", "text/plain; charset=utf-8");
  } catch (error) {
    console.error(error);
    send(response, 500, JSON.stringify({ error: "Server error" }), "application/json; charset=utf-8");
  }
});

async function sendJournal(response) {
  try {
    const data = await fs.readFile(DATA_FILE, "utf8");
    send(response, 200, data, "application/json; charset=utf-8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    send(response, 404, JSON.stringify({ error: "No journal file yet" }), "application/json; charset=utf-8");
  }
}

async function saveJournal(request, response) {
  const body = await readBody(request);
  JSON.parse(body);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, `${body}\n`, "utf8");
  send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
}

async function sendStatic(request, response) {
  const urlPath = new URL(request.url, `http://localhost:${PORT}`).pathname;
  const cleanPath = urlPath === "/" ? "/index.html" : decodeURIComponent(urlPath);
  const filePath = path.normalize(path.join(ROOT, cleanPath));

  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    const type = contentTypes[path.extname(filePath)] || "application/octet-stream";
    send(response, 200, data, type);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    send(response, 404, "Not found", "text/plain; charset=utf-8");
  }
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function send(response, status, body, type) {
  response.writeHead(status, { "Content-Type": type });
  response.end(body);
}

server.listen(PORT, () => {
  console.log(`Trading Journal running at http://localhost:${PORT}`);
  console.log(`Journal file: ${DATA_FILE}`);
});
