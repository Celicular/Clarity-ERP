/**
 * lib/leadDuplicates.js
 * Shared duplicate-detection logic (used by /api/leads and /api/leads/webhook).
 * Exact match on email/phone + fuzzy Levenshtein on name+company.
 * Pure JS — no external libraries.
 */
import { query } from "./db";

/* ── Levenshtein distance ── */
function levenshtein(a, b) {
  a = (a || "").toLowerCase().trim();
  b = (b || "").toLowerCase().trim();
  if (!a || !b) return Math.max(a.length, b.length);
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

/* ── Similarity ratio 0-1 ── */
function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen;
}

/**
 * detectDuplicates({ email, phone, name, company })
 * Returns array of {id, name, email, phone, company, score, reason}
 */
export async function detectDuplicates({ email, phone, name, company }) {
  const duplicates = [];
  const seen = new Set();

  /* 1. Exact email match */
  if (email?.trim()) {
    const { rows } = await query(
      `SELECT id, name, email, phone, company, status_slug FROM leads WHERE email = $1 AND merged_into IS NULL LIMIT 5`,
      [email.trim().toLowerCase()]
    );
    rows.forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        duplicates.push({ ...r, score: 1.0, reason: "Exact email match" });
      }
    });
  }

  /* 2. Exact phone match */
  if (phone?.trim()) {
    const normalized = phone.replace(/\D/g, "");
    const { rows } = await query(
      `SELECT id, name, email, phone, company, status_slug FROM leads
       WHERE regexp_replace(phone, '\\D', '', 'g') = $1 AND merged_into IS NULL LIMIT 5`,
      [normalized]
    );
    rows.forEach((r) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        duplicates.push({ ...r, score: 1.0, reason: "Exact phone match" });
      }
    });
  }

  /* 3. Fuzzy name + company */
  if (name?.trim()) {
    const { rows } = await query(
      `SELECT id, name, email, phone, company, status_slug FROM leads WHERE merged_into IS NULL LIMIT 200`
    );
    rows.forEach((r) => {
      if (seen.has(r.id)) return;
      const nameSim    = similarity(name, r.name);
      const companySim = company && r.company ? similarity(company, r.company) : 0;
      const score      = Math.max(nameSim, (nameSim + companySim) / 2);
      if (score >= 0.82) {
        seen.add(r.id);
        duplicates.push({ ...r, score: Math.round(score * 100) / 100, reason: "Fuzzy name/company match" });
      }
    });
  }

  return duplicates.sort((a, b) => b.score - a.score).slice(0, 5);
}
