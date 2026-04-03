import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "AffiliateLab - Smart Product Reviews",
  description: "Automated affiliate reviews, comparisons, and buying guides."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="site-background" />
        <div className="site-orb site-orb-left" />
        <div className="site-orb site-orb-right" />
        <Header />
        <main className="container-shell py-8">{children}</main>
        <footer className="mt-20 border-t border-white/10 bg-[rgba(5,10,18,0.8)]">
          <div className="container-shell py-10 text-center">
            <p className="text-sm text-white/68">
              <strong>Affiliate Disclosure:</strong> As an Amazon Associate, we earn from qualifying purchases.
              This means we may earn a small commission on purchases made through our links, at no extra cost to you.
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/38">
              &copy; {new Date().getFullYear()} AffiliateLab India. Prices and availability are subject to change.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
