import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { LoadingProvider } from '@/components/providers/loading-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Loancase - Commercial Loan Referral Platform',
  description: 'Connect your clients with commercial finance opportunities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <LoadingProvider>
          {children}
        </LoadingProvider>
        <Toaster />
      </body>
    </html>
  );
}