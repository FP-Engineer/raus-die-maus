export interface EventItem {
  id: string;
  date: string | null;
  title: string;
  desc: string;
  age: string[];
  veedel: string;
  types: string[];
  emoji: string;
  imageUrl?: string | null;
  instagramUrl?: string | null;
  instagramTimestamp?: string | null;
}
