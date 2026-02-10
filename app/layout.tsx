import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Theater - Interaktywny Teatr z AI",
  description: "Aplikacja głosowej interakcji z postacią teatralną przy użyciu AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <body
        className="antialiased bg-gray-950 text-white min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
