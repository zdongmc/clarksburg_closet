import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Clarksburg Closet',
  description:
    'Clothing requests and record keeping for Clarksburg Closet, a free clothing ministry of Cedarbrook Community Church.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
