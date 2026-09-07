"use client";

import { useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/disclaimer", label: "Disclaimer" },
];

export default function NavLinks() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginLeft: "auto", position: "relative" }}>
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#242424" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>
      <div className={`nav-links${open ? " nav-links-open" : ""}`}>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
