#!/usr/bin/env node
/**
 * Mock del ESP32 para probar la app sin hardware.
 *
 * Uso:
 *   node scripts/mock-esp32.mjs          (puerto 81, igual que el firmware)
 *   node scripts/mock-esp32.mjs 8181     (otro puerto)
 *
 * Luego arranca la app con el mismo puerto:
 *   VITE_WS_URL=ws://localhost:8181 npm run dev   (o edita localStorage "timbre.wsUrl")
 */

import { createServer } from 'node:http';

async function loadWs() {
  const candidates = ['ws', '../app/node_modules/ws/index.js'];
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      const ns = mod?.default?.WebSocketServer ? mod.default : mod;
      if (typeof ns?.WebSocketServer === 'function') return ns;
    } catch {
      /* intenta el siguiente */
    }
  }
  throw new Error('No se encontró la librería "ws". Ejecuta: npm install ws --prefix app');
}

const { WebSocketServer } = await loadWs();

const TOKEN = 'timbre-escolar-2024';
const DEVICE_ID = 'ESP32-MOCK';
const FIRMWARE_VERSION = '1.0.0-mock';
const port = Number(process.argv[2] || 81);

const clients = new Set();
let relayOn = false;
let demoMode = false;
let lastSync = 0;
let scheduledCount = 0;

function nowIso() {
  return new Date().toISOString();
}

function send(socket, event, data) {
  if (socket.readyState === 1) socket.send(JSON.stringify({ event, data }));
}

function broadcast(event, data) {
  const message = JSON.stringify({ event, data });
  for (const socket of clients) {
    if (socket.readyState === 1) socket.send(message);
  }
}

function buildStatus() {
  return {
    connected: true,
    wifi: true,
    lastSync: lastSync,
    deviceTime: new Date().toTimeString().slice(0, 8),
    nextEvent: demoMode ? 'Demo activa' : 'Próximo timbre 09:30',
    lastBell: lastBellTime || '--:--',
    lastEvent: lastBellEvent || '',
    scheduledCount,
    relayState: relayOn,
  };
}

let lastBellTime = '--:--';
let lastBellEvent = '';

function heartbeat() {
  broadcast('status', buildStatus());
}

function activateRelay(durationSec, trigger) {
  relayOn = true;
  const startedAt = Date.now();
  setTimeout(() => {
    relayOn = false;
    heartbeat();
  }, durationSec * 1000);

  lastBellTime = new Date().toTimeString().slice(0, 5);
  lastBellEvent = trigger.eventName;

  broadcast('bell:executed', {
    eventName: trigger.eventName,
    timestamp: nowIso(),
    eventType: trigger.eventType || 'cambio_periodo',
    journey: trigger.journey || 'matutina',
    triggeredBy: trigger.triggeredBy || 'manual',
    executed: true,
    actualBellTime: nowIso(),
    durationSeconds: durationSec,
    deviceId: DEVICE_ID,
    firmwareVersion: FIRMWARE_VERSION,
    relayActiveMs: Date.now() - startedAt,
  });
}

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      device: DEVICE_ID,
      firmware: FIRMWARE_VERSION,
      wsPath: '/',
      clients: clients.size,
    })
  );
});

const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', socket => {
  clients.add(socket);
  console.log(`[mock] cliente conectado (${clients.size} en línea)`);
  send(socket, 'status', buildStatus());

  socket.on('message', raw => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      console.log('[mock] JSON inválido');
      return;
    }

    if (msg.token !== TOKEN) {
      console.log('[mock] token inválido');
      socket.send(
        JSON.stringify({
          event: 'error',
          code: 'UNAUTHORIZED',
          message: 'Token inválido o faltante',
        })
      );
      return;
    }

    const data = msg.data || {};
    console.log(`[mock] evento recibido: ${msg.event}`);

    switch (msg.event) {
      case 'sync:request': {
        lastSync = Date.now();
        scheduledCount = Array.isArray(data.journeys)
          ? data.journeys.reduce((total, journey) => total + (journey.events?.length || 0), 0)
          : 0;
        send(socket, 'sync:progress', { progress: 100 });
        send(socket, 'sync:complete', {
          version: data.version || 0,
          hash: `mock-${Math.random().toString(36).slice(2, 10)}`,
        });
        heartbeat();
        break;
      }
      case 'bell:manual':
        activateRelay(Number(data.durationSec || 3), {
          eventName: data.eventName || 'Timbre manual',
          triggeredBy: 'manual',
        });
        break;
      case 'bell:test':
        activateRelay(Number(data.durationSec || 3), {
          eventName: data.eventName || 'Prueba de timbre',
          triggeredBy: 'test',
        });
        break;
      case 'time:sync':
        lastSync = Date.now();
        send(socket, 'time:synced', { deviceTime: nowIso() });
        heartbeat();
        break;
      case 'demo:start':
        demoMode = true;
        console.log('[mock] demo iniciada');
        heartbeat();
        break;
      case 'demo:stop':
        demoMode = false;
        console.log('[mock] demo detenida');
        heartbeat();
        break;
      case 'demo:speed':
        console.log(`[mock] velocidad demo: ${data.speed}`);
        break;
      case 'demo:trigger':
        activateRelay(Number(data.durationSec || 3), {
          eventName: data.eventName || 'Evento demo',
          eventType: data.eventType || 'actividad_especial',
          triggeredBy: 'demo',
        });
        break;
      case 'config:update':
        console.log('[mock] config actualizada');
        send(socket, 'config:applied', { ok: true });
        break;
      default:
        console.log(`[mock] evento no soportado: ${msg.event}`);
        break;
    }
  });

  socket.on('close', () => {
    clients.delete(socket);
    console.log(`[mock] cliente desconectado (${clients.size} en línea)`);
  });
});

httpServer.listen(port, () => {
  console.log(`ESP32 mock escuchando en ws://localhost:${port}`);
  console.log(`Token esperado: ${TOKEN}`);
});
