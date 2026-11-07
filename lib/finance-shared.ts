// Tipos e funções do faturamento que podem ser usados no navegador (sem acesso ao banco).
export type EntryType = "in" | "out";

export type FinanceEntry = {
  id: number;
  type: EntryType;
  /** Valor em centavos, sempre positivo. O tipo diz se entra ou sai. */
  amount: number;
  /** Data do lançamento no formato AAAA-MM-DD. */
  date: string;
  description: string;
  category: string;
  method: string;
  note: string;
  createdAt: string;
};

export type FinanceInput = Omit<FinanceEntry, "id" | "createdAt">;

export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência", "Outro"];

export const CATEGORIES: Record<EntryType, string[]> = {
  in: ["Vendas", "Encomendas", "Eventos", "Outras entradas"],
  out: ["Ingredientes", "Embalagens", "Entrega", "Contas", "Equipamentos", "Marketing", "Outras saídas"]
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Data local (não UTC) no formato AAAA-MM-DD. */
export const isoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function totals(entries: FinanceEntry[]) {
  let income = 0, expense = 0, incomeCount = 0;
  for (const entry of entries) {
    if (entry.type === "in") { income += entry.amount; incomeCount++; } else expense += entry.amount;
  }
  return { income, expense, balance: income - expense, count: entries.length, average: incomeCount ? Math.round(income / incomeCount) : 0 };
}
