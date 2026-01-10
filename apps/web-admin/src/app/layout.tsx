import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../../../../packages/ui/src/styles/globals.css";
import "../../../../packages/ui/src/styles/components.css";
import { TopBar } from "@arenax/ui";
import { SidebarWrapper } from "../components/SidebarWrapper";
import { cookies } from "next/headers";
import { supabase } from "@arenax/database";

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

import { redirect } from "next/navigation";


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
