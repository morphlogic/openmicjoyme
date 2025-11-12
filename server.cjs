const express = require("express");
const compression = require("compression");
let rateLimit = null;
try {
  rateLimit = require("express-rate-limit");
} catch (err) {
  console.warn("express-rate-limit not available; continuing without rate limiting.");
}
const path = require("path");
const fs = require("fs");
const { createHealthHandler, resolveVersion } = require("./server/health");

let nodemailer = null;
try {
  nodemailer = require("nodemailer");
} catch (err) {
  if (process.env.CONTACT_DELIVERY_DISABLED === "true") {
    console.warn("nodemailer not installed; relying on CONTACT_DELIVERY_DISABLED.");
  } else {
    throw err;
  }
}

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";
const APP_VERSION = process.env.APP_VERSION || resolveVersion();
const healthChecks = { dist: false, contactRoute: false };

// trust nginx-proxy hop
app.set("trust proxy", 1);

// body + gzip
app.use(compression());
app.use(express.json({ limit: "64kb" }));

// ---------- Angular dist detection ----------
function findDistRoot() {
  const base = path.resolve("dist");
  if (!fs.existsSync(base)) return null;
  const dirs = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const d of dirs) {
    const browser = path.join(base, d.name, "browser");
    if (fs.existsSync(path.join(browser, "index.html"))) return browser;
  }
  for (const d of dirs) {
    const p = path.join(base, d.name);
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  if (fs.existsSync(path.join(base, "index.html"))) return base;
  return null;
}
const distRoot = process.env.DIST_ROOT || findDistRoot();
const hasDist = distRoot && fs.existsSync(path.join(distRoot, "index.html"));
healthChecks.dist = Boolean(hasDist);
if (!hasDist) console.warn("⚠️ Angular build not found; SPA fallback will 503");

// ---------- Contact endpoint ----------
const limiter = rateLimit
  ? rateLimit({ windowMs: 10 * 60 * 1000, max: 10 })
  : (_req, _res, next) => next();
const isBot = (b) => typeof b?.honey === "string" && b.honey.trim() !== "";

const passFromFile = process.env.SMTP_PASS_FILE && (() => {
  try { return fs.readFileSync(process.env.SMTP_PASS_FILE, "utf8").trim(); } catch { return ""; }
})();
const {
  SMTP_HOST = "smtp.sendgrid.net",
  SMTP_PORT = "587",
  SMTP_USER = "apikey",
  CONTACT_TO = "sam@samshaw.us",
  CONTACT_FROM = "OMJ Contact <no-reply@openmicjoy.me>",
  CONTACT_DELIVERY_DISABLED = "false"
} = process.env;
const SMTP_PASS = process.env.SMTP_PASS || passFromFile || "";
const isContactDeliveryDisabled = CONTACT_DELIVERY_DISABLED === "true";

function getTransport() {
  if (!nodemailer) {
    throw new Error("nodemailer is not available; cannot deliver email.");
  }
  if (!SMTP_PASS) throw new Error("SMTP_PASS not set (env or secret file)");
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false, // 587 STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

app.post("/api/contact", limiter, async (req, res) => {
  try {
    const { name = "", email = "", message = "", honey = "" } = req.body || {};
    if (isBot({ honey })) return res.status(202).json({ ok: true });

    const tooLong = (name + email + message).length > 8000;
    if (!message || tooLong) return res.status(400).json({ ok: false, error: "bad_request" });

    const text = `New OMJ contact form submission:\n\nName: ${name || "(not provided)"}\nEmail: ${email || "(not provided)"}\n\nMessage:\n${message}\n`;
    if (isContactDeliveryDisabled) {
      console.warn("CONTACT_DELIVERY_DISABLED=true; skipping email send.");
    } else {
      const t = getTransport();
      await t.sendMail({
        from: CONTACT_FROM,
        replyTo: email || undefined,
        to: CONTACT_TO,
        subject: `[OMJ] Contact form — ${name || "(anonymous)"}`,
        text
      });
    }
    res.status(202).json({ ok: true });
  } catch (err) {
    console.error("contact error:", err.message);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});
healthChecks.contactRoute = true;

// ---------- HEALTH (must be BEFORE static + SPA fallback) ----------
app.get("/health", createHealthHandler({
  version: APP_VERSION,
  getChecks: () => ({ ...healthChecks })
}));
app.head("/health", (_req, res) => res.sendStatus(200));

// ---------- Static files (no index) ----------
if (hasDist) {
  app.use(express.static(distRoot, { index: false, fallthrough: true }));
}

// ---------- SPA fallback LAST ----------
app.get(/.*/, (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  if (!hasDist) return res.status(503).send("OMJ runtime up, but Angular dist not found.");
  res.sendFile(path.join(distRoot, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`✅ OMJ serving ${hasDist ? distRoot : "(no dist)"} on ${HOST}:${PORT}`);
});
