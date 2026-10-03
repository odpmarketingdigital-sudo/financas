import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import "./globals.css";


const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // `cover` faz o conteúdo ocupar toda a tela (edge-to-edge) respeitando as
  // safe areas do iPhone (notch/barra inferior).
  viewportFit: "cover",
  // Cor primária do app (teal), batendo com o manifest e o ícone do iOS.
  themeColor: "#00796b",
};

export const metadata: Metadata = {
  title: "Tostão em Dia",
  description:
    "Aplicação educacional de finanças pessoais para ajudar famílias a organizar despesas e recebíveis.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    // Habilita o modo standalone no iOS com a barra de status translúcida.
    statusBarStyle: "black-translucent",
    title: "Tostão em Dia",
  },
  icons: {
    // Ícone dedicado ao iOS (180x180, fundo sólido sem transparência).
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
