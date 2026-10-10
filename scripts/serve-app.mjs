#!/usr/bin/env node
/**
 * Servidor estático para controlar el timbre desde el celular.
 *
 *   npm run build      (genera app/dist)
 *   npm run serve      (http://<IP-de-la-PC>:4173 desde cualquier celular de la red)
 *
 * Opcional: PORT=4180 npm run serve
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..', 'app', 'dist'));
const PORT = Number(process.env.PORT || 4173);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

async function sendFile(res, filePath) {
  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Error leyendo el archivo');
  }
}

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url || '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('..')) {
      res.writeHead(403);
      res.end('Prohibido');
      return;
    }

    let filePath = normalize(join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Prohibido');
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, 'index.html');
      info = await stat(filePath).catch(() => null);
    }

    // SPA: todo lo que no sea un archivo real responde index.html
    if (!info) {
      filePath = join(ROOT, 'index.html');
      info = await stat(filePath).catch(() => null);
    }

    if (!info) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('app/dist no existe. Ejecuta primero: npm run build');
      return;
    }

    await sendFile(res, filePath);
  })();
});

server.on('error', error => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Usa: PORT=4174 npm run serve`);
  } else {
    console.error('Error del servidor:', error);
  }
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  const addresses = [];
  for (const infos of Object.values(networkInterfaces())) {
    for (const info of infos || []) {
      if (info.family === 'IPv4' && !info.internal) addresses.push(info.address);
    }
  }

  console.log('Servidor de la app listo para el celular:');
  console.log(`  PC/local : http://localhost:${PORT}`);
  for (const address of addresses) {
    console.log(`  Celular  : http://${address}:${PORT}`);
  }
  if (addresses.length === 0) {
    console.log('  (sin red detectada: conecta la PC al WiFi del colegio)');
  }
  console.log('');
  console.log('Para que Windows permita el acceso desde el celular, ejecuta en PowerShell:');
  console.log(
    `  netsh advfirewall firewall add rule name="Timbre Escolar app" dir=in action=allow protocol=TCP localport=${PORT}`
  );
});
