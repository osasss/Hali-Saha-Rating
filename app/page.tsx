'use client';

import { useEffect, useState } from 'react';

type Player = { id: string; name: string };
type Match = {
  id: string;
  name: string;
  date: string;
  players: Player[];
  ratings: Record<string, Record<string, number>>;
  createdAt: number;
};

type View =
  | { screen: 'list' }
  | { screen: 'new' }
  | { screen: 'detail'; matchId: string }
  | { screen: 'rate'; matchId: string; raterId: string };

function fmtDate(d: string) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function computeAverages(m: Match) {
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

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>({ screen: 'list' });

  async function loadMatches() {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      setMatches(Array.isArray(data) ? data : []);
    } catch (e) {
      setMatches([]);
    }
    setLoaded(true);
  }

  useEffect(() => {
    loadMatches();
  }, []);

  if (!loaded) {
    return (
      <>
        <Header />
        <div className="container">
          <div className="loading">Yükleniyor…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container">
        {view.screen === 'list' && <ListScreen matches={matches} setView={setView} />}
        {view.screen === 'new' && (
          <NewMatchScreen setView={setView} onCreated={loadMatches} />
        )}
        {view.screen === 'detail' && (
          <DetailScreen
            matchId={view.matchId}
            matches={matches}
            setView={setView}
            onChanged={loadMatches}
          />
        )}
        {view.screen === 'rate' && (
          <RateScreen
            matchId={view.matchId}
            raterId={view.raterId}
            matches={matches}
            setView={setView}
            onSaved={loadMatches}
          />
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

function Tabs({ active, setView }: { active: 'list' | 'new'; setView: (v: View) => void }) {
  return (
    <div className="tabs">
      <button
        className={`tab-btn ${active === 'list' ? 'active' : ''}`}
        onClick={() => setView({ screen: 'list' })}
      >
        Maçlar
      </button>
      <button
        className={`tab-btn ${active === 'new' ? 'active' : ''}`}
        onClick={() => setView({ screen: 'new' })}
      >
        Yeni Maç
      </button>
    </div>
  );
}

function ListScreen({ matches, setView }: { matches: Match[]; setView: (v: View) => void }) {
  const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <>
      <Tabs active="list" setView={setView} />
      {sorted.length === 0 ? (
        <div className="empty">
          Henüz maç eklenmedi.
          <br />
          &quot;Yeni Maç&quot; sekmesinden başlayın.
        </div>
      ) : (
        sorted.map((m) => {
          const rated = Object.keys(m.ratings || {}).length;
          const total = m.players.length;
          const done = rated >= total && total > 0;
          const avgs = rated > 0 ? computeAverages(m).filter((a) => a.avg !== null) : [];
          return (
            <div key={m.id} className="match-item" onClick={() => setView({ screen: 'detail', matchId: m.id })}>
              <div className="row">
                <h3>{m.name}</h3>
                <span className={`badge ${done ? 'done' : 'pending'}`}>
                  {done ? 'Tamamlandı' : `${rated}/${total} puanladı`}
                </span>
              </div>
              <div className="meta">
                {fmtDate(m.date)} · {m.players.length} oyuncu
              </div>
              {avgs.length > 0 && (
                <div className="meta">
                  ⭐ {avgs[0].name} önde ({avgs[0].avg!.toFixed(1)})
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

function NewMatchScreen({
  setView,
  onCreated,
}: {
  setView: (v: View) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [playerInput, setPlayerInput] = useState('');
  const [players, setPlayers] = useState<string[]>([]);
  const [playerError, setPlayerError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  function addPlayer() {
    const trimmed = playerInput.trim();
    setPlayerError('');
    if (!trimmed) return;
    if (players.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      setPlayerError('Bu isim zaten eklendi.');
      return;
    }
    setPlayers([...players, trimmed]);
    setPlayerInput('');
  }

  function removePlayer(p: string) {
    setPlayers(players.filter((x) => x !== p));
  }

  async function createMatch() {
    setFormError('');
    if (players.length < 2) {
      setFormError('En az 2 oyuncu eklemelisiniz.');
      return;
    }
    if (!date) {
      setFormError('Lütfen tarih seçin.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, date, players }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Maç oluşturulamadı.');
        setSaving(false);
        return;
      }
      await onCreated();
      setView({ screen: 'detail', matchId: data.id });
    } catch (e) {
      setFormError('Bağlantı hatası. Tekrar deneyin.');
      setSaving(false);
    }
  }

  return (
    <>
      <Tabs active="new" setView={setView} />
      <div className="card">
        <h2>Yeni maç oluştur</h2>
        <label htmlFor="match-name">Maç adı</label>
        <input
          id="match-name"
          type="text"
          placeholder="Örn. Cuma Halısaha"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="match-date">Tarih</label>
        <input id="match-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <label htmlFor="player-name">Oyuncular</label>
        <div className="player-add-row">
          <input
            id="player-name"
            type="text"
            placeholder="Oyuncu adı yazıp Enter'a basın"
            value={playerInput}
            onChange={(e) => setPlayerInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addPlayer();
              }
            }}
          />
          <button className="btn secondary" onClick={addPlayer}>
            Ekle
          </button>
        </div>
        {playerError && <div className="error">{playerError}</div>}
        <div className="chip-list">
          {players.map((p) => (
            <span className="chip" key={p}>
              {p}
              <button aria-label="Oyuncuyu kaldır" onClick={() => removePlayer(p)}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="note">
          {players.length} oyuncu eklendi {players.length > 0 && players.length < 2 ? '(en az 2 gerekli)' : ''}
        </div>
        {formError && <div className="error">{formError}</div>}
        <div className="footer-actions">
          <button className="btn block" onClick={createMatch} disabled={saving}>
            {saving ? 'Oluşturuluyor…' : 'Maçı oluştur'}
          </button>
        </div>
      </div>
    </>
  );
}

function DetailScreen({
  matchId,
  matches,
  setView,
  onChanged,
}: {
  matchId: string;
  matches: Match[];
  setView: (v: View) => void;
  onChanged: () => void;
}) {
  const m = matches.find((x) => x.id === matchId);
  const [deleting, setDeleting] = useState(false);

  if (!m) {
    return (
      <>
        <button className="back-btn" onClick={() => setView({ screen: 'list' })}>
          ← Maçlara dön
        </button>
        <div className="empty">Maç bulunamadı.</div>
      </>
    );
  }

  const avgs = computeAverages(m);
  const anyRated = avgs.some((a) => a.avg !== null);
  const rated = Object.keys(m.ratings || {}).length;
  const total = m.players.length;

  async function deleteMatch() {
    if (!confirm('Bu maçı ve tüm puanlarını silmek istediğinize emin misiniz?')) return;
    setDeleting(true);
    await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
    await onChanged();
    setView({ screen: 'list' });
  }

  return (
    <>
      <button className="back-btn" onClick={() => setView({ screen: 'list' })}>
        ← Maçlara dön
      </button>
      <div className="card">
        <h2>{m.name}</h2>
        <div className="note">
          {fmtDate(m.date)} · {m.players.length} oyuncu · {rated}/{total} kişi puanladı
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
                onClick={() => setView({ screen: 'rate', matchId: m.id, raterId: p.id })}
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
  matchId,
  raterId,
  matches,
  setView,
  onSaved,
}: {
  matchId: string;
  raterId: string;
  matches: Match[];
  setView: (v: View) => void;
  onSaved: () => void;
}) {
  const m = matches.find((x) => x.id === matchId);
  const rater = m?.players.find((p) => p.id === raterId);
  const others = m ? m.players.filter((p) => p.id !== raterId) : [];
  const existing = (m?.ratings && m.ratings[raterId]) || {};
  const alreadyRated = !!(m?.ratings && m.ratings[raterId]);

  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(others.map((p) => [p.id, existing[p.id] ? String(existing[p.id]) : '']))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!m) {
    return (
      <>
        <button className="back-btn" onClick={() => setView({ screen: 'list' })}>
          ← Maçlara dön
        </button>
        <div className="empty">Maç bulunamadı.</div>
      </>
    );
  }

  if (alreadyRated) {
    return (
      <>
        <button className="back-btn" onClick={() => setView({ screen: 'detail', matchId })}>
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
      const res = await fetch(`/api/matches/${matchId}/ratings`, {
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
      setView({ screen: 'detail', matchId });
    } catch (e) {
      setError('Bağlantı hatası. Tekrar deneyin.');
      setSaving(false);
    }
  }

  return (
    <>
      <button className="back-btn" onClick={() => setView({ screen: 'detail', matchId })}>
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
