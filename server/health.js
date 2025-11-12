const fs = require("fs");
const path = require("path");

function resolveVersion() {
  try {
    const pkgPath = path.resolve(__dirname, "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function normalizeChecks(checks = {}) {
  return {
    dist: Boolean(checks.dist),
    contactRoute: Boolean(checks.contactRoute)
  };
}

function buildHealthPayload({ version = resolveVersion(), checks = {}, now = new Date() }) {
  const normalized = normalizeChecks(checks);
  const healthy = normalized.dist && normalized.contactRoute;
  return {
    status: healthy ? "ok" : "degraded",
    version,
    time: now.toISOString(),
    checks: normalized
  };
}

function createHealthHandler({ version = resolveVersion(), getChecks }) {
  if (typeof getChecks !== "function") {
    throw new Error("createHealthHandler requires a getChecks() function.");
  }
  return (_req, res) => {
    const payload = buildHealthPayload({ version, checks: getChecks() });
    res.set("Cache-Control", "no-cache");
    res.status(200).json(payload);
  };
}

module.exports = {
  resolveVersion,
  buildHealthPayload,
  createHealthHandler
};
