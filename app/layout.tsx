import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Script from "next/script";
import { Source_Serif_4, Inter } from "next/font/google";
import NavLinks from "./NavLinks";
import "./globals.css";

const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-serif", weight: ["400", "600", "700"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://shaktisecur.in"),
  title: {
    default: "ShaktiSecur — Technology & Cybersecurity News",
    template: "%s — ShaktiSecur",
  },
  description:
    "Daily technology and cybersecurity news, analysis, and explainers — covering software, AI, and the security world.",
  openGraph: {
    type: "website",
    siteName: "ShaktiSecur",
    title: "ShaktiSecur — Technology & Cybersecurity News",
    description:
      "Daily technology and cybersecurity news, analysis, and explainers — covering software, AI, and the security world.",
    url: "https://shaktisecur.in",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShaktiSecur — Technology & Cybersecurity News",
    description:
      "Daily technology and cybersecurity news, analysis, and explainers — covering software, AI, and the security world.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4227084691988266"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body style={{ margin: 0, fontFamily: "var(--font-sans), system-ui, sans-serif", color: "#242424", background: "#fff" }}>
        {/* Google Analytics (GA4) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DH3MGCG43M"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DH3MGCG43M');
          `}
        </Script>
        <header style={{ borderBottom: "1px solid #e6e6e6" }}>
          <nav
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
              rowGap: 8,
            }}
          >
            <Link
              href="/"
              style={{
                fontFamily: "var(--font-serif), Georgia, serif",
                fontWeight: 700,
                fontSize: 24,
                textDecoration: "none",
                letterSpacing: "-0.5px",
                display: "inline-flex",
                gap: 6,
              }}
            >
              <span style={{ color: "#242424" }}>Shakti</span>
              <span style={{ color: "#0f766e" }}>Secur</span>
            </Link>
            <NavLinks />
          </nav>
        </header>
        <main>{children}</main>
        <footer
          style={{
            borderTop: "1px solid #e6e6e6",
            padding: "32px 24px",
            textAlign: "center",
            fontSize: 13,
            color: "#6b6b6b",
          }}
        >
          © {new Date().getFullYear()} ShaktiSecur.in. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
