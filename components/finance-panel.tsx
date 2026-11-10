"use client";

import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ChartNoAxesCombined, Download, Pencil, Plus, Receipt, Save, Search, Trash2, X } from "lucide-react";
import { CATEGORIES, PAYMENT_METHODS, isoDate, totals, type EntryType, type FinanceEntry, type FinanceInput } from "@/lib/finance-shared";

// A partir de quantos lançamentos a lista ganha rolagem própria (cada linha tem 86 px no CSS).
const MAX_VISIBLE_ROWS = 10;
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const PERIODS = [
  { id: "month", label: "Este mês" },
  { id: "last", label: "Mês passado" },
  { id: "30d", label: "30 dias" },
  { id: "year", label: "Este ano" },
  { id: "all", label: "Tudo" },
  { id: "custom", label: "Período" }
] as const;
type Period = (typeof PERIODS)[number]["id"];
type TypeFilter = "all" | EntryType;

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const shortDate = (iso: string) => iso.split("-").reverse().join("/");

/** Aceita "1234,56", "1.234,56", "R$ 12,5" ou "12.5". Devolve centavos ou NaN. */
function parseMoney(text: string) {
  const clean = text.replace(/[R$\s]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const value = Number(normalized);
  return normalized !== "" && Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

function rangeFor(period: Period, today: Date, from: string, to: string): [string, string] {
  const y = today.getFullYear(), m = today.getMonth();
  if (period === "month") return [isoDate(new Date(y, m, 1)), isoDate(new Date(y, m + 1, 0))];
  if (period === "last") return [isoDate(new Date(y, m - 1, 1)), isoDate(new Date(y, m, 0))];
  if (period === "30d") { const start = new Date(today); start.setDate(start.getDate() - 29); return [isoDate(start), isoDate(today)]; }
  if (period === "year") return [`${y}-01-01`, `${y}-12-31`];
  if (period === "custom") return [from || "0000-01-01", to || "9999-12-31"];
  return ["0000-01-01", "9999-12-31"];
}

/** Evita que o Excel trate texto digitado como fórmula (=, +, -, @) ao abrir o CSV. */
function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function exportCsv(entries: FinanceEntry[]) {
  const rows = [["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Valor (R$)", "Observação"]];
  for (const e of entries) rows.push([shortDate(e.date), e.type === "in" ? "Entrada" : "Saída", e.description, e.category, e.method, ((e.type === "in" ? e.amount : -e.amount) / 100).toFixed(2).replace(".", ","), e.note]);
  // Ponto e vírgula e BOM para o Excel em português abrir com acentos e colunas certas.
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = `faturamento-${isoDate(new Date())}.csv`;
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}

type Form = Omit<FinanceInput, "amount">;
const blankForm = (type: EntryType): Form => ({ type, date: isoDate(new Date()), description: "", category: "", method: "", note: "" });

export default function FinancePanel({ initialEntries }: { initialEntries: FinanceEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [period, setPeriod] = useState<Period>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Form>(blankForm("in"));
  const [amountText, setAmountText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Este painel só aparece depois que a página já carregou no navegador, então "hoje" é o dia de quem está usando.
  const today = useMemo(() => new Date(), []);
  const [start, end] = rangeFor(period, today, from, to);
  const inPeriod = useMemo(() => entries.filter((e) => e.date >= start && e.date <= end), [entries, start, end]);
  const summary = totals(inPeriod);
  const needle = query.trim().toLowerCase();
  const visible = inPeriod.filter((e) => (typeFilter === "all" || e.type === typeFilter) && (!needle || `${e.description} ${e.category} ${e.method} ${e.note}`.toLowerCase().includes(needle)));

  // Últimos 6 meses, sempre a partir de todos os lançamentos (não depende do filtro de período).
  const months = useMemo(() => {
    const list = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
      const key = isoDate(d).slice(0, 7);
      const t = totals(entries.filter((e) => e.date.startsWith(key)));
      return { key, label: MONTHS[d.getMonth()], income: t.income, expense: t.expense };
    });
    return { list, max: Math.max(1, ...list.flatMap((m) => [m.income, m.expense])) };
  }, [entries, today]);
  const chartHasValues = months.list.some((month) => month.income > 0 || month.expense > 0);
  const chartIncome = months.list.reduce((sum, month) => sum + month.income, 0);
  const chartExpense = months.list.reduce((sum, month) => sum + month.expense, 0);

  const byCategory = (type: EntryType) => {
    const map = new Map<string, number>();
    for (const e of inPeriod) if (e.type === type) map.set(e.category || "Sem categoria", (map.get(e.category || "Sem categoria") ?? 0) + e.amount);
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
    return { rows, total: rows.reduce((sum, [, value]) => sum + value, 0) };
  };
  const incomeByCategory = byCategory("in"), expenseByCategory = byCategory("out");

  function openForm(type: EntryType, entry?: FinanceEntry) {
    setError("");
    setEditing(entry?.id ?? "new");
    setForm(entry ? { type: entry.type, date: entry.date, description: entry.description, category: entry.category, method: entry.method, note: entry.note } : blankForm(type));
    setAmountText(entry ? (entry.amount / 100).toFixed(2).replace(".", ",") : "");
  }
  function changeType(type: EntryType) {
    setForm((current) => ({ ...current, type, category: CATEGORIES[type].includes(current.category) ? current.category : "" }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const amount = parseMoney(amountText);
    if (!Number.isInteger(amount) || amount <= 0) { setError("Informe um valor maior que zero."); setBusy(false); return; }
    try {
      const response = await fetch(editing === "new" ? "/api/finance" : `/api/finance/${editing}`, { method: editing === "new" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, amount }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setEntries((current) => (editing === "new" ? [...current, result] : current.map((item) => item.id === result.id ? result : item)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); }
    setBusy(false);
  }

  async function remove(entry: FinanceEntry) {
    if (!window.confirm(`Excluir “${entry.description}” (${money(entry.amount)})?`)) return;
    const response = await fetch(`/api/finance/${entry.id}`, { method: "DELETE" });
    if (response.ok) setEntries((current) => current.filter((item) => item.id !== entry.id));
    else setError("Não foi possível excluir o lançamento.");
  }

  const breakdown = (title: string, data: { rows: [string, number][]; total: number }, tone: "in" | "out") => <div className={`fin-card fin-card-breakdown ${tone}`}>
    <h3>{title}</h3>
    {data.rows.length ? <ul className="fin-breakdown">{data.rows.map(([name, value], index) => <li key={name}><div><span>{name}</span><strong>{money(value)}</strong></div><span className="fin-progress"><i className={tone} style={{ width: `${Math.max(3, (value / data.total) * 100)}%`, animationDelay: `${index * 90}ms` }} /></span></li>)}</ul> : <p className="fin-muted">Nada registrado neste período.</p>}
  </div>;

  return <main className="admin-main finance">
    <div className="admin-top">
      <div><span className="eyebrow">PAINEL DA NANDA</span><h1>Faturamento</h1><p>Registre o que entra e o que sai e acompanhe o resultado do seu negócio.</p></div>
      <div className="fin-actions">
        <button className="button button-ghost" onClick={() => exportCsv(visible)} disabled={!visible.length}><Download size={17}/> Exportar CSV</button>
        <button className="button button-ghost" onClick={() => openForm("out")}><ArrowDownCircle size={18}/> Nova saída</button>
        <button className="button button-dark" onClick={() => openForm("in")}><Plus size={18}/> Nova entrada</button>
      </div>
    </div>

    <div className="fin-filters">
      <div className="fin-pills" role="group" aria-label="Período">{PERIODS.map((item) => <button key={item.id} className={period === item.id ? "active" : ""} aria-pressed={period === item.id} onClick={() => setPeriod(item.id)}>{item.label}</button>)}</div>
      {period === "custom" && <div className="fin-range"><label>De<input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)}/></label><label>até<input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)}/></label></div>}
    </div>

    <div className={`admin-summary fin-summary${summary.count ? " has-values" : ""}`}>
      <div><span>Entradas</span><strong className="pos">{money(summary.income)}</strong><small>{inPeriod.filter((e) => e.type === "in").length} lançamentos</small></div>
      <div><span>Saídas</span><strong className="neg">{money(summary.expense)}</strong><small>{inPeriod.filter((e) => e.type === "out").length} lançamentos</small></div>
      <div><span>Saldo do período</span><strong className={summary.balance < 0 ? "neg" : "pos"}>{money(summary.balance)}</strong><small>{summary.balance < 0 ? "Gastos maiores que as entradas" : "Entradas menos saídas"}</small></div>
      <div><span>Ticket médio</span><strong>{money(summary.average)}</strong><small>Média por entrada</small></div>
    </div>

    <div className="fin-grid">
      <div className={`fin-card fin-card-chart${chartHasValues ? " has-values" : ""}`}>
        <div className="fin-card-head"><div><span className="fin-overline">EVOLUÇÃO MENSAL</span><h3>Últimos 6 meses</h3></div><div className="fin-legend"><span><i className="in"/>Entradas</span><span><i className="out"/>Saídas</span></div></div>
        {chartHasValues ? <>
          <div className="fin-chart" role="img" aria-label={`Entradas e saídas por mês: ${months.list.map((m) => `${m.label} entradas ${money(m.income)}, saídas ${money(m.expense)}`).join("; ")}`}>
            {months.list.map((m, index) => <div className="fin-col" key={m.key} title={`${m.label}: entradas ${money(m.income)} · saídas ${money(m.expense)}`}>
              <div className="fin-bars"><i className={`in${m.income ? " has-value" : ""}`} style={{ height: `${(m.income / months.max) * 100}%`, animationDelay: `${index * 80}ms` }}/><i className={`out${m.expense ? " has-value" : ""}`} style={{ height: `${(m.expense / months.max) * 100}%`, animationDelay: `${index * 80 + 100}ms` }}/></div>
              <span>{m.label}</span><small>{money(m.income - m.expense)}</small>
            </div>)}
          </div>
          <div className="fin-chart-totals"><div><span>Entradas no gráfico</span><strong className="pos">{money(chartIncome)}</strong></div><div><span>Saídas no gráfico</span><strong className="neg">{money(chartExpense)}</strong></div></div>
        </> : <div className="fin-chart-empty"><span className="fin-empty-icon"><ChartNoAxesCombined size={30}/></span><strong>Ainda não há movimentos nos últimos 6 meses.</strong><p>Registre uma entrada ou saída para acompanhar a evolução aqui.</p></div>}
      </div>
      {breakdown("Entradas por categoria", incomeByCategory, "in")}
      {breakdown("Saídas por categoria", expenseByCategory, "out")}
    </div>

    <div className="fin-toolbar">
      <div className="fin-pills" role="group" aria-label="Tipo de lançamento">{([["all", "Todos"], ["in", "Entradas"], ["out", "Saídas"]] as const).map(([id, label]) => <button key={id} className={typeFilter === id ? "active" : ""} aria-pressed={typeFilter === id} onClick={() => setTypeFilter(id)}>{label}</button>)}</div>
      <label className="fin-search"><Search size={16}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por descrição, categoria..." aria-label="Buscar lançamentos"/></label>
    </div>

    {error && !editing && <p className="form-error" role="alert">{error}</p>}
    {visible.length ? <div className="admin-table">
      <div className="admin-table-head fin-head"><span>LANÇAMENTO</span><span>DATA</span><span>VALOR</span><span>AÇÕES</span></div>
      <div className={`admin-rows${visible.length > MAX_VISIBLE_ROWS ? " scroll" : ""}`}>{visible.map((entry) => <div className="admin-row fin-row" key={entry.id}>
        <div className="fin-desc"><span className={`fin-icon ${entry.type}`}>{entry.type === "in" ? <ArrowUpCircle size={19}/> : <ArrowDownCircle size={19}/>}</span><div><strong>{entry.description}</strong><span className="admin-meta">{entry.category && <small>{entry.category}</small>}{entry.method && <small>{entry.method}</small>}{!entry.category && !entry.method && <small>{entry.type === "in" ? "Entrada" : "Saída"}</small>}</span></div></div>
        <span className="fin-date">{shortDate(entry.date)}</span>
        <strong className={`fin-amount ${entry.type === "in" ? "pos" : "neg"}`}>{entry.type === "in" ? "+" : "−"} {money(entry.amount)}</strong>
        <div className="admin-actions"><button aria-label={`Editar ${entry.description}`} onClick={() => openForm(entry.type, entry)}><Pencil size={17}/></button><button aria-label={`Excluir ${entry.description}`} onClick={() => remove(entry)}><Trash2 size={17}/></button></div>
      </div>)}</div>
    </div> : <div className="admin-empty"><div className="admin-empty-icon"><Receipt size={29}/></div><h2>{entries.length ? "Nenhum lançamento aqui." : "Comece pelo primeiro dinheiro que entrou."}</h2><p>{entries.length ? "Troque o período ou os filtros para ver outros lançamentos." : "Registre uma venda ou um gasto para acompanhar o resultado da Nanda."}</p><button className="button button-dark" onClick={() => openForm("in")}><Plus size={18}/> Adicionar entrada</button></div>}

    {editing && <div className="modal-layer">
      <div className="modal-backdrop" onClick={() => setEditing(null)}/>
      <div className="product-modal" role="dialog" aria-modal="true" aria-label={editing === "new" ? "Novo lançamento" : "Editar lançamento"}>
        <div className="modal-head"><div><span className="eyebrow">FATURAMENTO</span><h2>{editing === "new" ? (form.type === "in" ? "Nova entrada" : "Nova saída") : "Editar lançamento"}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Fechar"><X/></button></div>
        <form onSubmit={save}>
          <div className="modal-fields">
            <div className="fin-type" role="group" aria-label="Tipo">
              <button type="button" className={form.type === "in" ? "active in" : ""} aria-pressed={form.type === "in"} onClick={() => changeType("in")}><ArrowUpCircle size={18}/> Entrada</button>
              <button type="button" className={form.type === "out" ? "active out" : ""} aria-pressed={form.type === "out"} onClick={() => changeType("out")}><ArrowDownCircle size={18}/> Saída</button>
            </div>
            <div className="field-row">
              <div className="field"><label htmlFor="fin-amount">Valor (R$) *</label><input id="fin-amount" required autoFocus inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)} placeholder="0,00"/></div>
              <div className="field"><label htmlFor="fin-date">Data *</label><input id="fin-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></div>
            </div>
            <div className="field"><label htmlFor="fin-description">Descrição *</label><input id="fin-description" required maxLength={140} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={form.type === "in" ? "Ex.: Encomenda de 50 brigadeiros" : "Ex.: Compra de leite condensado"}/></div>
            <div className="field-row">
              <div className="field"><label htmlFor="fin-category">Categoria</label><select id="fin-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Sem categoria</option>{CATEGORIES[form.type].map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="field"><label htmlFor="fin-method">Forma de pagamento</label><select id="fin-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option value="">Não informada</option>{PAYMENT_METHODS.map((item) => <option key={item}>{item}</option>)}</select></div>
            </div>
            <div className="field"><label htmlFor="fin-note">Observação</label><textarea id="fin-note" rows={3} maxLength={600} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Opcional"/></div>
            {error && <p className="form-error" role="alert">{error}</p>}
          </div>
          <div className="modal-foot"><button type="button" className="button button-ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-dark" disabled={busy}><Save size={17}/>{busy ? "Salvando..." : "Salvar lançamento"}</button></div>
        </form>
      </div>
    </div>}
  </main>;
}
