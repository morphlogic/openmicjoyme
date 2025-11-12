const express = require("express");
const compression = require("compression");
const nodemailer = require("nodemailer");
const rateLimit = require("express-rate-limit");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const { randomUUID } = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;

// trust nginx-proxy hop
app.set("trust proxy", 1);

// body + gzip
app.use(compression());
app.use(express.json({ limit: "64kb" }));

// ---------- HEALTH (must be BEFORE static + SPA fallback) ----------
app.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.status(200).json({ ok: true, ts: Date.now() });
});
app.head("/health", (_req, res) => res.sendStatus(200));

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
if (!hasDist) console.warn("⚠️ Angular build not found; SPA fallback will 503");

// ---------- Contact endpoint ----------
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });
const isBot = (b) => typeof b?.honey === "string" && b.honey.trim() !== "";

const ROLE_LABELS = {
  comedian: "Comedian",
  showrunner: "Showrunner",
  venueOwner: "Venue Owner",
  other: "Other"
};
const EVENT_ROLE_SET = new Set(["comedian", "showrunner", "venueOwner"]);

const EVENT_REQUEST_LABELS = {
  added: "Added",
  removed: "Removed",
  updated: "Updated",
  none: "None of the above"
};
const ACTIONABLE_REQUEST_SET = new Set(["added", "removed", "updated"]);

const FREQUENCY_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  one_time: "One time"
};

const MONTHLY_PATTERN_LABELS = {
  weekday: "Weekday of month",
  date: "Specific date",
  other: "Other"
};

const ORDINAL_LABELS = {
  first: "First",
  second: "Second",
  third: "Third",
  fourth: "Fourth",
  last: "Last"
};

const WEEKDAY_LABELS = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday"
};

const VALID_ROLES = new Set(Object.keys(ROLE_LABELS));
const VALID_REQUESTS = new Set(Object.keys(EVENT_REQUEST_LABELS));
const VALID_FREQUENCIES = new Set(Object.keys(FREQUENCY_LABELS));
const VALID_MONTHLY_PATTERNS = new Set(Object.keys(MONTHLY_PATTERN_LABELS));
const VALID_ORDINALS = new Set(Object.keys(ORDINAL_LABELS));
const VALID_WEEKDAYS = new Set(Object.keys(WEEKDAY_LABELS));

const EVENT_STORAGE_DIR = path.resolve(process.env.EVENT_STORAGE_DIR || "data");
const EVENT_STORAGE_FILE = path.join(EVENT_STORAGE_DIR, "event-submissions.json");

const passFromFile = process.env.SMTP_PASS_FILE && (() => {
  try { return fs.readFileSync(process.env.SMTP_PASS_FILE, "utf8").trim(); } catch { return ""; }
})();
const {
  SMTP_HOST = "smtp.sendgrid.net",
  SMTP_PORT = "587",
  SMTP_USER = "apikey",
  CONTACT_TO = "sam@samshaw.us",
  CONTACT_FROM = "OMJ Contact <no-reply@openmicjoy.me>"
} = process.env;
const SMTP_PASS = process.env.SMTP_PASS || passFromFile || "";

function getTransport() {
  if (!SMTP_PASS) throw new Error("SMTP_PASS not set (env or secret file)");
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: false, // 587 STARTTLS
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeStyle: "short"
});

