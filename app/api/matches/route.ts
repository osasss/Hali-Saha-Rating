import { NextResponse } from 'next/server';
import { getMatches, saveMatches, uid, Match } from '@/lib/kv';

export async function GET() {
  const matches = await getMatches();
  return NextResponse.json(matches);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, date, players } = body as { name: string; date: string; players: string[] };

  if (!date || !Array.isArray(players) || players.length < 2) {
    return NextResponse.json(
      { error: 'Tarih ve en az 2 oyuncu gerekli.' },
      { status: 400 }
    );
  }

  const matches = await getMatches();
  const match: Match = {
    id: uid(),
    name: (name && name.trim()) || `Maç - ${date}`,
    date,
    players: players.map((p) => ({ id: uid(), name: p.trim() })).filter((p) => p.name),
    ratings: {},
    createdAt: Date.now(),
  };

  matches.push(match);
  await saveMatches(matches);
  return NextResponse.json(match, { status: 201 });
}
