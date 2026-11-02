import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: 'قائمة طلال تكنو',
  description: 'قائمة إلكترونية للطلب من الطاولة — طلال تكنو.',
  applicationName: 'Talal Techno E-Menu',
  manifest: `${basePath}/manifest.webmanifest`,
  icons: {
    icon: `${basePath}/icon.svg`,
    apple: `${basePath}/apple-touch-icon.png`
  },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'طلال تكنو' }
};

export const viewport: Viewport = {
  themeColor: '#07241B',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
