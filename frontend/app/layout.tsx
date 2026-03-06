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
      </body>
    </html>
  );
}
