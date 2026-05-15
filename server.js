const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "journal.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

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

    if (request.url === "/api/upload" && request.method === "POST") {
      await saveUpload(request, response);
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
  await backupJournal();
  await fs.writeFile(DATA_FILE, `${body}\n`, "utf8");
  send(response, 200, JSON.stringify({ ok: true }), "application/json; charset=utf-8");
}

async function backupJournal() {
  try {
    const current = await fs.readFile(DATA_FILE, "utf8");
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await fs.writeFile(path.join(BACKUP_DIR, `journal-backup-${stamp}.json`), current, "utf8");
    const backups = (await fs.readdir(BACKUP_DIR))
      .filter((name) => name.startsWith("journal-backup-"))
      .sort()
      .reverse();
    await Promise.all(backups.slice(25).map((name) => fs.unlink(path.join(BACKUP_DIR, name))));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

async function saveUpload(request, response) {
  const body = JSON.parse(await readBody(request));
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(body.data || "");
  if (!match) {
    send(response, 400, JSON.stringify({ error: "Invalid image data" }), "application/json; charset=utf-8");
    return;
  }
  const extension = mimeExtension(match[1]);
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(match[2], "base64"));
  send(response, 200, JSON.stringify({ path: `/data/uploads/${filename}` }), "application/json; charset=utf-8");
}

function mimeExtension(mime) {
  return {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  }[mime] || "png";
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
      if (body.length > 25_000_000) {
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
