export interface Event {
  id: string;
  name: string;
  venue: string;
  address?: string;
  city?: string;
  dayOfWeek: number;
  startTimeLocal: string;
  signupTimeLocal?: string;
  cost?: string;
  type: 'open-mic' | 'booked' | 'showcase';
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'irregular';
  signupMethod?: 'in-person' | 'online' | 'dm' | 'email' | 'other';
  contact?: string;
  website?: string;
  notes?: string;
  startsThisWeek?: boolean;
}