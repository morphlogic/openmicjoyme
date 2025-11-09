const express = require("express");
const compression = require("compression");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", 1); // behind nginx-proxy on the same host/network
const PORT = process.env.PORT || 4000;

/** Auto-detect Angular dist root */
function findDistRoot() {
  const base = path.resolve("dist");
  if (!fs.existsSync(base)) return null;
  const entries = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const ent of entries) {
    const browser = path.join(base, ent.name, "browser");
    if (fs.existsSync(path.join(browser, "index.html"))) return browser;
  }
  for (const ent of entries) {
    const p = path.join(base, ent.name);
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  if (fs.existsSync(path.join(base, "index.html"))) return base;
  return null;
}

const distRoot = process.env.DIST_ROOT || findDistRoot();
const hasDist = distRoot && fs.existsSync(path.join(distRoot, "index.html"));
if (!hasDist) {
  console.warn("⚠️ Angular build not found. Serving placeholder.");
  app.get("/", (_, res) => res.status(503).send("OMJ runtime up, no Angular build found."));
} else {
  app.use(express.static(distRoot, { index: false }));
  app.get(/.*/, (req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distRoot, "index.html"));
  });
}


app.disable("x-powered-by");
app.use(compression());
app.use(express.json({ limit: "64kb" })); // for /api/contact

// Cache policy: long-cache for assets, no-cache for HTML
app.use((req, res, next) => {
  if (/\.(?:js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)$/.test(req.path)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.path.endsWith(".html")) {
    res.setHeader("Cache-Control", "no-cache");
  }
  next();
});

// --- Contact endpoint (rate-limited, simple honeypot) ---
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });
const isBot = (body) => typeof body.honey === "string" && body.honey.trim() !== "";

const {
  SMTP_HOST = "smtp.sendgrid.net",
  SMTP_PORT = "587",
  SMTP_USER = "apikey",
  SMTP_PASS = "",
  CONTACT_TO = "sam@samshaw.us",
  CONTACT_FROM = "OMJ Contact <no-reply@openmicjoy.me>"
} = process.env;

function getTransport() {
  if (!SMTP_PASS) throw new Error("SMTP_PASS not set");
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
    if (isBot({ honey })) return res.status(202).json({ ok: true }); // silent accept

    const tooLong = (name+email+message).length > 8000;
    if (!message || tooLong) return res.status(400).json({ ok: false, error: "bad_request" });

    const text =
`New OMJ contact form submission:

Name: ${name || "(not provided)"}
Email: ${email || "(not provided)"}

Message:
${message}
`;

    const transporter = getTransport();
    await transporter.sendMail({
      from: CONTACT_FROM,
      replyTo: email || undefined,
      to: CONTACT_TO,
      subject: `[OMJ] Contact form — ${name || "(anonymous)"}`,
      text
    });

    res.status(202).json({ ok: true });
  } catch (err) {
    console.error("contact error:", err.message);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// Health check
app.get("/health", (_, res) => res.status(200).json({ ok: true, ts: Date.now() }));

// Static Angular files (no index)
app.use(express.static(distRoot, { index: false }));

// Express 5-safe SPA fallback
app.get(/.*/, (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(distRoot, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ OMJ serving ${distRoot} on :${PORT}`);
});
