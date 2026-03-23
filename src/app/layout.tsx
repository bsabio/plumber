import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Pipe Dream Plumbing — Virtual Employee',
  description:
    'AI-powered virtual assistant for Pipe Dream Plumbing. Get plumbing tips, schedule appointments, and manage support tickets.',
  keywords: ['plumbing', 'virtual assistant', 'appointments', 'support'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
