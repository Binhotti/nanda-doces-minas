"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ImagePlus, LogOut, Package, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { Product, ProductInput } from "@/lib/products";

const blank: ProductInput = { title: "", description: "", image: "", price: 0, promoPrice: null, category: "Doces", featured: false, active: true };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const toCents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);

export default function AdminPanel({ authenticated, configured, initialProducts }: { authenticated: boolean; configured: boolean; initialProducts: Product[] }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ProductInput>(blank);
  const [priceText, setPriceText] = useState("");
  const [promoText, setPromoText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  return <div className="admin-shell"><aside className="admin-sidebar"><a className="brand" href="/"><span className="brand-mark">N</span><span><strong>Nanda</strong><small>DOCES DE MINAS</small></span></a><div className="admin-nav"><span>GERENCIAMENTO</span><a className="selected" href="/admin"><Package size={18}/> Produtos</a><a href="/"><ArrowLeft size={18}/> Ver loja</a></div><button className="logout" onClick={logout}><LogOut size={17}/> Sair</button></aside><main className="admin-main"><div className="admin-top"><div><span className="eyebrow">PAINEL DA NANDA</span><h1>Seu catálogo</h1><p>Organize seus doces, fotos, preços e promoções em um só lugar.</p></div><button className="button button-dark" onClick={() => openForm()}><Plus size={18}/> Novo produto</button></div><div className="admin-summary"><div><span>Produtos cadastrados</span><strong>{products.length}</strong></div><div><span>Visíveis na loja</span><strong>{products.filter((p) => p.active).length}</strong></div><div><span>Em promoção</span><strong>{products.filter((p) => p.promoPrice).length}</strong></div></div>{error && !editing && <p className="form-error" role="alert">{error}</p>}{products.length ? <div className="admin-table"><div className="admin-table-head"><span>PRODUTO</span><span>PREÇO</span><span>STATUS</span><span>AÇÕES</span></div>{products.map((product) => <div className="admin-row" key={product.id}><div className="admin-product"><div className="admin-thumb">{product.image ? <img src={product.image} alt=""/> : <span>N</span>}</div><div><strong>{product.title}</strong><small>{product.category}</small></div></div><div className="admin-price">{product.promoPrice && <s>{money(product.price)}</s>}<strong>{money(product.promoPrice ?? product.price)}</strong></div><span className={product.active ? "status active" : "status"}>{product.active ? "Visível" : "Oculto"}</span><div className="admin-actions"><button aria-label={`Editar ${product.title}`} onClick={() => openForm(product)}><Pencil size={17}/></button><button aria-label={`Excluir ${product.title}`} onClick={() => remove(product)}><Trash2 size={17}/></button></div></div>)}</div> : <div className="admin-empty"><div className="admin-empty-icon"><Package size={29}/></div><h2>O primeiro doce vem agora.</h2><p>Cadastre um produto para começar a montar a vitrine da Nanda.</p><button className="button button-dark" onClick={() => openForm()}><Plus size={18}/> Adicionar produto</button></div>}</main>
    {editing && <div className="modal-layer"><div className="modal-backdrop" onClick={() => setEditing(null)}/><div className="product-modal" role="dialog" aria-modal="true" aria-label={editing === "new" ? "Novo produto" : "Editar produto"}><div className="modal-head"><div><span className="eyebrow">CATÁLOGO</span><h2>{editing === "new" ? "Novo produto" : "Editar produto"}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Fechar"><X/></button></div><form onSubmit={save}><div className="modal-fields"><label className="upload-area">{form.image ? <img src={form.image} alt="Prévia do produto"/> : <div><ImagePlus size={30}/><strong>Adicionar imagem</strong><span>JPG, PNG ou WebP · até 8 MB</span></div>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])}/></label><div className="field"><label htmlFor="title">Nome do produto *</label><input id="title" required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Doce de leite artesanal"/></div><div className="field"><label htmlFor="description">Descrição</label><textarea id="description" rows={3} maxLength={1200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Conte o que torna este doce especial"/></div><div className="field"><label htmlFor="category">Categoria</label><input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: Doces tradicionais"/></div><div className="field-row"><div className="field"><label htmlFor="price">Preço (R$) *</label><input id="price" required inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value)} placeholder="0,00"/></div><div className="field"><label htmlFor="promo">Preço promocional (R$)</label><input id="promo" inputMode="decimal" value={promoText} onChange={(e) => setPromoText(e.target.value)} placeholder="Opcional"/></div></div><label className="check-row"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })}/><span><strong>Destacar na página inicial</strong><small>Usar a foto deste produto na área principal</small></span></label><label className="check-row"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })}/><span><strong>Mostrar na loja</strong><small>Desative para ocultar sem excluir</small></span></label>{error && <p className="form-error" role="alert">{error}</p>}</div><div className="modal-foot"><button type="button" className="button button-ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="button button-dark" disabled={busy}><Save size={17}/>{busy ? "Salvando..." : "Salvar produto"}</button></div></form></div></div>}
  </div>;
}
