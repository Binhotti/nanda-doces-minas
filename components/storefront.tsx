"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowRight, Heart, Menu, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Product } from "@/lib/products";
import Title from "@/components/title";

type CartLine = { id: number; quantity: number };
const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default function Storefront({ products, catalogPage = false }: { products: Product[]; catalogPage?: boolean }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState("Todos");
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem("nanda-cart") || "[]")); } catch { /* ignore old cart */ }
  }, []);
  useEffect(() => { localStorage.setItem("nanda-cart", JSON.stringify(cart)); }, [cart]);

  const categories = ["Todos", ...Array.from(new Set(products.map((p) => p.category)))];
  const visible = catalogPage ? (category === "Todos" ? products : products.filter((p) => p.category === category)) : products.slice(0, 3);
  const lines = cart.map((line) => ({ ...line, product: products.find((p) => p.id === line.id) })).filter((line) => line.product) as (CartLine & { product: Product })[];
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + (line.product.promoPrice ?? line.product.price) * line.quantity, 0);

  function changeQuantity(id: number, delta: number) {
    setCart((current) => {
      const existing = current.find((line) => line.id === id);
      if (!existing && delta > 0) return [...current, { id, quantity: 1 }];
      return current.map((line) => line.id === id ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0);
    });
  }

  function addToCart(product: Product) {
    changeQuantity(product.id, 1);
    setCartOpen(true);
  }

  const message = useMemo(() => {
    const rows = lines.map((line) => `• ${line.quantity}x ${line.product.title} — ${money((line.product.promoPrice ?? line.product.price) * line.quantity)}`);
    return `Olá, Nanda! Gostaria de fazer um pedido:\n\n${rows.join("\n")}\n\n*Total: ${money(total)}*\n\nPode me confirmar a disponibilidade e a entrega?`;
  }, [lines, total]);
  const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

  return <>
    <div className="announcement">Feito com carinho, para momentos que merecem ser lembrados <Heart size={12} fill="currentColor" /></div>
    <header className="site-header">
      <a className="brand" href="/" aria-label="Nanda Doces de Minas, início"><span className="brand-mark">N</span><span><strong>Nanda</strong><small>DOCES DE MINAS</small></span></a>
      <nav className={menuOpen ? "nav open" : "nav"} aria-label="Navegação principal">
        <a href="/#historia" onClick={() => setMenuOpen(false)}>Nossa essência</a><a href="/produtos" aria-current={catalogPage ? "page" : undefined} onClick={() => setMenuOpen(false)}>Produtos</a><a href="/#como-pedir" onClick={() => setMenuOpen(false)}>Como pedir</a>
      </nav>
      <div className="header-actions"><button className="icon-button mobile-menu" aria-label="Abrir menu" onClick={() => setMenuOpen(!menuOpen)}><Menu size={22} /></button><button className="cart-trigger" onClick={() => setCartOpen(true)} aria-label={`Abrir pedido com ${count} itens`}><ShoppingBag size={18} /><span>Meu pedido</span><b>{count}</b></button></div>
    </header>

    <main>
      {!catalogPage && <section className="hero" id="inicio">
        <div className="hero-copy"><span className="kicker with-line">Doçura com alma mineira</span><Title as="h1" className="hero-title" delay={0.15} lines={["O sabor que conquista", <em key="e">começa aqui.</em>]} /><p>Doces feitos para transformar pequenos instantes em boas lembranças. Explore o catálogo, escolha seus favoritos e envie seu pedido com carinho.</p><div className="hero-actions"><a className="button button-dark" href="/produtos">Explorar os doces</a><a className="text-link" href="#historia">Conheça a Nanda <ArrowDown size={16} /></a></div><div className="hero-note"><span className="heart-scribble">♡</span><span>Feito com amor.<br/>Escolhido por você.</span></div></div>
        <div className="hero-art"><div className="hero-art-inner"><Image src="/brand/logo.webp" alt="Logo da Nanda Doces de Minas" fill sizes="(max-width: 760px) 70vw, 455px" loading="eager" fetchPriority="high" /></div></div>
      </section>}

      {!catalogPage && <section className="founder" id="historia">
        <div className="founder-photo"><Image src="/brand/nanda-retrato.webp" alt="Nanda, à frente da Nanda Doces de Minas" fill sizes="(max-width: 760px) 100vw, 48vw" className="founder-image" /><span className="founder-photo-fade" aria-hidden="true" /></div>
        <div className="founder-copy"><span className="kicker">Prazer, Nanda</span><Title lines={["O carinho", <em key="e">tem nome.</em>]} /><p>Conheça a Nanda, o rosto por trás da marca. Doces para celebrar, presentear e transformar pequenos momentos em boas lembranças.</p><div className="founder-signature">Nanda <span>♡</span></div><a className="text-link" href="#catalogo">Descubra os doces <ArrowRight size={16} /></a></div>
      </section>}

      <section className={catalogPage ? "catalog catalog-page" : "catalog"} id="catalogo"><div className="catalog-heading"><div><span className="kicker">{catalogPage ? "Catálogo completo" : "Escolha seus favoritos"}</span><Title className="title-rule" lines={catalogPage ? ["Todos os nossos", <em key="e">doces.</em>] : ["Doces para", <em key="e">se encantar.</em>]} /></div><p>Explore o catálogo e monte seu pedido. A Nanda confirma todos os detalhes diretamente com você.</p></div>
        {products.length > 0 ? <>{catalogPage && <div className="category-list" role="tablist" aria-label="Categorias">{categories.map((item) => <button key={item} role="tab" aria-selected={category === item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>}<div className="product-grid">{visible.map((product) => <article className="product-card" key={product.id}><div className="product-image">{product.image ? <Image src={product.image} alt={product.title} fill sizes="(max-width: 760px) 100vw, (max-width: 1000px) 50vw, 33vw" /> : <div className="product-image-empty"><span>♡</span>Nanda Doces de Minas</div>}{product.promoPrice && <span className="product-badge">Oferta especial</span>}</div><div className="product-body"><div><span className="product-category">{product.category}</span><h3>{product.title}</h3><p>{product.description}</p></div><div className="product-bottom"><div className="price">{product.promoPrice && <s>{money(product.price)}</s>}<strong>{money(product.promoPrice ?? product.price)}</strong></div><button className="add-to-cart" onClick={() => addToCart(product)} aria-label={`Adicionar ${product.title} ao carrinho`}><ShoppingBag size={16}/>Adicionar ao carrinho</button></div></div></article>)}</div></> : <div className="catalog-empty"><div className="empty-monogram">N</div><div><span className="kicker">Em preparação</span><h3>Algo doce está chegando.</h3><p>O catálogo será apresentado aqui em breve. Enquanto isso, a Nanda prepara cada detalhe com carinho.</p></div></div>}
        {!catalogPage && <div className="catalog-more"><a className="button button-dark" href="/produtos">Ver mais produtos</a></div>}
      </section>

      {!catalogPage && <section className="how" id="como-pedir"><div className="how-copy"><span className="kicker">Simples como deve ser</span><Title className="title-rule" lines={["Seu doce favorito,", <em key="e">a poucos passos.</em>]} /><p>Escolha com calma. O resto a gente conversa.</p></div><div className="how-steps"><div><span>01</span><h3>Explore</h3><p>Encontre seus doces favoritos no catálogo.</p></div><div><span>02</span><h3>Monte seu pedido</h3><p>Adicione os produtos e confira o total.</p></div><div><span>03</span><h3>Converse com a Nanda</h3><p>Envie o pedido completo pelo WhatsApp para confirmar os detalhes.</p></div></div></section>}
      {!catalogPage && <section className="closing"><span className="kicker">Nanda Doces de Minas</span><Title className="title-rule center" lines={["Tem sempre um motivo", <em key="e">para celebrar o doce da vida.</em>]} /><a className="button button-light" href="/produtos">Escolher meus doces</a></section>}
    </main>
    <footer><div className="footer-main"><a className="brand" href="/"><span className="brand-mark">N</span><span><strong>Nanda</strong><small>DOCES DE MINAS</small></span></a><p>Sabor que conquista.</p><a href="/">Voltar ao início ↑</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nanda Doces de Minas</span><span>Feito com carinho em cada detalhe ♡</span></div></footer>

    {phone && <a className="whatsapp-float" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="Conversar com a Nanda pelo WhatsApp" title="Conversar pelo WhatsApp"><SiWhatsapp size={31}/></a>}

    {cartOpen && <div className="drawer-layer"><div className="drawer-backdrop" onClick={() => setCartOpen(false)} /><aside className="cart-drawer" aria-label="Meu pedido"><div className="drawer-head"><div><span className="kicker">Seleção especial</span><h2>Meu pedido <span>({count})</span></h2></div><button className="icon-button" aria-label="Fechar pedido" onClick={() => setCartOpen(false)}><X/></button></div>{lines.length ? <><div className="cart-lines">{lines.map(({ product, quantity }) => <div className="cart-line" key={product.id}><div className="cart-thumb">{product.image ? <Image src={product.image} alt="" fill sizes="75px" /> : <span>N</span>}</div><div className="cart-line-info"><h3>{product.title}</h3><span>{money(product.promoPrice ?? product.price)}</span><div className="quantity"><button onClick={() => changeQuantity(product.id, -1)} aria-label={`Diminuir ${product.title}`}>{quantity === 1 ? <Trash2 size={13}/> : <Minus size={13}/>}</button><b>{quantity}</b><button onClick={() => changeQuantity(product.id, 1)} aria-label={`Aumentar ${product.title}`}><Plus size={13}/></button></div></div><strong>{money((product.promoPrice ?? product.price) * quantity)}</strong></div>)}</div><div className="drawer-foot"><div className="total"><span>Total estimado</span><strong>{money(total)}</strong></div><p>Disponibilidade, entrega e pagamento serão confirmados no WhatsApp.</p>{phone ? <a className="button button-dark checkout" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Enviar pelo WhatsApp</a> : <button className="button button-dark checkout" disabled>WhatsApp em configuração</button>}</div></> : <div className="cart-empty"><ShoppingBag size={40}/><h3>Seu pedido começa aqui.</h3><p>Escolha seus doces favoritos no catálogo.</p><a className="button button-dark" href="/produtos">Explorar os doces</a></div>}</aside></div>}
  </>;
}
