import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NyayAI — AI Legal Aid for Common Indians',
  description: 'Understand your rights, map your legal path, and draft legal notices instantly in English and Hindi. Empowering common citizens with free AI legal aid.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
