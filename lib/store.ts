import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DealsStore, EventsStore, PriceMemory, StatusFile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const filePath = (name: string) => path.join(DATA_DIR, name);

export const EMPTY_EVENTS: EventsStore = { version: 1, updatedAt: "", items: {} };
export const EMPTY_DEALS: DealsStore = { version: 1, updatedAt: "", items: {} };
export const EMPTY_STATUS: StatusFile = { events: [], deals: [] };

async function readJson<T extends object>(name: string, empty: T): Promise<T> {
  try {
    return { ...empty, ...(JSON.parse(await readFile(filePath(name), "utf8")) as T) };
  } catch {
    // 파일이 아직 없거나 깨졌으면 빈 상태로 시작 — 첫 수집이 채운다
    return empty;
  }
}

/** 임시 파일에 쓰고 rename — 수집 중 페이지를 열어도 반쪽짜리 JSON을 읽지 않게 */
async function writeJson(name: string, data: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = filePath(`${name}.${process.pid}.tmp`);
  await writeFile(tmp, JSON.stringify(data, null, 1), "utf8");
  await rename(tmp, filePath(name));
}

export const readEvents = () => readJson("events.json", EMPTY_EVENTS);
export const writeEvents = (d: EventsStore) => writeJson("events.json", d);
export const readDeals = () => readJson("deals.json", EMPTY_DEALS);
export const writeDeals = (d: DealsStore) => writeJson("deals.json", d);
export const readStatus = () => readJson("source-status.json", EMPTY_STATUS);
export const writeStatus = (d: StatusFile) => writeJson("source-status.json", d);

export const EMPTY_PRICE_MEMORY: PriceMemory = { version: 1, items: {} };
export const readPriceMemory = () => readJson("price-memory.json", EMPTY_PRICE_MEMORY);
export const writePriceMemory = (d: PriceMemory) => writeJson("price-memory.json", d);
