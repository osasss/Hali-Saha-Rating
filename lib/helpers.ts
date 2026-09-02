import type { Match } from './kv';

export function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function computeAverages(m: Match) {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  m.players.forEach((p) => {
    sums[p.id] = 0;
    counts[p.id] = 0;
  });
  Object.values(m.ratings || {}).forEach((raterScores) => {
    Object.entries(raterScores).forEach(([pid, score]) => {
      if (sums[pid] !== undefined) {
        sums[pid] += score;
        counts[pid]++;
      }
    });
  });
  return m.players
    .map((p) => ({
      id: p.id,
      name: p.name,
      avg: counts[p.id] ? sums[p.id] / counts[p.id] : null,
      voteCount: counts[p.id],
    }))
    .sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
}
