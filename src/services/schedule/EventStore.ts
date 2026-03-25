import type { ScheduleEvent } from '@/types/schedule';

export interface EventStore {
  getAllEvents(): Promise<ScheduleEvent[]>;
  setAllEvents(events: ScheduleEvent[]): Promise<void>;
}

