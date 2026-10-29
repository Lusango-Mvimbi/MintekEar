import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Header } from "@/components/Header";
import { company } from "@/lib/company";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: company.appName,
    template: `%s · ${company.appName}`,
  },
  description: company.tagline,
};

const theme = {
  "--brand": company.colors.primary,
  "--brand-dark": company.colors.primaryDark,
  "--ink": company.colors.ink,
  "--muted": company.colors.muted,
  "--paper": company.colors.paper,
  "--accent": company.colors.accent,
  "--line": company.colors.line,
} as CSSProperties;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-ZA" style={theme}>
      <body className="font-sans antialiased">
        <div className="h-1.5 bg-brand" />
        <Header />
        <main className="mx-auto w-full max-w-[1040px] px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-[1040px] px-4 pb-12 text-sm leading-6 text-muted print:hidden">
          A review stores the score, the words, and the day. It does not store a name, a staff number, or which computer it came from.
        </footer>
      </body>
    </html>
  );
}
