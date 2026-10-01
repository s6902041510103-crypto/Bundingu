import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import './globals.css';

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  variable: '--font-ibm-plex-thai',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Knowledge Snake | เกมบันไดงูพิชิตความรู้',
  description: 'เกมการศึกษาแบบ Multiplayer ผสมผสาน Kahoot กับ Snake & Ladder เรียนรู้ผ่านการแข่งขันสนุกสนาน',
  keywords: ['education', 'game', 'multiplayer', 'kahoot', 'snake and ladder', 'thai', 'classroom'],
  authors: [{ name: 'Knowledge Snake Team' }],
  openGraph: {
    title: 'Knowledge Snake | เกมบันไดงูพิชิตความรู้',
    description: 'เกมการศึกษาแบบ Multiplayer เรียนรู้ผ่านการแข่งขันสนุกสนาน',
    type: 'website',
    locale: 'th_TH',
  },
};

export const viewport: Viewport = {
  themeColor: '#312e81',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${ibmPlexSansThai.variable} font-thai antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}