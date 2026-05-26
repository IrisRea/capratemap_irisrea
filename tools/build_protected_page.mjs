import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "index.html");
const dataDir = path.join(root, "guarded-data");
const summaryPath = path.join(dataDir, "boot.js");
const chunkSize = 100;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(value);
      value = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += ch;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function normalizeNumber(value) {
  const cleaned = String(value ?? "").replace(/,/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function encodePayload(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

const csvFileName = (await fs.readdir(root)).find((name) => name.endsWith(".csv"));
if (!csvFileName) {
  throw new Error("No source CSV was found in the repository root");
}

const csvPath = path.join(root, csvFileName);
const csvSource = await fs.readFile(csvPath, "utf8");
const rows = parseCsv(csvSource);

if (rows.length < 2) {
  throw new Error(`Source CSV appears empty: ${csvFileName}`);
}

const header = rows[0];
const records = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim()));
const col = Object.fromEntries(header.map((name, index) => [name, index]));

const properties = records
  .map((row, index) => ({
    id: index + 1,
    name: row[col["物件名称"]],
    address: row[col["所在地"]],
    reit: row[col["投資法人名"]],
    appraisal: row[col["鑑定評価額"]],
    capRate: row[col["還元利回り"]],
    discountRate: row[col["割引率"]],
    terminalCapRate: row[col["最終還元利回り"]],
    use: row[col["用途"]],
    structure: row[col["構造・階数"]],
    built: row[col["建築時期"]],
    rentableArea: row[col["賃貸可能面積"]],
    valuationDate: row[col["評価時点"]],
    lat: normalizeNumber(row[col["緯度"]]),
    lng: normalizeNumber(row[col["経度"]]),
  }))
  .filter((item) => item.name && item.lat !== null && item.lng !== null);

if (!properties.length) {
  throw new Error(`No valid property rows were parsed from ${csvFileName}`);
}

const summary = properties.map((item) => ({
  i: item.id,
  n: item.name,
  x: item.lat,
  y: item.lng,
}));

const detailEntries = properties.map((item) => [
  item.id,
  {
    a: item.address,
    r: item.reit,
    p: item.appraisal,
    c: item.capRate,
    d: item.discountRate,
    t: item.terminalCapRate,
    u: item.use,
    s: item.structure,
    b: item.built,
    m: item.rentableArea,
    v: item.valuationDate,
  },
]);

const chunkKeys = [];
const chunks = [];
for (let index = 0; index < detailEntries.length; index += chunkSize) {
  const chunkKey = `p${String(index / chunkSize).padStart(2, "0")}`;
  chunkKeys.push(chunkKey);
  chunks.push({
    key: chunkKey,
    entries: detailEntries.slice(index, index + chunkSize),
  });
}

await fs.rm(dataDir, { recursive: true, force: true });
await fs.mkdir(dataDir, { recursive: true });

await fs.writeFile(
  summaryPath,
  `window.__PG_PAYLOADS=window.__PG_PAYLOADS||{};window.__PG_PAYLOADS.b="${encodePayload(summary)}";`,
  "utf8"
);

for (const chunk of chunks) {
  const chunkPath = path.join(dataDir, `${chunk.key}.js`);
  const record = Object.fromEntries(chunk.entries);
  await fs.writeFile(
    chunkPath,
    `window.__PG_PAYLOADS=window.__PG_PAYLOADS||{};window.__PG_PAYLOADS["${chunk.key}"]="${encodePayload(record)}";`,
    "utf8"
  );
}

const indexSource = await fs.readFile(inputPath, "utf8");
const updatedIndex = indexSource
  .replace(/const DETAIL_CHUNK_SIZE=\d+;/, `const DETAIL_CHUNK_SIZE=${chunkSize};`)
  .replace(
    /const DETAIL_CHUNK_KEYS=\[[^\]]*\];/,
    `const DETAIL_CHUNK_KEYS=${JSON.stringify(chunkKeys)};`
  );

await fs.writeFile(inputPath, updatedIndex, "utf8");

console.log(
  `Rebuilt guarded-data from ${csvFileName} (${properties.length} properties, ${chunks.length} chunks)`
);
