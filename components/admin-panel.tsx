"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, LogOut, Package, Pencil, Plus, Save, Trash2, Wallet, X } from "lucide-react";
import type { Product, ProductInput } from "@/lib/products";
import { MAX_HOME_PRODUCTS } from "@/lib/home";
import type { FinanceEntry } from "@/lib/finance-shared";
import FinancePanel from "@/components/finance-panel";

// A partir de quantos produtos a lista ganha rolagem própria (cada linha tem 86 px no CSS).
const MAX_VISIBLE_ROWS = 10;
const blank: ProductInput = { title: "", description: "", image: "", price: 0, promoPrice: null, category: "Doces", featured: false, active: true };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const toCents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);

export default function AdminPanel({ authenticated, configured, initialProducts, initialEntries }: { authenticated: boolean; configured: boolean; initialProducts: Product[]; initialEntries: FinanceEntry[] }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ProductInput>(blank);
  const [priceText, setPriceText] = useState("");
  const [promoText, setPromoText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"produtos" | "faturamento">("produtos");
  // Abre direto no faturamento quando o endereço termina em #faturamento.
  useEffect(() => { if (window.location.hash === "#faturamento") setTab("faturamento"); }, []);
  function showTab(next: "produtos" | "faturamento") { setTab(next); window.history.replaceState(null, "", next === "faturamento" ? "#faturamento" : window.location.pathname); }

  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) router.refresh(); else setError("Senha incorreta. Tente novamente.");
    setBusy(false);
  }
  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); router.refresh(); }
  function openForm(product?: Product) {
    setError(""); setEditing(product?.id ?? "new");
    setForm(product ? { title: product.title, description: product.description, image: product.image, price: product.price, promoPrice: product.promoPrice, category: product.category, featured: product.featured, active: product.active } : { ...blank });
    setPriceText(product ? (product.price / 100).toFixed(2).replace(".", ",") : "");
    setPromoText(product?.promoPrice ? (product.promoPrice / 100).toFixed(2).replace(".", ",") : "");
  }
  async function upload(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Use JPG, PNG ou WebP."); return; }
    if (file.size > 4 * 1024 * 1024) { setError("Escolha uma imagem de até 4 MB."); return; }
    setBusy(true); setError("");
    const data = new FormData(); data.append("file", file);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setForm((current) => ({ ...current, image: result.url }));
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem."); }
    setBusy(false);
  }
  // Arrastar e soltar: a janela inteira do produto aceita a imagem e a área de envio destaca durante o arraste.
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");
  const dropProps = {
    onDragEnter: (event: React.DragEvent) => { if (!hasFiles(event)) return; event.preventDefault(); dragDepth.current += 1; setDragging(true); },
    onDragOver: (event: React.DragEvent) => { if (hasFiles(event)) event.preventDefault(); },
    onDragLeave: (event: React.DragEvent) => { if (!hasFiles(event)) return; dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setDragging(false); },
    onDrop: (event: React.DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault(); dragDepth.current = 0; setDragging(false);
      const files: File[] = Array.from(event.dataTransfer.files);
      void upload(files.find((file) => file.type.startsWith("image/")) ?? files[0]);
    }
  };
  // Colar (Ctrl+V ou Cmd+V): uma imagem copiada ou um print vira a foto do produto enquanto o formulário está aberto.
  useEffect(() => {
    if (!editing) return;
    function onPaste(event: ClipboardEvent) {
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) => entry.kind === "file" && entry.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      void upload(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);
  // Quantos outros produtos já estão na tela inicial (só contam os visíveis na loja).
  const homeOthers = products.filter((p) => p.featured && p.active && p.id !== editing).length;
  const homeFull = homeOthers >= MAX_HOME_PRODUCTS && !form.featured;
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const price = toCents(priceText), promoPrice = promoText ? toCents(promoText) : null;
    const payload = { ...form, price, promoPrice };
    try {
      const response = await fetch(editing === "new" ? "/api/products" : `/api/products/${editing}`, { method: editing === "new" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setProducts((current) => editing === "new" ? [result, ...current] : current.map((item) => item.id === result.id ? result : item));
      setEditing(null); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível salvar."); }
    setBusy(false);
  }
  async function remove(product: Product) {
    if (!window.confirm(`Excluir “${product.title}” do catálogo?`)) return;
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (response.ok) { setProducts((current) => current.filter((item) => item.id !== product.id)); router.refresh(); }
    else setError("Não foi possível excluir o produto.");
  }

  if (!authenticated) return <main className="admin-login"><a className="admin-back" href="/"><ArrowLeft size={16}/> Voltar ao site</a><div className="login-card"><span className="brand-mark">N</span><span className="eyebrow">ÁREA RESERVADA</span><h1>Olá, Nanda.</h1><p>Acesse o espaço onde seu catálogo ganha vida.</p>{configured ? <form onSubmit={login}><label htmlFor="password">Senha de acesso</label><input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoFocus/><button className="button button-dark" disabled={busy}>{busy ? "Entrando..." : "Entrar no painel"}<ArrowRight size={17}/></button>{error && <span className="form-error" role="alert">{error}</span>}</form> : <p className="form-error">Configure ADMIN_PASSWORD e SESSION_SECRET no arquivo .env.local para ativar o acesso.</p>}</div></main>;

  return <div className="admin-shell"><aside className="admin-sidebar"><a className="brand" href="/"><span className="brand-mark">N</span><span><strong>Nanda</strong><small>DOCES DE MINAS</small></span></a><div className="admin-nav"><span>GERENCIAMENTO</span><a className={tab === "produtos" ? "selected" : ""} href="/admin" onClick={(e) => { e.preventDefault(); showTab("produtos"); }}><Package size={18}/> Produtos</a><a className={tab === "faturamento" ? "selected" : ""} href="/admin#faturamento" onClick={(e) => { e.preventDefault(); showTab("faturamento"); }}><Wallet size={18}/> Faturamento</a><a href="/"><ArrowLeft size={18}/> Ver loja</a></div><button className="logout" onClick={logout}><LogOut size={17}/> Sair</button></aside><div className="admin-tabs" role="tablist" aria-label="Seções do painel"><button role="tab" aria-selected={tab === "produtos"} className={tab === "produtos" ? "active" : ""} onClick={() => showTab("produtos")}><Package size={16}/> Produtos</button><button role="tab" aria-selected={tab === "faturamento"} className={tab === "faturamento" ? "active" : ""} onClick={() => showTab("faturamento")}><Wallet size={16}/> Faturamento</button></div>{tab === "faturamento" ? <FinancePanel initialEntries={initialEntries}/> : <main className="admin-main"><div className="admin-top"><div><span className="eyebrow">PAINEL DA NANDA</span><h1>Seu catálogo</h1><p>Organize seus doces, fotos, preços e promoções em um só lugar.</p></div><button className="button button-dark" onClick={() => openForm()}><Plus size={18}/> Novo produto</button></div><div className="admin-summary"><div><span>Produtos cadastrados</span><strong>{products.length}</strong></div><div><span>Visíveis na loja</span><strong>{products.filter((p) => p.active).length}</strong></div><div><span>Em promoção</span><strong>{products.filter((p) => p.promoPrice).length}</strong></div><div><span>Na tela inicial</span><strong>{products.filter((p) => p.featured && p.active).length}/{MAX_HOME_PRODUCTS}</strong></div></div>{error && !editing && <p className="form-error" role="alert">{error}</p>}{products.length ? <div className="admin-table"><div className="admin-table-head"><span>PRODUTO</span><span>PREÇO</span><span>STATUS</span><span>AÇÕES</span></div><div className={`admin-rows${products.length > MAX_VISIBLE_ROWS ? " scroll" : ""}`}>{products.map((product) => <div className="admin-row" key={product.id}><div className="admin-product"><div className="admin-thumb">{product.image ? <img src={product.image} alt=""/> : <span>N</span>}</div><div><strong>{product.title}</strong><span className="admin-meta"><small>{product.category}</small>{product.featured && <em className="home-tag">Na tela inicial</em>}</span></div></div><div className="admin-price">{product.promoPrice && <s>{money(product.price)}</s>}<strong>{money(product.promoPrice ?? product.price)}</strong></div><span className={product.active ? "status active" : "status"}>{product.active ? "Visível" : "Oculto"}</span><div className="admin-actions"><button aria-label={`Editar ${product.title}`} onClick={() => openForm(product)}><Pencil size={17}/></button><button aria-label={`Excluir ${product.title}`} onClick={() => remove(product)}><Trash2 size={17}/></button></div></div>)}</div></div> : <div className="admin-empty"><div className="admin-empty-icon"><Package size={29}/></div><h2>O primeiro doce vem agora.</h2><p>Cadastre um produto para começar a montar a vitrine da Nanda.</p><button className="button button-dark" onClick={() => openForm()}><Plus size={18}/> Adicionar produto</button></div>}</main>}
    {editing && <div className="modal-layer" {...dropProps}><div className="modal-backdrop" onClick={() => setEditing(null)}/><div className="product-modal" role="dialog" aria-modal="true" aria-label={editing === "new" ? "Novo produto" : "Editar produto"}><div className="modal-head"><div><span className="eyebrow">CATÁLOGO</span><h2>{editing === "new" ? "Novo produto" : "Editar produto"}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Fechar"><X/></button></div><form onSubmit={save}><div className="modal-fields"><label className={`upload-area${dragging ? " dragging" : ""}`}>{form.image ? <img src={form.image} alt="Prévia do produto"/> : <div><ImagePlus size={30}/><strong>Adicionar imagem</strong><span>Arraste aqui, cole com Ctrl+V ou clique para escolher</span><span>JPG, PNG ou WebP · até 4 MB</span></div>}{busy && <span className="upload-status">Enviando e otimizando…</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])}/></label><div className="field"><label htmlFor="title">Nome do produto *</label><input id="title" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Doce de leite artesanal"/></div><div className="field"><label htmlFor="description">Descrição</label><textarea id="description" rows={3} maxLength={1200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Conte o que torna este doce especial"/></div><div className="field"><label htmlFor="category">Categoria</label><input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: Doces tradicionais"/></div><div className="field-row"><div className="field"><label htmlFor="price">Preço (R$) *</label><input id="price" required inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="0,00"/></div><div className="field"><label htmlFor="promo">Preço promocional (R$)</label><input id="promo" inputMode="decimal" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Opcional"/></div></div><label className="check-row"><input type="checkbox" checked={form.featured} disabled={homeFull} onChange={(e) => setForm({ ...form, featured: e.target.checked })}/><span><strong>Mostrar na tela inicial</strong><small>{homeFull ? `A tela inicial já tem ${MAX_HOME_PRODUCTS} produtos. Desmarque outro para adicionar este.` : `${homeOthers + (form.featured && form.active ? 1 : 0)} de ${MAX_HOME_PRODUCTS} produtos na tela inicial. Os demais aparecem só em Produtos.`}</small></span></label><label className="check-row"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}/><span><strong>Mostrar na loja</strong><small>Desative para ocultar sem excluir</small></span></label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="modal-foot"><button type="button" className="button button-ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-dark" disabled={busy}><Save size={17}/>{busy ? "Salvando..." : "Salvar produto"}</button></div></form></div></div>}
  </div>;
}
