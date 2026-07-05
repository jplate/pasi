import type { Metadata } from 'next';
import { Raleway, Lora } from 'next/font/google';
import '@/app/globals.css';

const raleway = Raleway({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600'],
    display: 'swap',
    variable: '--font-raleway',
});

const lora = Lora({
    subsets: ['latin'],
    weight: ['400', '600'],
    style: ['normal', 'italic'],
    display: 'swap',
    variable: '--font-lora',
});

const title = 'Pasi — Web-based Diagram Editor for LaTeX';
const description =
    'A free, browser-based diagram editor that exports TeXdraw code for use in LaTeX documents. Draw nodes, contours, and arrows, then generate LaTeX-ready code with one click.';

export const metadata: Metadata = {
    title,
    description,
    metadataBase: new URL('https://jplate.github.io'),
    openGraph: {
        title,
        description,
        type: 'website',
        url: 'https://jplate.github.io/pasi',
    },
    twitter: {
        card: 'summary',
        title,
        description,
    },
    verification: {
        google: 'TcSpSJRp_j2y0o20j_QW9co75JRUWQzIZqQgCTfbmf8',
    },
};

/**
 * Original simple version:
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang='en' className={`${raleway.variable} ${lora.variable}`} suppressHydrationWarning>
            <body suppressHydrationWarning>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `(() => {
  try {
    const storedMode = localStorage.getItem('color-scheme');
    const dark = storedMode ? storedMode === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.classList.toggle('light', !dark);
    document.body.classList.toggle('dark', dark);
    document.body.classList.toggle('light', !dark);
    document.documentElement.style.setProperty('color-scheme', dark ? 'dark' : 'light');
  } catch (_err) {}
})();`,
                    }}
                />
                {children}
            </body>
        </html>
    );
}

/**
 * Version with react-scan:
 *
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en'>
            <head>
                <script src='https://unpkg.com/react-scan/dist/auto.global.js' async />
            </head>
            <body>{children}</body>
        </html>
    );
}
*/
