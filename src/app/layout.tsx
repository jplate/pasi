import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";

//const inter = Inter({ subsets: ["latin"] });

const raleway = Raleway({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "Pasi Diagram Editor [UNDER CONSTRUCTION]",
  description: "An editor for 'ontological' diagrams",
  icons: {
    icon: "/src/app/icon.svg"
  }
};

export default function RootLayout({children,}: Readonly<{children: React.ReactNode;}>) {
  return (
    <html lang="en">
      <body className={`${raleway.className}`}>
        {children}
      </body>
    </html>
  );
}

