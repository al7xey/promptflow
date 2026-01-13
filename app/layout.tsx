import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "PromptFlow",
  description: "Превращаем короткие запросы в глубокие промпты для нейросетей",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "PromptFlow",
    description: "Превращаем короткие запросы в глубокие промпты для нейросетей",
    url: "https://promptflow.app",
    siteName: "PromptFlow",
    type: "website",
    locale: "ru_RU",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "PromptFlow - Улучшение промптов для нейросетей",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PromptFlow",
    description: "Превращаем короткие запросы в глубокие промпты для нейросетей",
    images: ["/og-image.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}

