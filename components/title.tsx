"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

type TitleProps = {
  as?: "h1" | "h2";
  lines: ReactNode[];
  className?: string;
  /** Atraso inicial em segundos, útil para o título do topo da página. */
  delay?: number;
};

/**
 * Título que "sobe" linha por linha quando entra na tela ao rolar a página.
 * Cada linha é recortada por uma máscara e desliza de baixo para cima; a animação roda uma vez.
 * Sem JavaScript ou com "reduzir movimento" ativado, o texto aparece normalmente.
 */
export default function Title({ as: Tag = "h2", lines, className = "", delay = 0 }: TitleProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.3, rootMargin: "0px 0px -6% 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <Tag ref={ref} className={`reveal ${visible ? "in" : ""} ${className}`.trim()}>
    {lines.map((line, index) => <Fragment key={index}>
      {index > 0 && " "}
      <span className="line"><span className="line-in" style={{ transitionDelay: `${delay + index * 0.14}s` }}>{line}</span></span>
    </Fragment>)}
  </Tag>;
}
