import { Inter } from "next/font/google";
import "./globals.css";

/* ─── Google Fonts ─────────────────────────────────────────────────────────────
   Load Inter with the weights used in reference.html (400–900).
   next/font/google handles self-hosting automatically (no external request).
──────────────────────────────────────────────────────────────────────────── */
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-inter",
  display: "swap",
});

/* ─── Page Metadata ──────────────────────────────────────────────────────────── */
export const metadata = {
  title: "Clarity - Operating Experience",
  description:
    "Experience the transformation from scattered tools to a unified operating system. The last workspace you will ever need.",
};

/* ─── Root Layout ────────────────────────────────────────────────────────────── */
export default function RootLayout({ children }) {
  return (
    /*
     * `dark` class enables dark mode Tailwind utilities.
     * `suppressHydrationWarning` prevents React warnings from browser extensions
     * that inject attributes into <html>.
     */
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#141414" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        {/* Material Symbols Outlined (variable icon font from Google) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful');
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-display antialiased bg-[#141414] text-slate-100 overflow-x-hidden`}
      >
        {children}
      </body>
    </html>
  );
}
