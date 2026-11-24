import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/auth-actions";

export const metadata: Metadata = {
  title: "gestionauto.ma",
  description: "Gestion de votre agence de location de voitures",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#000000" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="top">
          <Link href="/" className="brand">gestionauto.ma</Link>
          {user && (
            <nav>
              <Link href="/contracts">العقود</Link>
              <Link href="/vehicles">السيارات</Link>
              <Link href="/clients">الزبناء</Link>
              <Link href="/settings">الذكاء الاصطناعي</Link>
              <form action={logout} style={{ display: "inline" }}>
                <button type="submit" className="link-button">خروج</button>
              </form>
            </nav>
          )}
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