function normalizeContactPayload(body) {
  const src = typeof body === "object" && body ? body : {};
  const clean = (value) => (typeof value === "string" ? value.trim() : "");
  const role = VALID_ROLES.has(src.role) ? src.role : "other";
  const eventRequestType = VALID_REQUESTS.has(src.eventRequestType) ? src.eventRequestType : "none";
  const frequency = VALID_FREQUENCIES.has(src.frequency) ? src.frequency : "";
  const monthlyPattern = VALID_MONTHLY_PATTERNS.has(src.monthlyPattern) ? src.monthlyPattern : "weekday";
  const monthlyOrdinal = VALID_ORDINALS.has(src.monthlyOrdinal) ? src.monthlyOrdinal : "first";
  const monthlyWeekday = VALID_WEEKDAYS.has(src.monthlyWeekday) ? src.monthlyWeekday : "monday";
  const monthday = Number.parseInt(src.monthlyMonthday, 10);
  const monthlyMonthday = Number.isFinite(monthday) ? monthday : null;

  return {
    name: clean(src.name),
    email: clean(src.email),
    message: clean(src.message),
    role,
    eventRequestType,
    eventName: clean(src.eventName),
    eventDescription: clean(src.eventDescription),
    firstEventDate: typeof src.firstEventDate === "string" ? src.firstEventDate : "",
    frequency,
    monthlyPattern,
    monthlyOrdinal,
    monthlyWeekday,
    monthlyMonthday,
    monthlyOtherText: clean(src.monthlyOtherText)
  };
}

function needsEventDetails(payload) {
  return EVENT_ROLE_SET.has(payload.role) && ACTIONABLE_REQUEST_SET.has(payload.eventRequestType);
}

function validateEventPayload(payload) {
  if (!payload.eventName) return "missing_event_name";
  if (!payload.firstEventDate) return "missing_event_date";
  if (!payload.frequency) return "missing_frequency";

  if (payload.frequency === "monthly") {
    if (!payload.monthlyPattern) return "missing_monthly_pattern";
    if (payload.monthlyPattern === "weekday") {
      if (!VALID_ORDINALS.has(payload.monthlyOrdinal)) return "invalid_monthly_ordinal";
      if (!VALID_WEEKDAYS.has(payload.monthlyWeekday)) return "invalid_monthly_weekday";
    } else if (payload.monthlyPattern === "date") {
      if (typeof payload.monthlyMonthday !== "number" || payload.monthlyMonthday < 1 || payload.monthlyMonthday > 31) {
        return "invalid_monthly_day";
      }
    } else if (payload.monthlyPattern === "other") {
      if (!payload.monthlyOtherText || payload.monthlyOtherText.length < 5) return "invalid_monthly_other";
    }
  }

  return null;
}

function indentBlock(text) {
  return (text || "").split(/\r?\n/).map((line) => `  ${line}`);
}

