import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Pasi Diagram Editor',
    description: "An editor for 'ontological' diagrams",
    icons: {
        icon: '/icon.svg',
    },
};

/**
 * Original simple version:
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang='en'>
            <body>{children}</body>
        </html>
    );
}

/**
 * Version with react-scan:
 *
export default function RootLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return (
      <html lang='en'>
        <head>
          <script src='https://unpkg.com/react-scan/dist/auto.global.js' async />
        </head>
        <body>{children}</body>
      </html>
    )
  }
*/
