import fs from 'fs';
import path from 'path';
import { WeightEntry } from './weights';

const DATA_DIR = process.env.DATA_DIR || './data';
const WEIGHTS_FILE = path.join(DATA_DIR, 'weights.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readWeights(): WeightEntry[] {
  ensureDir();
  if (!fs.existsSync(WEIGHTS_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(WEIGHTS_FILE, 'utf8')); }
  catch { return []; }
}

export function writeWeights(weights: WeightEntry[]): void {
  ensureDir();
  fs.writeFileSync(WEIGHTS_FILE, JSON.stringify(weights), 'utf8');
}