function formatDateTime(value) {
  if (!value) return "(not provided)";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

function describeMonthly(payload) {
  if (payload.monthlyPattern === "weekday") {
    const ordinal = ORDINAL_LABELS[payload.monthlyOrdinal] || payload.monthlyOrdinal;
    const weekday = WEEKDAY_LABELS[payload.monthlyWeekday] || payload.monthlyWeekday;
    return `${ordinal} ${weekday} of each month`;
  }
  if (payload.monthlyPattern === "date") {
    if (typeof payload.monthlyMonthday === "number") {
      return `Day ${payload.monthlyMonthday} of each month`;
    }
    return "Specific date of each month";
  }
  if (payload.monthlyPattern === "other") {
    return payload.monthlyOtherText || "Custom cadence";
  }
  return "";
}

function describeFrequency(payload) {
  if (!payload.frequency) return "(not provided)";
  if (payload.frequency === "monthly") {
    const detail = describeMonthly(payload);
    return detail ? `${FREQUENCY_LABELS.monthly} — ${detail}` : FREQUENCY_LABELS.monthly;
  }
  return FREQUENCY_LABELS[payload.frequency] || payload.frequency;
}

function buildContactEmail(payload, includeEvent) {
  const lines = [];
  lines.push("New OMJ contact form submission");
  lines.push("");
  lines.push("Contact:");
  lines.push(`  - Name: ${payload.name || "(not provided)"}`);
  lines.push(`  - Email: ${payload.email || "(not provided)"}`);
  lines.push("");
  lines.push("Role & request:");
  lines.push(`  - Role: ${ROLE_LABELS[payload.role] || ROLE_LABELS.other}`);
  lines.push(`  - Request: ${EVENT_REQUEST_LABELS[payload.eventRequestType] || EVENT_REQUEST_LABELS.none}`);

  if (includeEvent) {
    lines.push("");
    lines.push("Event details:");
    lines.push(`  - Event name: ${payload.eventName || "(not provided)"}`);
    lines.push(`  - Change type: ${EVENT_REQUEST_LABELS[payload.eventRequestType] || EVENT_REQUEST_LABELS.none}`);
    lines.push(`  - First event: ${formatDateTime(payload.firstEventDate)}`);
    lines.push(`  - Frequency: ${describeFrequency(payload)}`);
    if (payload.eventDescription) {
      lines.push("  - Event description:");
      lines.push(...indentBlock(payload.eventDescription));
    }
  }

  lines.push("");
  lines.push("Message:");
  lines.push(...indentBlock(payload.message || "(no message provided)"));
  return lines.join("\n");
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createEventRecord(payload) {
  return {
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    role: payload.role,
    eventRequestType: payload.eventRequestType,
    eventName: payload.eventName,
    eventDescription: payload.eventDescription,
    firstEventDateLocal: payload.firstEventDate,
    firstEventDateIso: toIsoOrNull(payload.firstEventDate),
    frequency: payload.frequency,
    monthlyPattern: payload.monthlyPattern,
    monthlyOrdinal: payload.monthlyOrdinal,
    monthlyWeekday: payload.monthlyWeekday,
    monthlyMonthday: payload.monthlyMonthday,
    monthlyOtherText: payload.monthlyOtherText,
    contact: {
      name: payload.name,
      email: payload.email
    },
    message: payload.message
  };
}

async function persistEventSubmission(record) {
  try {
    await fsp.mkdir(EVENT_STORAGE_DIR, { recursive: true });
    const existing = await fsp.readFile(EVENT_STORAGE_FILE, "utf8").catch(() => "[]");
    let parsed = [];
    try {
      parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) parsed = [];
    } catch {
      parsed = [];
    }
    parsed.push(record);
    await fsp.writeFile(EVENT_STORAGE_FILE, JSON.stringify(parsed, null, 2));
  } catch (err) {
    console.error("failed to persist event submission", err.message);
  }
}

app.post("/api/contact", limiter, async (req, res) => {
  try {
    const incoming = req.body || {};
    if (isBot(incoming)) return res.status(202).json({ ok: true });

    const payload = normalizeContactPayload(incoming);
    if (!payload.message) return res.status(400).json({ ok: false, error: "bad_request" });

    const totalLength = [
      payload.name,
      payload.email,
      payload.message,
      payload.eventName,
      payload.eventDescription,
      payload.monthlyOtherText
    ].join("").length;
    if (totalLength > 16000) return res.status(400).json({ ok: false, error: "payload_too_large" });

    const includeEvent = needsEventDetails(payload);
    if (includeEvent) {
      const validationError = validateEventPayload(payload);
      if (validationError) return res.status(400).json({ ok: false, error: validationError });
    }

    const roleLabel = ROLE_LABELS[payload.role] || ROLE_LABELS.other;
    const text = buildContactEmail(payload, includeEvent);
    const t = getTransport();
    await t.sendMail({
      from: CONTACT_FROM,
      replyTo: payload.email || undefined,
      to: CONTACT_TO,
      subject: `[OMJ] Contact (${roleLabel}) — ${payload.name || "(anonymous)"}`,
      text
    });

    if (includeEvent) {
      await persistEventSubmission(createEventRecord(payload));
    }

    res.status(202).json({ ok: true });
  } catch (err) {
    console.error("contact error:", err.message);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

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

app.listen(PORT, () => {
  console.log(`✅ OMJ serving ${hasDist ? distRoot : "(no dist)"} on :${PORT}`);
});
