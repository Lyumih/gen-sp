/**
 * Парсинг и расчёт токенов Memento Mori `%%` — спека §3.
 *
 * Форма `BASE%%-P`: от L=0 (значение BASE) до L=100 — линейно к BASE×(1−P/200);
 * при L>100 заморозка на значении при L=100 (как для %%CAP, решение v0).
 */

export type ParsedPercentToken =
  | { kind: 'plain'; base: number }
  | { kind: 'cap'; base: number; cap: number }
  | { kind: 'neg'; base: number; p: number }

const TOKEN_RE = /^(-?\d+)%%(?:-(\d+)|(\d+))?$/u

export function parsePercentToken(s: string): ParsedPercentToken | null {
  const m = s.trim().match(TOKEN_RE)
  if (!m) return null
  const base = Number(m[1])
  if (m[2] !== undefined) {
    const p = Number(m[2])
    if (p <= 0) return null
    return { kind: 'neg', base, p }
  }
  if (m[3] !== undefined) {
    const cap = Number(m[3])
    if (cap <= 0) return null
    return { kind: 'cap', base, cap }
  }
  return { kind: 'plain', base }
}

/** Подставить число для уровня карточки L и строки токена целиком (например `40%%50`). */
export function resolvePercentValue(level: number, token: string): number | null {
  if (level < 0) return null
  const parsed = parsePercentToken(token)
  if (!parsed) return null
  const L = level

  switch (parsed.kind) {
    case 'plain':
      return Math.round(parsed.base * (1 + 0.01 * L))
    case 'cap': {
      const t = Math.min(L, 100)
      return Math.round(parsed.base * (1 + (parsed.cap / 100) * (t / 100)))
    }
    case 'neg': {
      const t = Math.min(L, 100)
      return Math.round(parsed.base * (1 - (t / 100) * (parsed.p / 200)))
    }
  }
}
