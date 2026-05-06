import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import PptxGenJS from "pptxgenjs";
import { chromium } from "playwright";

const input = path.resolve(process.argv[2] ?? "ge_sales_deck.native-analysis.html");
const output = path.resolve(process.argv[3] ?? "ge_sales_deck.custom-hybrid.pptx");
const workDir = path.resolve(process.argv[4] ?? ".tmp/ge-sales-custom-hybrid");

const SLIDE_W_PX = 1280;
const SLIDE_H_PX = 720;
const SLIDE_W_IN = 13.333333;
const SLIDE_H_IN = 7.5;
const X = SLIDE_W_IN / SLIDE_W_PX;
const Y = SLIDE_H_IN / SLIDE_H_PX;

type TextBox = {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontFace: string;
  fontSizePt: number;
  bold: boolean;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right" | "justify";
  valign: "top" | "mid" | "bottom";
  opacity: number;
  rotate: number;
};

type SlideData = {
  label: string;
  notes: string;
  texts: TextBox[];
};

const html = await readFile(input, "utf8");
const sectionCount = (html.match(/<section\s+class=["'][^"']*\bslide\b/gi) ?? []).length;
if (!sectionCount) throw new Error(`No slides found in ${input}`);
await mkdir(workDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: SLIDE_W_PX, height: SLIDE_H_PX },
  deviceScaleFactor: 2,
  ignoreHTTPSErrors: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);

async function loadDeck() {
  await page.goto(pathToFileURL(input).href, { waitUntil: "load" });
  try {
    await page.waitForLoadState("networkidle", { timeout: 8_000 });
  } catch {
    // Google font/CDN idleness is not required for deterministic geometry.
  }
  await page.addStyleTag({
    content: `
      #deck { transition: none !important; }
      * { animation-delay: 0s !important; transition-duration: 0s !important; }
      .slide.active [data-pptx-export-hidden] {
        color: transparent !important;
        -webkit-text-fill-color: transparent !important;
        text-shadow: none !important;
      }
    `,
  });
}

async function activateSlide(index: number) {
  await page.evaluate((i) => {
    const deck = document.querySelector<HTMLElement>("#deck");
    const slides = Array.from(document.querySelectorAll<HTMLElement>(".slide"));
    if (deck) {
      deck.style.transition = "none";
      deck.style.transform = `translateX(${-i * 100}vw)`;
    }
    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === i);
    });
    document.body.classList.add("light-bg");
    const counter = document.querySelector<HTMLElement>("#current-slide");
    if (counter) counter.textContent = String(i + 1);
  }, index);
  await page.waitForTimeout(160);
}

