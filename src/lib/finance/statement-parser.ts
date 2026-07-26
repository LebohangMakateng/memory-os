import { buildTransactionFingerprint, normalizeMoneyInput } from "./calculations";
import type { FinanceCategory } from "./types";

export type ParsedStatementRow = {
  transactionDate: string;
  description: string;
  normalizedMerchant: string | null;
  amount: string;
  transactionType: "income" | "expense";
  categoryId: string | null;
  confidence: number;
  duplicateFingerprint: string;
};

function toIsoDate(value: string) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})$/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const short = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (!short) return "";
  const year = short[3].length === 2 ? "20" + short[3] : short[3];
  return year + "-" + short[2].padStart(2, "0") + "-" + short[1].padStart(2, "0");
}

function inferCategory(description: string, categories: FinanceCategory[]) {
  const lower = description.toLowerCase();
  const match = categories.find((category) => lower.includes(category.name.toLowerCase().split(" /")[0]));
  if (match) return match.id;
  if (/uber|bolt|petrol|fuel|taxi/.test(lower)) return categories.find((category) => category.name === "Transport")?.id ?? null;
  if (/checkers|woolworths|pick n pay|spar|grocery/.test(lower)) return categories.find((category) => category.name === "Groceries")?.id ?? null;
  if (/restaurant|kfc|mcdonald|nando|steers/.test(lower)) return categories.find((category) => category.name === "Restaurants")?.id ?? null;
  if (/salary|payroll/.test(lower)) return categories.find((category) => category.name === "Salary")?.id ?? null;
  return null;
}

export function parseStatementText(text: string, accountId: string, categories: FinanceCategory[]) {
  const rows: ParsedStatementRow[] = [];
  const linePattern = /^(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s+(.+?)\s+(-?R?\s?\d[\d,]*(?:\.\d{2})?)$/i;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const match = line.match(linePattern);
    if (!match) continue;
    const transactionDate = toIsoDate(match[1]);
    if (!transactionDate) continue;
    const description = match[2].trim();
    const rawAmount = match[3].replace(/R|\s|,/gi, "");
    const transactionType = rawAmount.startsWith("-") ? "expense" : "income";
    const amount = normalizeMoneyInput(rawAmount.replace(/^-/, ""));
    const normalizedMerchant = description.split(" ").slice(0, 4).join(" ") || null;
    const categoryId = inferCategory(description, categories);
    rows.push({ transactionDate, description, normalizedMerchant, amount, transactionType, categoryId, confidence: categoryId ? 0.85 : 0.65, duplicateFingerprint: buildTransactionFingerprint({ accountId, transactionDate, amount, transactionType, description, source: "import" }) });
  }
  return rows;
}
