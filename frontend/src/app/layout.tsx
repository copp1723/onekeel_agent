import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Insight Engine',
  description: 'CRM analytics and insights generation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-neutral-50 text-neutral-900`}>
        <Providers>
          <main className="min-h-screen p-4 md:p-8">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}