const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;
const DATA = path.join(__dirname, 'data');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'gastronot-secret-change-me';

// ── Ensure data dir exists ───────────────────────────────────────────────
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware (write operations only) ──────────────────────────────
function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || !crypto.timingSafeEqual(
    Buffer.from(token.padEnd(64)), Buffer.from(ADMIN_TOKEN.padEnd(64))
  )) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Helper: read / write JSON files ─────────────────────────────────────
function readJSON(file, fallback) {
  try {
    const p = path.join(DATA, file);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) { console.error('readJSON', file, e.message); }
  return fallback;
}

function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2), 'utf8');
}

// ── CMS text & visibility ────────────────────────────────────────────────
app.get('/api/cms', (req, res) => {
  res.json(readJSON('cms.json', null));
});

app.post('/api/cms', requireAuth, (req, res) => {
  try {
    writeJSON('cms.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Partner logos ────────────────────────────────────────────────────────
app.get('/api/logos/partners', (req, res) => {
  res.json(readJSON('partner-logos.json', null));
});

app.post('/api/logos/partners', requireAuth, (req, res) => {
  try {
    writeJSON('partner-logos.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Client logos ─────────────────────────────────────────────────────────
app.get('/api/logos/clients', (req, res) => {
  res.json(readJSON('client-logos.json', null));
});

app.post('/api/logos/clients', requireAuth, (req, res) => {
  try {
    writeJSON('client-logos.json', req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── SPA fallback (index.html) ────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Gastronot server running on port ${PORT}`));
