import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Indirapuram Property Price Predictor | Flats, Plots & Circle Rates",
  description: "Get instant, algorithmic property valuations for Indirapuram, Ghaziabad. Compare market rates vs. circle rates for flats and plots. Free tool for buyers and sellers.",
  keywords: "Indirapuram property price, ATS village price, Gaur GC rate, Indirapuram plot rate, Ghaziabad circle rate, property valuation NCR",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}