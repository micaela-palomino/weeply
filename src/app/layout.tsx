import type { Metadata } from 'next';
import '@/app/globals.css';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { PwaSetup } from '@/components/pwa/PwaSetup';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Weeply',
    description: 'Planificación de equilibrio semanal',
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0ea5e9" />
      </head>
      <body>
        <ReactQueryProvider>{children}</ReactQueryProvider>
        <PwaSetup />
      </body>
    </html>
  );
}

