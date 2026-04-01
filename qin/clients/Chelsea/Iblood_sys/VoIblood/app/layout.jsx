import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { ClientAuthProvider } from '@/components/auth/client-auth-provider';
import './globals.css';

const _geist = Geist({ subsets: ['latin'] });
const _geistMono = Geist_Mono({ subsets: ['latin'] });

export const metadata = {
  title: 'iBlood - Blood Bank Management System',
  description:
    'Centralized, real-time blood bank management platform for hospitals and healthcare facilities',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/IBloodlogo.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/IBloodlogo.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ClientAuthProvider>
          {children}
          <Analytics />
        </ClientAuthProvider>
      </body>
    </html>
  );
}
