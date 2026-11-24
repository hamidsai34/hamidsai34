import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "gestionauto.ma",
  description: "Gestion de votre agence de location de voitures",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="top">
          <Link href="/" className="brand">gestionauto.ma</Link>
          <nav>
            <Link href="/contracts">العقود</Link>
            <Link href="/vehicles">السيارات</Link>
            <Link href="/clients">الزبناء</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
