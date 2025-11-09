import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 4000;

function findDistRoot() {
  const base = path.resolve("dist");
  if (!fs.existsSync(base)) return null;

  // Prefer dist/<project>/browser (Universal pattern)
  const entries = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory());
  for (const ent of entries) {
    const browser = path.join(base, ent.name, "browser");
    if (fs.existsSync(path.join(browser, "index.html"))) return browser;
  }
  // Fallback: dist/<project>
  for (const ent of entries) {
    const p = path.join(base, ent.name);
    if (fs.existsSync(path.join(p, "index.html"))) return p;
  }
  // Last resort: dist itself
  if (fs.existsSync(path.join(base, "index.html"))) return base;
  return null;
}

const distRoot = findDistRoot();
if (!distRoot) {
  console.error("❌ Could not locate Angular build (index.html) under ./dist");
  process.exit(1);
}

app.disable("x-powered-by");
app.use(compression());

// Static assets with cache; HTML not cached
app.use((req, res, next) => {
  if (/\.(?:js|css|png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)$/.test(req.path)) {
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  } else if (req.path.endsWith(".html")) {
    res.setHeader("Cache-Control", "no-cache");
  }
  next();
});

app.use(express.static(distRoot, { index: false }));

// SPA fallback
app.get("*", (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.sendFile(path.join(distRoot, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ openmicjoy static server on :${PORT} serving ${distRoot}`);
});
