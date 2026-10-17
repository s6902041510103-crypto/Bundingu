import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Prompt, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Knowledge Snake — เกมบันไดงูพิชิตความรู้",
    template: "%s | Knowledge Snake",
  },
  description:
    "เกมการศึกษา Multiplayer แนว Kahoot × Snake & Ladder — สร้างเกม ได้ PIN เข้าห้อง ตอบคำถาม ทอยลูกเต๋า เดินผ่านงูและบันได แข่งขันขึ้นอันดับ",
  keywords: [
    "เกมการศึกษา",
    "multiplayer",
    "kahoot",
    "snake and ladder",
    "quiz game",
    "classroom game",
    "edtech",
  ],
  authors: [{ name: "Knowledge Snake Team" }],
  creator: "Knowledge Snake",
  publisher: "Knowledge Snake",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "th_TH",
    url: "https://knowledge-snake.game",
    siteName: "Knowledge Snake",
    title: "Knowledge Snake — เกมบันไดงูพิชิตความรู้",
    description:
      "เกมการศึกษา Multiplayer แนว Kahoot × Snake & Ladder — เรียนรู้อย่างสนุก แข่งขันกับเพื่อน",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Knowledge Snake Game Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Snake",
    description: "เกมบันไดงูพิชิตความรู้ — เรียนรู้อย่างสนุก แข่งขันกับเพื่อน",
    images: ["/og-image.png"],
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${geistMono.variable} ${prompt.variable} ${ibmPlexSansThai.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full flex flex-col bg-bg-deep text-foreground">
        {children}
      </body>
    </html>
  );
}