"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowRight, Check, Heart, Menu, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Product } from "@/lib/products";

type CartLine = { id: number; quantity: number };
const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default function Storefront({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("nanda-cart") || "[]")); } catch { /* ignore old cart */ }
  }, []);
  useEffect(() => { localStorage.setItem("nanda-cart", JSON.stringify(cart)); }, [cart]);

  const categories = ["Todos", ...Array.from(new Set(products.map((p) => p.category)))];
  const visible = category === "Todos" ? products : products.filter((p) => p.category === category);
  const lines = cart.map((line) => ({ ...line, product: products.find((p) => p.id === line.id) })).filter((line) => line.product) as (CartLine & { product: Product })[];
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + (line.product.promoPrice ?? line.product.price) * line.quantity, 0);
  const featured = products.find((p) => p.featured && p.image) ?? products.find((p) => p.image);

  function changeQuantity(id: number, delta: number) {
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (!existing && delta > 0) return [...current, { id, quantity: 1 }];
      return current.map((line) => line.id === id ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0);
    });
  }

  function addToCart(product: Product) {
    changeQuantity(product.id, 1);
    setNotice(`${product.title} adicionado ao pedido`);
    window.setTimeout(() => setNotice(""), 2800);
  }

  const message = useMemo(() => {
    const rows = lines.map((line) => `• ${line.quantity}x ${line.product.title} — ${money((line.product.promoPrice ?? line.product.price) * line.quantity)}`);
    return `Olá, Nanda! Gostaria de fazer um pedido:\n\n${rows.join("\n")}\n\n*Total: ${money(total)}*\n\nPode me confirmar a disponibilidade e a entrega?`;
  }, [lines, total]);
  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

  return <>
    <div className="announcement">Feito com carinho, para momentos que merecem ser lembrados <Heart size={12} fill="currentColor" /></div>
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Nanda Doces de Minas, início"><span className="brand-mark">N</span><span><strong>Nanda</strong><small>DOCES DE MINAS</small></span></a>
      <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegação principal">
        <a href="#historia" onClick={() => setMenuOpen(false)}>Nossa essência</a><a href="#catalogo" onClick={() => setMenuOpen(false)}>Doces</a><a href="#como-pedir" onClick={() => setMenuOpen(false)}>Como pedir</a>
      </nav>
      <div className="header-actions"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={22} /></button><button className="cart-trigger" onClick={() => setCartOpen(true)} aria-label={`Abrir pedido com ${count} itens`}><ShoppingBag size={18} /><span>Meu pedido</span><b>{count}</b></button></div>
    </header>

    <main>
      <section className="hero" id="inicio">
        <div className="hero-copy"><div className="eyebrow"><span className="line" /> DOÇURA COM ALMA MINEIRA</div><h1>O sabor que <em>conquista</em> começa aqui.</h1><p>Doces feitos para transformar pequenos instantes em boas lembranças. Explore o catálogo, escolha seus favoritos e envie seu pedido com carinho.</p><div className="hero-actions"><a className="button button-dark" href="#catalogo">Explorar os doces <ArrowRight size={17} /></a><a className="text-link" href="#historia">Conheça a Nanda <ArrowDown size={16} /></a></div><div className="hero-note"><span className="heart-scribble">♡</span><span>Feito com amor.<br/>Escolhido por você.</span></div></div>
        <div className="hero-art"><div className="hero-art-inner">{featured ? <img src={featured.image} alt={featured.title} /> : <img src="/brand/logo.png" alt="Logo da Nanda Doces de Minas" />}</div><span className="hero-art-caption">NANDA DOCES DE MINAS · SABOR QUE CONQUISTA</span></div>
      </section>

      <section className="intro" id="historia"><div className="section-index">01 / A ESSÊNCIA</div><div><span className="eyebrow">UM CONVITE PARA SENTIR</span><h2>Um toque de Minas em cada <em>momento.</em></h2></div><p>A Nanda Doces de Minas celebra o prazer de presentear, compartilhar e saborear. Uma seleção de doces para escolher com calma e pedir de um jeito simples.</p></section>

      <section className="catalog" id="catalogo"><div className="catalog-heading"><div><span className="eyebrow">ESCOLHA SEUS FAVORITOS</span><h2>Doces para se <em>encantar.</em></h2></div><p>Explore o catálogo e monte seu pedido. A Nanda confirma todos os detalhes diretamente com você.</p></div>
        {products.length > 0 ? <><div className="category-list" role="tablist" aria-label="Categorias">{categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><div className="product-image">{product.image ? <img src={product.image} alt={product.title} /> : <div className="product-image-empty"><span>♡</span>Nanda Doces de Minas</div>}{product.promoPrice && <span className="product-badge">Oferta especial</span>}</div><div className="product-body"><div><span className="product-category">{product.category}</span><h3>{product.title}</h3><p>{product.description}</p></div><div className="product-bottom"><div className="price">{product.promoPrice && <s>{money(product.price)}</s>}<strong>{money(product.promoPrice ?? product.price)}</strong></div><button onClick={() => addToCart(product)} aria-label={`Adicionar ${product.title} ao pedido`}><Plus size={19}/></button></div></div></article>)}</div></> : <div className="catalog-empty"><div className="empty-monogram">N</div><div><span className="eyebrow">EM PREPARAÇÃO</span><h3>Algo doce está chegando.</h3><p>O catálogo será apresentado aqui em breve. Enquanto isso, a Nanda prepara cada detalhe com carinho.</p></div></div>}
      </section>

      <section className="how" id="como-pedir"><div className="how-copy"><span className="eyebrow">SIMPLES COMO DEVE SER</span><h2>Seu doce favorito, a poucos <em>passos.</em></h2><p>Escolha com calma. O resto a gente conversa.</p></div><div className="how-steps"><div><span>01</span><h3>Explore</h3><p>Encontre seus doces favoritos no catálogo.</p></div><div><span>02</span><h3>Monte seu pedido</h3><p>Adicione os produtos e confira o total.</p></div><div><span>03</span><h3>Converse com a Nanda</h3><p>Envie o pedido completo pelo WhatsApp para confirmar os detalhes.</p></div></div></section>
      <section className="closing"><span className="eyebrow">NANDA DOCES DE MINAS</span><h2>Tem sempre um motivo para celebrar o <em>doce</em> da vida.</h2><a className="button button-light" href="#catalogo">Escolher meus doces <ArrowRight size={17}/></a></section>
    </main>
    <footer><div className="footer-main"><a className="brand" href="#inicio"><span className="brand-mark">N</span><span><strong>Nanda</strong><small>DOCES DE MINAS</small></span></a><p>Sabor que conquista.</p><a href="#inicio">Voltar ao início ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nanda Doces de Minas</span><span>Feito com carinho em cada detalhe ♡</span></div></footer>

    {phone && <a className="whatsapp-float" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="Conversar com a Nanda pelo WhatsApp" title="Conversar pelo WhatsApp"><SiWhatsapp size={31}/></a>}

    {notice && <div className="toast" role="status"><Check size={16}/>{notice}</div>}
    {cartOpen && <div className="drawer-layer"><div className="drawer-backdrop" onClick={() => setCartOpen(false)} /><aside className="cart-drawer" aria-label="Meu pedido"><div className="drawer-head"><div><span className="eyebrow">SELEÇÃO ESPECIAL</span><h2>Meu pedido <span>({count})</span></h2></div><button className="icon-button" aria-label="Fechar pedido" onClick={() => setCartOpen(false)}><X/></button></div>{lines.length ? <><div className="cart-lines">{lines.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div className="cart-thumb">{product.image ? <img src={product.image} alt=""/> : <span>N</span>}</div><div className="cart-line-info"><h3>{product.title}</h3><span>{money(product.promoPrice ?? product.price)}</span><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)} aria-label={`Diminuir ${product.title}`}>{quantity === 1 ? <Trash2 size={13}/> : <Minus size={13}/>}</button><b>{quantity}</b><button onClick={() => changeQuantity(product.id, 1)} aria-label={`Aumentar ${product.title}`}><Plus size={13}/></button></div></div><strong>{money((product.promoPrice ?? product.price) * quantity)}</strong></div>)}</div><div className="drawer-foot"><div className="total"><span>Total estimado</span><strong>{money(total)}</strong></div><p>Disponibilidade, entrega e pagamento serão confirmados no WhatsApp.</p>{phone ? <a className="button button-dark checkout" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp <ArrowRight size={18}/></a> : <button className="button button-dark checkout" disabled>WhatsApp em configuração</button>}</div></> : <div className="cart-empty"><ShoppingBag size={40}/><h3>Seu pedido começa aqui.</h3><p>Escolha seus doces favoritos no catálogo.</p><button className="button button-dark" onClick={() => setCartOpen(false)}>Explorar os doces <ArrowRight size={16}/></button></div>}</aside></div>}
  </>;
}
