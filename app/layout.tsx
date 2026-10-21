import type { Metadata } from "next";
import "./globals.css";
import "./surfaces.css";
import "./landing.css";
import "./restyle.css";
import "./export-tools.css";
import "./inspector-tools.css";
import "./canvas-tools.css";
import { contrastBootScript, uiScaleBootScript } from "@/lib/contrast-boot";

export const metadata: Metadata = {
  title: "PRISM: visual systems, made tangible",
  description:
    "A browser-first design workbench for exploring, comparing, and exporting frontend visual systems.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-contrast="comfort" data-ui-scale="default" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: contrastBootScript + uiScaleBootScript,
          }}
        />
      </head>
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
