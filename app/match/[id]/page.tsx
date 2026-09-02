'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fmtDate, computeAverages } from '@/lib/helpers';

type Player = { id: string; name: string };
type Match = {
  id: string;
  name: string;
  date: string;
  players: Player[];
  ratings: Record<string, Record<string, number>>;
  createdAt: number;
};

type SubView = { screen: 'detail' } | { screen: 'rate'; raterId: string };

export default function MatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [sub, setSub] = useState<SubView>({ screen: 'detail' });

  async function loadMatch() {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.status === 404) {
        setNotFound(true);
        setLoaded(true);
        return;
      }
      const data = await res.json();
      setMatch(data);
    } catch (e) {
      setNotFound(true);
    }
    setLoaded(true);
  }

  useEffect(() => {
    loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  return (
    <>
      <Header />
      <div className="container">
        {!loaded ? (
          <div className="loading">Yükleniyor…</div>
        ) : notFound || !match ? (
          <div className="empty">Maç bulunamadı.</div>
        ) : sub.screen === 'detail' ? (
          <DetailScreen match={match} setSub={setSub} onChanged={loadMatch} />
        ) : (
          <RateScreen match={match} raterId={sub.raterId} setSub={setSub} onSaved={loadMatch} />
        )}
      </div>
    </>
  );
}

function Header() {
  return (
    <header>
      <h1>⚽ Maç Sonu Puanlama</h1>
      <p>Maçtan sonra oyuncuları puanlayın, maçın yıldızını görün</p>
    </header>
  );
}

function DetailScreen({
  match: m,
  setSub,
  onChanged,
}: {
  match: Match;
  setSub: (s: SubView) => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const avgs = computeAverages(m);
  const anyRated = avgs.some((a) => a.avg !== null);
  const rated = Object.keys(m.ratings || {}).length;
  const total = m.players.length;

  async function deleteMatch() {
    if (!confirm('Bu maçı ve tüm puanlarını silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    await fetch(`/api/matches/${m.id}`, { method: 'DELETE' });
    router.push('/');
  }

  async function copyLink() {
    const url = `${window.location.origin}/match/${m.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      prompt('Linki kopyalayın:', url);
    }
  }

  return (
    <>
      <div className="card">
        <h2>{m.name}</h2>
        <div className="note">
          {fmtDate(m.date)} · {m.players.length} oyuncu · {rated}/{total} kişi puanladı
        </div>
        <div className="footer-actions">
          <button className="btn secondary block" onClick={copyLink}>
            {copied ? 'Kopyalandı ✓' : '🔗 Bu maçın linkini kopyala'}
          </button>
        </div>
      </div>

      {anyRated && (
        <div className="mom-banner">
          <div className="label">MAÇIN OYUNCUSU</div>
          <div className="name">🏆 {avgs[0].name}</div>
          <div className="score">
            Ortalama {avgs[0].avg!.toFixed(2)} / 10 · {avgs[0].voteCount} oy
          </div>
        </div>
      )}

      {anyRated && (
        <div className="card">
          <h2>Sonuçlar</h2>
          {avgs.map((a, i) => (
            <div className="results-row" key={a.id}>
              <span className="name">
                {i === 0 && a.avg !== null ? <span className="star">★</span> : null}
                {a.name}
              </span>
              <span className="avg">{a.avg !== null ? a.avg.toFixed(2) : '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2>Puanlama yap</h2>
        <div className="note">Kim puan verecek? Her oyuncu sadece kendi puanlamasını girer.</div>
        <div className="rater-grid">
          {m.players.map((p) => {
            const hasRated = !!(m.ratings && m.ratings[p.id]);
            return (
              <button
                key={p.id}
                className={`rater-btn ${hasRated ? 'rated' : ''}`}
                onClick={() => setSub({ screen: 'rate', raterId: p.id })}
              >
                {p.name} {hasRated && <span className="check">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="footer-actions">
        <button className="btn danger" onClick={deleteMatch} disabled={deleting}>
          {deleting ? 'Siliniyor…' : 'Maçı sil'}
        </button>
      </div>
    </>
  );
}

function RateScreen({
  match: m,
  raterId,
  setSub,
  onSaved,
}: {
  match: Match;
  raterId: string;
  setSub: (s: SubView) => void;
  onSaved: () => void;
}) {
  const rater = m.players.find((p) => p.id === raterId);
  const others = m.players.filter((p) => p.id !== raterId);
  const existing = (m.ratings && m.ratings[raterId]) || {};
  const alreadyRated = !!(m.ratings && m.ratings[raterId]);

  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(others.map((p) => [p.id, existing[p.id] ? String(existing[p.id]) : '']))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (alreadyRated) {
    return (
      <>
        <button className="back-btn" onClick={() => setSub({ screen: 'detail' })}>
          ← Maça dön
        </button>
        <div className="card">
          <h2>{rater?.name} zaten puan verdi</h2>
          <div className="note">Puanlar bir kez girildikten sonra değiştirilemez.</div>
          {others.map((p) => (
            <div className="score-row" key={p.id}>
              <span className="name">{p.name}</span>
              <span className="avg">{existing[p.id]}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  async function save() {
    setError('');
    const numericScores: Record<string, number> = {};
    for (const p of others) {
      const val = scores[p.id]?.trim();
      const num = Number(val);
      if (!val || isNaN(num) || num < 1 || num > 10 || !Number.isInteger(num)) {
        setError('Lütfen tüm oyunculara 1-10 arası tam sayı puan verin.');
        return;
      }
      numericScores[p.id] = num;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/matches/${m.id}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raterId, scores: numericScores }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kaydedilemedi.');
        setSaving(false);
        return;
      }
      await onSaved();
      setSub({ screen: 'detail' });
    } catch (e) {
      setError('Bağlantı hatası. Tekrar deneyin.');
      setSaving(false);
    }
  }

  return (
    <>
      <button className="back-btn" onClick={() => setSub({ screen: 'detail' })}>
        ← Maça dön
      </button>
      <div className="card">
        <h2>{rater?.name} puanlıyor</h2>
        <div className="note">Diğer oyunculara 1 ile 10 arası puan verin.</div>
        {others.map((p) => (
          <div className="score-row" key={p.id}>
            <span className="name">{p.name}</span>
            <input
              type="number"
              min={1}
              max={10}
              step={1}
              className="score-input"
              placeholder="1-10"
              value={scores[p.id] || ''}
              onChange={(e) => setScores({ ...scores, [p.id]: e.target.value })}
            />
          </div>
        ))}
        {error && <div className="error">{error}</div>}
        <div className="footer-actions">
          <button className="btn block" onClick={save} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Puanlarımı kaydet'}
          </button>
        </div>
      </div>
    </>
  );
}
