import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AnimatedBackground from "@/components/AnimatedBackground";

export const metadata: Metadata = {
  title: "Micci OS",
  description: "Personal operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased" style={{ background: "var(--bg-base)" }}>
        <AnimatedBackground />

        <div className="relative z-10 flex h-screen">
          <Sidebar />
          <main
            className="flex-1 overflow-y-auto pb-20 md:pb-0"
            style={{ background: "var(--bg-body)" }}
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
