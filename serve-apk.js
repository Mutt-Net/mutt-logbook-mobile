#!/usr/bin/env node
/**
 * Simple APK file server for sideloading.
 * Run: node serve-apk.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const APK_PATH = path.join(
  __dirname,
  'android/app/build/outputs/apk/debug/app-debug.apk'
);
const PORT = 8765;

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const iface of Object.values(interfaces)) {
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        ips.push(addr.address);
      }
    }
  }
  return ips;
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    // Landing page with download button
    const apkExists = fs.existsSync(APK_PATH);
    const apkSize = apkExists
      ? (fs.statSync(APK_PATH).size / 1024 / 1024).toFixed(1) + ' MB'
      : 'N/A';

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mutt Logbook - Download</title>
  <style>
    body { font-family: sans-serif; background: #1a1a2e; color: #e0e0e0;
           display: flex; flex-direction: column; align-items: center;
           justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #16213e; border-radius: 12px; padding: 2rem 3rem;
            text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }
    h1 { color: #4fc3f7; margin-bottom: 0.25rem; }
    .version { color: #90a4ae; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .btn { display: inline-block; background: #4fc3f7; color: #1a1a2e;
           padding: 0.8rem 2rem; border-radius: 8px; text-decoration: none;
           font-weight: bold; font-size: 1.1rem; margin-top: 0.5rem; }
    .btn:hover { background: #81d4fa; }
    .size { color: #78909c; font-size: 0.8rem; margin-top: 0.5rem; }
    .warn { background: #ff6f00; color: #fff; border-radius: 6px;
            padding: 0.4rem 0.8rem; font-size: 0.8rem; margin-top: 1rem;
            display: inline-block; }
    ${apkExists ? '' : '.btn { background: #546e7a; cursor: not-allowed; pointer-events: none; }'}
  </style>
</head>
<body>
  <div class="card">
    <h1>Mutt Logbook</h1>
    <div class="version">v1.2.1 · Debug Build</div>
    ${apkExists
      ? `<a class="btn" href="/mutt-logbook.apk">Download APK</a>
         <div class="size">${apkSize}</div>
         <div class="warn">⚠ Enable "Install unknown apps" in Android settings</div>`
      : `<div class="btn">APK not found</div>
         <div class="size">Run: cd android && ./gradlew assembleDebug</div>`
    }
  </div>
</body>
</html>`);
    return;
  }

  if (req.url === '/mutt-logbook.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK not built yet. Run: cd android && ./gradlew assembleDebug');
      return;
    }

    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="mutt-logbook.apk"',
    });
    fs.createReadStream(APK_PATH).pipe(res);

    console.log(`[${new Date().toISOString()}] APK downloaded (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIPs();
  console.log('\n  Mutt Logbook APK Server');
  console.log('  ─────────────────────────────────');
  console.log(`  Local:    http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Network:  http://${ip}:${PORT}`));
  console.log('\n  Open the Network URL on your Android device to download.\n');
});
