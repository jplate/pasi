import type { Metadata } from 'next'
import './globals.css'


export const metadata: Metadata = {
  title: "Pasi Diagram Editor [UNDER CONSTRUCTION]",
  description: "An editor for 'ontological' diagrams",
  icons: {
    icon: "/src/app/icon.svg"
  }
};

export default function RootLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

