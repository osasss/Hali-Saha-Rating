import { NextResponse } from 'next/server';
import { getMatches, saveMatches } from '@/lib/kv';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const matches = await getMatches();
  const match = matches.find((m) => m.id === params.id);
  if (!match) return NextResponse.json({ error: 'Maç bulunamadı.' }, { status: 404 });
  return NextResponse.json(match);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const matches = await getMatches();
  const next = matches.filter((m) => m.id !== params.id);
  if (next.length === matches.length) {
    return NextResponse.json({ error: 'Maç bulunamadı.' }, { status: 404 });
  }
  await saveMatches(next);
  return NextResponse.json({ ok: true });
}