async function clearExportHidden() {
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-pptx-export-hidden]")
      .forEach((el) => el.removeAttribute("data-pptx-export-hidden"));
  });
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeColor(color: string) {
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return "0A1F3D";
  const parts = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
  const [r, g, b] = parts;
  return [r, g, b]
    .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function pptFontFace(cssFamily: string) {
  const family = cssFamily.split(",")[0]?.replace(/["']/g, "").trim() || "Aptos";
  if (/mono/i.test(family)) return "Aptos Mono";
  if (/serif|source|iowan|georgia/i.test(family)) return "Georgia";
  return "Aptos";
}

function pptAlign(css: string): "left" | "center" | "right" | "justify" {
  if (css === "center") return "center";
  if (css === "right" || css === "end") return "right";
  if (css === "justify") return "justify";
  return "left";
}

function pt(px: number) {
  return Math.max(5, Math.min(72, px * 0.75));
}

async function extractSlideData(): Promise<SlideData> {
  return await page.evaluate(() => {
    function textOf(el: Element) {
      return (el.textContent || "").replace(/\s+/g, " ").trim();
    }
    function ownText(el: Element) {
      let out = "";
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) out += node.textContent || "";
      }
      return out.replace(/\s+/g, " ").trim();
    }
    function isVisibleRect(r: DOMRect) {
      return r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 && r.left < innerWidth && r.top < innerHeight;
    }
    function rotationDeg(transform: string) {
      if (!transform || transform === "none") return 0;
      const m = transform.match(/matrix\(([^)]+)\)/);
      if (!m) return 0;
      const [a, b] = m[1].split(",").map((v) => Number.parseFloat(v.trim()));
      return Math.atan2(b, a) * 180 / Math.PI;
    }
    const active = document.querySelector<HTMLElement>(".slide.active") ?? document.querySelector<HTMLElement>(".slide");
    if (!active) return { label: "", notes: "", texts: [] };
    const notes = active.querySelector("aside.notes")?.innerHTML || "";
    const candidates = Array.from(active.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,span,div,strong,em"));
    const texts: any[] = [];
    const seen = new Set<string>();
    for (const el of candidates) {
      if (el.closest("aside.notes")) continue;
      const raw = ownText(el) || (el.children.length === 0 ? textOf(el) : "");
      const txt = raw.replace(/\s+/g, " ").trim();
      if (!txt || txt.length < 1) continue;
      const r = el.getBoundingClientRect();
      if (!isVisibleRect(r)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const opacity = Number.parseFloat(cs.opacity || "1");
      if (opacity <= 0.02) continue;
      const key = `${Math.round(r.x)}:${Math.round(r.y)}:${Math.round(r.width)}:${Math.round(r.height)}:${txt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      texts.push({
        text: txt,
        x: Math.max(0, r.x),
        y: Math.max(0, r.y),
        w: Math.min(innerWidth - Math.max(0, r.x), r.width),
        h: Math.min(innerHeight - Math.max(0, r.y), r.height),
        fontFamily: cs.fontFamily,
        fontSizePx: Number.parseFloat(cs.fontSize || "16"),
        fontWeight: cs.fontWeight,
        fontStyle: cs.fontStyle,
        color: cs.color,
        align: cs.textAlign,
        opacity,
        rotate: rotationDeg(cs.transform),
      });
      el.setAttribute("data-pptx-export-hidden", "true");
    }
    return {
      label: active.getAttribute("data-screen-label") || "",
      notes,
      texts,
    };
  });
}

function mapTextBox(t: any): TextBox | null {
  const text = cleanText(t.text);
  if (!text) return null;
  const fontSizePt = pt(Number(t.fontSizePx) || 16);
  return {
    text,
    x: t.x * X,
    y: t.y * Y,
    w: Math.max(0.05, t.w * X),
    h: Math.max(0.05, t.h * Y + 0.03),
    fontFace: pptFontFace(t.fontFamily || ""),
    fontSizePt,
    bold: Number.parseInt(t.fontWeight || "400", 10) >= 650 || /bold/i.test(t.fontWeight || ""),
    italic: /italic/i.test(t.fontStyle || ""),
    color: normalizeColor(t.color || "rgb(10,31,61)"),
    align: pptAlign(t.align || "left"),
    valign: "top",
    opacity: Number(t.opacity) || 1,
    rotate: Number(t.rotate) || 0,
  };
}

await loadDeck();
const slides: Array<SlideData & { backplate: string }> = [];
for (let i = 0; i < sectionCount; i += 1) {
  await activateSlide(i);
  const raw = await extractSlideData();
  const backplate = path.join(workDir, `backplate-${String(i + 1).padStart(2, "0")}.jpg`);
  const shot = await cdp.send("Page.captureScreenshot", {
    format: "jpeg",
    quality: 94,
    fromSurface: true,
    clip: { x: 0, y: 0, width: SLIDE_W_PX, height: SLIDE_H_PX, scale: 1 },
  });
  await writeFile(backplate, Buffer.from(shot.data, "base64"));
  await clearExportHidden();
  console.error(`captured ${i + 1}/${sectionCount}: ${raw.label || "slide"}`);
  slides.push({
    label: raw.label,
    notes: raw.notes,
    texts: raw.texts.map(mapTextBox).filter(Boolean) as TextBox[],
    backplate,
  });
}
await browser.close();

const pptx = new PptxGenJS();
pptx.author = "Pixelpitch custom GE exporter";
pptx.company = "Pixelpitch";
pptx.subject = "Custom hybrid conversion for ge_sales_deck";
pptx.title = "GE Sales Deck Custom Hybrid";
pptx.lang = "en-US";
pptx.defineLayout({ name: "PIXELPITCH_16_9", width: SLIDE_W_IN, height: SLIDE_H_IN });
pptx.layout = "PIXELPITCH_16_9";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US",
};
pptx.margin = 0;

for (const [index, data] of slides.entries()) {
  const slide = pptx.addSlide();
  slide.background = { color: "FAFBFC" };
  slide.addImage({ path: data.backplate, x: 0, y: 0, w: SLIDE_W_IN, h: SLIDE_H_IN });
  for (const t of data.texts) {
    slide.addText(t.text, {
      x: t.x,
      y: t.y,
      w: t.w,
      h: t.h,
      margin: 0,
      breakLine: false,
      fit: "shrink",
      fontFace: t.fontFace,
      fontSize: t.fontSizePt,
      bold: t.bold,
      italic: t.italic,
      color: t.color,
      transparency: Math.round((1 - Math.max(0, Math.min(1, t.opacity))) * 100),
      align: t.align,
      valign: t.valign,
      rotate: Math.abs(t.rotate) > 0.1 ? t.rotate : undefined,
      isTextBox: true,
    });
  }
  if (data.notes) {
    slide.addNotes(`Source slide ${index + 1}: ${data.label}\n\n${data.notes.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`);
  }
}

await pptx.writeFile({ fileName: output });
console.log(JSON.stringify({
  input,
  output,
  slides: slides.length,
  textBoxes: slides.reduce((sum, s) => sum + s.texts.length, 0),
  workDir,
}, null, 2));
