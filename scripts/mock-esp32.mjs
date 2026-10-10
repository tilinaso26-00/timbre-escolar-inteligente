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
const FIRMWARE_VERSION = '1.0.1-mock';
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
    mode: 'AP+STA',
    apSSID: 'TimbreEscolar-Setup',
    apIP: '192.168.4.1',
    ip: '192.168.1.100',
    rssi: -45,
    staConnected: true,
    historyCount: mockHistory.length,
    uptime: Math.round(process.uptime() * 1000),
    freeHeap: 143000,
  };
}

// Historial que "guarda" el mock (para probar la importación en la app).
// 40 eventos a propósito: la app los baja en chunks de 25 (25 + 15),
// igual que con el ESP32 real (máx. 150).
const pad2 = n => String(n).padStart(2, '0');
const nowDate = new Date();
const today = `${nowDate.getFullYear()}-${pad2(nowDate.getMonth() + 1)}-${pad2(nowDate.getDate())}`;

const mockHistory = [];
for (let i = 0; i < 40; i++) {
  const hour = 7 + Math.floor(i / 60);
  const minute = i % 60;
  mockHistory.push({
    timestamp: `${today}T${pad2(hour)}:${pad2(minute)}:00`,
    eventName: i === 0 ? 'Apertura de puertas' : i === 1 ? 'Primera hora' : `Timbre ${i + 1}`,
    type: i === 0 ? 'entrada' : 'cambio_periodo',
    journey: i % 12 === 0 && i > 0 ? 'vespertina' : 'matutina',
    origin: 'automatic',
    durationSec: 3,
    executed: true,
    deviceId: DEVICE_ID,
    firmwareVersion: FIRMWARE_VERSION,
  });
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

  // Un solo timestamp para el evento en vivo y el historial guardado,
  // igual que el firmware (evita duplicados al importar)
  const stamp = nowIso();
  const bellTime = stamp.slice(11, 19);

  lastBellTime = new Date().toTimeString().slice(0, 5);
  lastBellEvent = trigger.eventName;

  broadcast('bell:executed', {
    eventName: trigger.eventName,
    timestamp: stamp,
    eventType: trigger.eventType || 'cambio_periodo',
    journey: trigger.journey || 'matutina',
    triggeredBy: trigger.triggeredBy || 'manual',
    executed: true,
    actualBellTime: bellTime,
    durationSeconds: durationSec,
    deviceId: DEVICE_ID,
    firmwareVersion: FIRMWARE_VERSION,
    relayActiveMs: Date.now() - startedAt,
  });

  // Paridad con el firmware: el timbre queda guardado en el historial
  // del "ESP32" aunque la app esté cerrada
  mockHistory.push({
    timestamp: stamp,
    eventName: trigger.eventName,
    type: trigger.eventType || 'cambio_periodo',
    journey: trigger.journey || 'matutina',
    origin: trigger.triggeredBy || 'manual',
    durationSec,
    executed: true,
    deviceId: DEVICE_ID,
    firmwareVersion: FIRMWARE_VERSION,
  });
  if (mockHistory.length > 150) mockHistory.splice(0, mockHistory.length - 150);
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
      case 'history:request': {
        const offset = Number(data.offset || 0);
        const limit = Number(data.limit || 25);
        const total = mockHistory.length;
        // Igual que el firmware: del más reciente al más viejo
        const end = total - offset;
        const start = Math.max(0, end - limit);
        const items = end > 0 ? mockHistory.slice(start, end).reverse() : [];
        send(socket, 'history:events', {
          offset,
          total,
          items,
          done: offset + items.length >= total,
        });
        break;
      }
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
