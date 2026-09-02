'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

type Tab = 'list' | 'new';

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('list');

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

  return (
    <>
      <Header />
      <div className="container">
        {!loaded ? (
          <div className="loading">Yükleniyor…</div>
        ) : tab === 'list' ? (
          <ListScreen matches={matches} setTab={setTab} />
        ) : (
          <NewMatchScreen setTab={setTab} onCreated={loadMatches} />
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

function Tabs({ active, setTab }: { active: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="tabs">
      <button className={`tab-btn ${active === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
        Maçlar
      </button>
      <button className={`tab-btn ${active === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
        Yeni Maç
      </button>
    </div>
  );
}

function ListScreen({ matches, setTab }: { matches: Match[]; setTab: (t: Tab) => void }) {
  const router = useRouter();
  const sorted = [...matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return (
    <>
      <Tabs active="list" setTab={setTab} />
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
            <div key={m.id} className="match-item" onClick={() => router.push(`/match/${m.id}`)}>
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

function NewMatchScreen({ setTab, onCreated }: { setTab: (t: Tab) => void; onCreated: () => void }) {
  const router = useRouter();
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
      router.push(`/match/${data.id}`);
    } catch (e) {
      setFormError('Bağlantı hatası. Tekrar deneyin.');
      setSaving(false);
    }
  }

  return (
    <>
      <Tabs active="new" setTab={setTab} />
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
