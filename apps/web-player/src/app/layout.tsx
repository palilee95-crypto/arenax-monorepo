import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "@arenax/ui/styles/globals.css";
import "@arenax/ui/styles/components.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arenax | Player Dashboard",
  description: "Player dashboard for Arenax MVP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} `}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
