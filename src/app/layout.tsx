import type { Metadata } from "next";
import { Inter, Lusitana } from "next/font/google";
import Image from 'next/image';
import "./globals.css";

// const inter = Inter({ subsets: ["latin"] });

const lusitana = Lusitana({
  weight: ['400', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Pasi Diagram Editor [UNDER CONSTRUCTION]",
  description: "An editor for 'ontological' diagrams",
  icons: {
    icon: "/images/icon.ico"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={lusitana.className+' antialiased'}>{children}</body>
    </html>
  );
}
