#!/usr/bin/env node
/**
 * Export .excalidraw files to PNG using headless Chromium.
 *
 * Usage:
 *   excalidraw-export <input.excalidraw> [output.png]
 *
 * Requires:
 *   npx playwright install chromium
 */

import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import { resolve, basename, dirname, join } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));

const input = process.argv[2];
if (!input) {
  console.error("Usage: excalidraw-export <input.excalidraw> [output.png]");
  process.exit(1);
}

const inputPath = resolve(input);
const output = process.argv[3] || input.replace(/\.excalidraw$/, ".png");
const outputPath = resolve(output);
const excalidrawData = JSON.parse(readFileSync(inputPath, "utf-8"));

console.log(`Exporting ${basename(inputPath)} -> ${basename(outputPath)}`);

// Serve the HTML page locally
const htmlContent = readFileSync(join(__dirname, "page.html"));
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(htmlContent);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("  browser error:", msg.text());
});

// Intercept Excalidraw's Excalifont request and serve a custom font instead
const FONT_WOFF2_URL =
  "https://fonts.gstatic.com/s/playpensans/v22/dg4i_pj1p6gXP0gzAZgm4c89TCIjqS-xRg.woff2";
await page.route("**/*Excalifont*", async (route) => {
  const resp = await fetch(FONT_WOFF2_URL);
  const body = Buffer.from(await resp.arrayBuffer());
  await route.fulfill({ body, contentType: "font/woff2" });
});

console.log("Loading Excalidraw library from esm.sh...");
await page.goto(`http://localhost:${port}`, {
  waitUntil: "networkidle",
  timeout: 60000,
});

try {
  await page.waitForFunction(() => window.__READY__ === true, {
    timeout: 60000,
  });
} catch {
  console.error("Failed to load Excalidraw module.");
  await browser.close();
  server.close();
  process.exit(1);
}

console.log("Excalidraw loaded. Exporting...");

const pngBase64 = await page.evaluate(async (data) => {
  const blob = await window.__exportToBlob({
    elements: data.elements,
    appState: {
      exportWithDarkMode: false,
      exportBackground: true,
      viewBackgroundColor: data.appState?.viewBackgroundColor || "#ffffff",
    },
    files: data.files || null,
    exportPadding: 40,
    getDimensions: (w, h) => ({ width: w * 2, height: h * 2, scale: 2 }),
  });
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}, excalidrawData);

writeFileSync(outputPath, Buffer.from(pngBase64, "base64"));
console.log(`Done: ${outputPath}`);

await browser.close();
server.close();
