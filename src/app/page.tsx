import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold">Weeply</h1>
      <p className="mt-2 text-muted-foreground">
        Planifica tu semana y visualiza el equilibrio entre trabajo y vida personal.
      </p>

      <div className="mt-6">
        <Button asChild>
          <Link href="/calendar">Abrir calendario semanal</Link>
        </Button>
      </div>
    </main>
  );
}

