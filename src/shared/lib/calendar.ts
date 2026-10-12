import { createEventInCalendarAsync } from 'expo-calendar/legacy';

export interface CalendarEventInput {
  title: string;
  startAt: string;
  endAt: string;
  location?: string;
  notes?: string;
}

/**
 * Opens the system dialog to add an event to the phone calendar (the person confirms there, so
 * no calendar permission is needed). Returns whether it was saved.
 */
export async function addToCalendar(event: CalendarEventInput): Promise<boolean> {
  const result = await createEventInCalendarAsync({
    title: event.title,
    startDate: new Date(event.startAt),
    endDate: new Date(event.endAt),
    location: event.location,
    notes: event.notes,
  });
  return result.action === 'saved' || result.action === 'done';
}
