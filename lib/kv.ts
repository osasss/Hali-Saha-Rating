import { kv } from '@vercel/kv';

const KEY = 'matches-data';

export type Player = { id: string; name: string };
export type Match = {
  id: string;
  name: string;
  date: string;
  players: Player[];
  ratings: Record<string, Record<string, number>>; // raterId -> playerId -> score
  createdAt: number;
};

export async function getMatches(): Promise<Match[]> {
  const data = await kv.get<Match[]>(KEY);
  return data || [];
}

export async function saveMatches(matches: Match[]): Promise<void> {
  await kv.set(KEY, matches);
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
