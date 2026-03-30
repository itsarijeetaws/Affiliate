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
        <Header />
        <main className="container-shell py-8">{children}</main>
        <footer className="mt-16 border-t border-slate-200 bg-slate-50">
          <div className="container-shell py-8 text-center">
            <p className="text-sm text-slate-500">
              <strong>Affiliate Disclosure:</strong> As an Amazon Associate, we earn from qualifying purchases.
              This means we may earn a small commission on purchases made through our links, at no extra cost to you.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              &copy; {new Date().getFullYear()} AffiliateLab India. Prices and availability are subject to change.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
