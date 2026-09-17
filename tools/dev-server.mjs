/** Petit serveur statique local pour l'aperçu.
 *  Usage :  node tools/dev-server.mjs
 *  - ouvre le navigateur automatiquement sur le bon port
 *  - si le port est occupé, passe au suivant (et l'annonce)
 *  - variables : PORT=xxxx pour forcer un port, NO_OPEN=1 pour ne pas ouvrir le navigateur
 */
import { createServer } from "node:http";
import { readFile, stat, writeFile, unlink } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const startPort = Number(process.env.PORT) || 4321;
const maxTries = 15;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/catalogue") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const parsed = JSON.parse(body);
      if (!parsed || !Array.isArray(parsed.instruments)) throw new Error("Format catalogue invalide");
      await writeFile(join(root, "assets/data/catalogue.json"), JSON.stringify(parsed, null, 2) + "\n", "utf8");
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method === "POST" && req.url.startsWith("/api/upload-photo")) {
      const url = new URL(req.url, "http://localhost");
      const name = url.searchParams.get("name") || "";
      if (!/^[a-z0-9][a-z0-9-]*\.jpg$/.test(name)) throw new Error("Nom de fichier invalide");
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buf = Buffer.concat(chunks);
      if (!buf.length) throw new Error("Fichier vide");
      const dest = normalize(join(root, "assets/img", name));
      if (!dest.startsWith(join(root, "assets/img"))) { res.writeHead(403).end("Forbidden"); return; }
      await writeFile(dest, buf);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, path: "assets/img/" + name }));
      return;
    }
    if (req.method === "POST" && req.url.startsWith("/api/delete-photo")) {
      const url = new URL(req.url, "http://localhost");
      const name = url.searchParams.get("name") || "";
      if (!/^[a-z0-9][a-z0-9-]*\.jpg$/.test(name)) throw new Error("Nom de fichier invalide");
      const dest = normalize(join(root, "assets/img", name));
      if (!dest.startsWith(join(root, "assets/img"))) { res.writeHead(403).end("Forbidden"); return; }
      await unlink(dest).catch(() => {}); // pas grave si le fichier n'existe déjà plus
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    let path = decodeURIComponent(req.url.split("?")[0]);
    if (path.endsWith("/")) path += "index.html";
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) { res.writeHead(403).end("Forbidden"); return; }
    let target = file;
    try { if ((await stat(target)).isDirectory()) target = join(target, "index.html"); }
    catch { /* ignore */ }
    let body;
    try {
      body = await readFile(target);
    } catch {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      body = await readFile(join(root, "404.html")).catch(() => "404");
      res.end(body);
      return;
    }
    res.writeHead(200, { "Content-Type": types[extname(target)] || "application/octet-stream" });
    res.end(body);
  } catch (e) {
    res.writeHead(500).end(String(e));
  }
});

function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", detached: true }).unref();
    } else if (process.platform === "darwin") {
      spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    } else {
      spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
  } catch { /* pas grave */ }
}

let started = false;

function tryListen(port, triesLeft) {
  const onError = (err) => {
    server.removeAllListeners("listening");
    if (err.code === "EADDRINUSE" && triesLeft > 0) {
      console.log(`  Port ${port} occupe, essai sur ${port + 1}...`);
      tryListen(port + 1, triesLeft - 1);
    } else {
      console.error("\n  Impossible de demarrer le serveur : " + err.message + "\n");
      process.exit(1);
    }
  };
  server.once("error", onError);
  server.listen(port, () => {
    if (started) return;
    started = true;
    server.removeListener("error", onError);
    const url = `http://localhost:${port}`;
    console.log(`\n  Le site tourne ici :  ${url}`);
    console.log(`  (laissez cette fenetre ouverte ; Ctrl + C pour arreter)\n`);
    openBrowser(url);
  });
}

tryListen(startPort, maxTries);
