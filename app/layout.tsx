import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRISM: visual systems, made tangible",
  description:
    "A browser-first design workbench for exploring, comparing, and exporting frontend visual systems.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {children}
      </body>
    </html>
  );
}
