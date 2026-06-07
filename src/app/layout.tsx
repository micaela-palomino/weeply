import type { Metadata } from 'next';
import '@/app/globals.css';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { PwaSetup } from '@/components/pwa/PwaSetup';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });


export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Weeply',
    description: 'Planificación de equilibrio semanal',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={cn("dark font-sans", inter.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ff6eb5" />
      </head>
      <body>
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <PwaSetup />
      </body>
    </html>
  );
}

