import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xena',
  description: 'Standalone matrix-blue chat UI for Xena via OpenClaw Gateway.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
