import Header from "@/components/Header";
import SideNav from "@/components/SideNav";
import { Providers } from "@/app/providers";
import type { Metadata } from "next";
import { Suspense } from "react";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

function SideNavFallback() {
  return (
    <aside className="flex w-[220px] shrink-0 flex-col self-stretch border-r border-primary-200 bg-primary-50" />
  );
}

export const metadata: Metadata = {
  title: "FocusNode",
  description: "Keep track of your tasks and projects",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="flex h-dvh flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col bg-primary-100">
          <Header />
          <div className="flex min-h-0 flex-1">
            <Suspense fallback={<SideNavFallback />}>
              <SideNav />
            </Suspense>
            <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
              <Providers>{children}</Providers>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
