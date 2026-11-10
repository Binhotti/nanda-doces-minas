/** Formato brasileiro para os campos monetários do painel. */
export function formatMoneyInput(raw: string): string {
  if (!raw.replace(/\D/g, "")) return raw ? "0,00" : "";
  const comma = raw.indexOf(",");
  const integer = (comma < 0 ? raw : raw.slice(0, comma)).replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0";
  const fraction = (comma < 0 ? "" : raw.slice(comma + 1)).replace(/\D/g, "").slice(0, 2).padEnd(2, "0");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${fraction}`;
}

export function centsFromMoneyInput(value: string): number {
  if (!value) return NaN;
  const normalized = formatMoneyInput(value);
  const [integer, fraction] = normalized.replace(/\./g, "").split(",");
  const cents = Number(integer) * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : NaN;
}

export function moneyInputFromCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
}
