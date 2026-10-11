import type { Metadata, Viewport } from 'next';
import { Lexend } from 'next/font/google';
import './globals.css';

const lexend = Lexend({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-lexend',
});

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Superlistas.online',
  description: 'Superlistas.online - Listas de compras rápidas, inteligentes e acessíveis',
  applicationName: 'Superlistas.online',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Superlistas.online',
    description: 'Superlistas.online - Listas de compras rápidas, inteligentes e acessíveis',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Superlistas.online',
    description: 'Superlistas.online - Listas de compras rápidas, inteligentes e acessíveis',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={lexend.variable}>
      <body suppressHydrationWarning className={`${lexend.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-emerald-200`}>
        {children}
      </body>
    </html>
  );
}
