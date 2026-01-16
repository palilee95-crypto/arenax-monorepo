import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../../../../packages/ui/src/styles/globals.css";
import "../../../../packages/ui/src/styles/components.css";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arenax | Superadmin Dashboard",
  description: "Superadmin dashboard for Arenax MVP",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
