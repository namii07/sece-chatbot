import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SECE AI Assistant",
  description: "Ask anything about Sri Eshwar College of Engineering (SECE), Coimbatore.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
