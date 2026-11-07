import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display", display: "swap" });
const body = Jost({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });

export const metadata: Metadata = {
  title: "Nanda Doces de Minas | Sabor que conquista",
  description: "Conheça o catálogo da Nanda Doces de Minas e monte seu pedido pelo WhatsApp."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
    <body>
      <noscript><style>{".reveal .line-in{transform:none!important;transition:none!important}"}</style></noscript>
      {children}
    </body>
  </html>;
}
