import { NextResponse } from 'next/server';
import { getMatches, saveMatches } from '@/lib/kv';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const { raterId, scores } = body as { raterId: string; scores: Record<string, number> };

  const matches = await getMatches();
  const match = matches.find((m) => m.id === params.id);
  if (!match) return NextResponse.json({ error: 'Maç bulunamadı.' }, { status: 404 });

  const rater = match.players.find((p) => p.id === raterId);
  if (!rater) return NextResponse.json({ error: 'Oyuncu bulunamadı.' }, { status: 400 });

  if (match.ratings && match.ratings[raterId]) {
    return NextResponse.json(
      { error: 'Bu oyuncu zaten puan vermiş. Puanlar bir kez girildikten sonra değiştirilemez.' },
      { status: 409 }
    );
  }

  const validPlayerIds = new Set(match.players.filter((p) => p.id !== raterId).map((p) => p.id));
  const cleanScores: Record<string, number> = {};

  for (const [pid, score] of Object.entries(scores || {})) {
    if (!validPlayerIds.has(pid)) continue;
    const num = Number(score);
    if (!Number.isInteger(num) || num < 1 || num > 10) {
      return NextResponse.json(
        { error: 'Puanlar 1 ile 10 arasında tam sayı olmalı.' },
        { status: 400 }
      );
    }
    cleanScores[pid] = num;
  }

  if (Object.keys(cleanScores).length !== validPlayerIds.size) {
    return NextResponse.json(
      { error: 'Tüm diğer oyunculara puan vermelisiniz.' },
      { status: 400 }
    );
  }

  match.ratings = match.ratings || {};
  match.ratings[raterId] = cleanScores;
  await saveMatches(matches);
  return NextResponse.json(match);
}
