import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nanda Doces de Minas | Sabor que conquista",
  description: "Conheça o catálogo da Nanda Doces de Minas e monte seu pedido pelo WhatsApp."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
