import type { Metadata, Viewport } from 'next';
import * as React from 'react';
import './globals.css';
import { ToastProvider } from '@/components/toast';

export const metadata: Metadata = {
  title: {
    default: 'طلال تكنو — لوحة التحكم',
    template: '%s · طلال تكنو'
  },
  description: 'نظام سحابي عربي لإدارة المطاعم ونقاط البيع — محاسبة، مخزون، ZATCA Sandbox، تكاملات توصيل ودفع.',
  applicationName: 'Talal Techno',
  icons: {
    icon: '/icon.svg'
  }
};

export const viewport: Viewport = {
  themeColor: '#0B3D2E',
  width: 'device-width',
  initialScale: 1
};

const themeScript = `(function(){try{var t=localStorage.getItem('talaltechno_theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
