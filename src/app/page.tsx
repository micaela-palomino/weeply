'use client';

import dynamic from 'next/dynamic';

const WeekCalendar = dynamic(
  () => import('@/components/calendar/WeekCalendar').then((m) => ({ default: m.WeekCalendar })),
  { ssr: false },
);

export default function HomePage() {
  return <WeekCalendar />;
}
