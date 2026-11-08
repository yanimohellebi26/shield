import { useEffect, useMemo, useRef, useState } from 'react';
import { cardLabel, MAX_PLAYERS, MIN_PLAYERS, type Card, type Command } from '@shield/engine';
import { online } from '../net/online';
import { seatLayouts } from '../game/layout';
import { LOCAL_ID, useGame } from '../game/store';
import { cardUrl } from '../three/textures';
import { play, setSoundEnabled, useSoundPrefs } from '../audio/sound';
import { setLang, t } from './i18n';
import { RulesList, RulesModal, SettingsModal } from './Modals';
import { useLang } from './prefs';
import { IconAttack, IconCharge, IconLeave, IconLifeSwap, IconLog, IconMuted, IconSound, IconNewShield, IconPlayers, IconRules, IconSettings, IconSwapShield, IconWait, IconWinner } from './icons';

const FAN: Card[] = [
  { id: 'f1', suit: 'S', rank: 1 },
  { id: 'f2', suit: 'H', rank: 12 },
  { id: 'f3', suit: 'D', rank: 13 },
  { id: 'f4', suit: 'C', rank: 11 },
];

function LangSwitch() {
  const lang = useLang();
  return (
    <div className="segmented lang-switch">
      {(['fr', 'en'] as const).map((l) => (
        <button key={l} className={lang === l ? 'on' : ''} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function useRememberedName(): [string, (n: string) => void] {
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('shield.name') ?? '';
    } catch {
      return '';
    }
  });
  const save = (n: string) => {
    setName(n);
    try {
      localStorage.setItem('shield.name', n);
    } catch {
      // Name not remembered; nothing else depends on it.
    }
  };
  return [name, save];
}

function SeatPicker({ count, onChange, disabledBelow = MIN_PLAYERS }: { count: number; onChange: (n: number) => void; disabledBelow?: number }) {
  return (
    <div className="count-row" role="radiogroup" aria-label={t('lobby.players')}>
      {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
        <button key={n} role="radio" aria-checked={n === count} disabled={n < disabledBelow} className={`count ${n === count ? 'on' : ''}`} onClick={() => onChange(n)}>
          {n}
        </button>
      ))}
    </div>
  );
}

function Fan() {
  return (
    <div className="lobby-fan" aria-hidden>
      {FAN.map((c, i) => (
        <img
          key={c.id}
          src={cardUrl(c)}
          alt=""
          style={
            {
              transform: `translateX(-50%) rotate(${(i - 1.5) * 13}deg)`,
              '--fan-hover': `translateX(-50%) rotate(${(i - 1.5) * 19}deg) translateY(-6px)`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function Lobby() {
  useLang();
  const start = useGame((s) => s.start);
  const netStatus = useGame((s) => s.netStatus);
  const netError = useGame((s) => s.netError);
  const [mode, setMode] = useState<'local' | 'online'>('local');
  const [count, setCount] = useState(6);
  const [name, setName] = useRememberedName();
  const [code, setCode] = useState('');
  const [rules, setRules] = useState(false);
  const busy = netStatus === 'connecting';

  const createOnline = () => void online.create(name, count).catch(() => undefined);
  const joinOnline = () => code.trim().length === 5 && void online.join(code, name).catch(() => undefined);

  return (
    <div className="lobby">
      <LangSwitch />
      <div className="lobby-card">
        <Fan />
        <div className="logo">SHIELD</div>
        <p className="tagline">{t('app.tagline')}</p>
        <div className="segmented tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'local'} className={mode === 'local' ? 'on' : ''} onClick={() => setMode('local')}>
            {t('lobby.tabLocal')}
          </button>
          <button role="tab" aria-selected={mode === 'online'} className={mode === 'online' ? 'on' : ''} onClick={() => setMode('online')}>
            {t('lobby.tabOnline')}
          </button>
        </div>
        <label className="field">
          <span>{t('lobby.name')}</span>
          <input value={name} maxLength={16} placeholder={t('lobby.namePlaceholder')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && mode === 'local' && start(count, name)} />
        </label>
        <div className="field">
          <span>{t('lobby.players')}</span>
          <SeatPicker count={count} onChange={setCount} />
          <div className="field-note">
            <IconPlayers />
            {mode === 'local' ? t('lobby.seats', { n: count, bots: count - 1 }) : t('lobby.seatsOnline', { n: count })}
          </div>
        </div>
        {mode === 'local' ? (
          <button className="primary big" onClick={() => start(count, name)} autoFocus>
            {t('lobby.start')}
          </button>
        ) : (
          <>
            <button className="primary big" onClick={createOnline} disabled={busy}>
              {busy ? t('net.connecting') : t('lobby.create')}
            </button>
            <div className="join-row">
              <input
                className="code-input"
                value={code}
                maxLength={5}
                placeholder={t('lobby.codePlaceholder')}
                aria-label={t('lobby.code')}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && joinOnline()}
              />
              <button className="ghost" onClick={joinOnline} disabled={busy || code.length !== 5}>
                {t('lobby.join')}
              </button>
            </div>
            {netStatus === 'error' && <div className="net-error">{t('net.error', { detail: netError ?? '' })}</div>}
          </>
        )}
        <button className="ghost" onClick={() => setRules(true)}>
          <IconRules />
          {t('lobby.rules')}
        </button>
      </div>
      {rules && <RulesModal onClose={() => setRules(false)} />}
    </div>
  );
}

/** Waiting room of an online table: the code to share, who is here, the host starts. */
export function WaitingRoom() {
  useLang();
  const table = useGame((s) => s.table);
  const back = useGame((s) => s.backToLobby);
  const [copied, setCopied] = useState(false);
  if (!table) return null;
  const humans = table.players.length;
  const copy = () => {
    void navigator.clipboard?.writeText(table.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="lobby">
      <div className="lobby-card room-card">
        <div className="room-title">{t('room.title')}</div>
        <div className="room-code-label">{t('room.share')}</div>
        <button className="room-code" onClick={copy} title={t('room.copy')}>
          {table.code}
          <small>{copied ? t('room.copied') : t('room.copy')}</small>
        </button>
        <ul className="room-players">
          {table.players.map((p, i) => (
            <li key={i} className={`${p.you ? 'you' : ''} ${p.connected ? '' : 'away'}`}>
              {p.host ? <IconWinner /> : <IconPlayers />}
              <span>{p.name}</span>
              {p.you && <small>{t('room.you')}</small>}
              {!p.connected && <small>{t('room.away')}</small>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, table.seats - humans) }, (_, i) => (
            <li key={`bot${i}`} className="bot">
              <IconWait />
              <span>{t('room.botSeat')}</span>
            </li>
          ))}
        </ul>
        {table.isHost ? (
          <>
            <div className="field">
              <span>{t('lobby.players')}</span>
              <SeatPicker count={table.seats} onChange={(n) => online.setSeats(n)} disabledBelow={Math.max(MIN_PLAYERS, humans)} />
            </div>
            <button className="primary big" onClick={() => online.start()}>
              {t('room.start')}
            </button>
          </>
        ) : (
          <div className="field-note">
            <IconWait />
            {t('room.waitHost')}
          </div>
        )}
        <button className="ghost" onClick={back}>
          <IconLeave />
          {t('room.leave')}
        </button>
      </div>
    </div>
  );
}

/** Opponents in clockwise order from the local seat, numbered 1…7 for keyboard targeting. */
export function useTargetNumbers(): Map<string, number> {
  const shown = useGame((s) => s.shown);
  return useMemo(() => {
    const m = new Map<string, number>();
    if (!shown) return m;
    const localIndex = Math.max(0, shown.players.findIndex((p) => p.id === LOCAL_ID));
    const layouts = seatLayouts(shown.players.length, localIndex);
    shown.players.forEach((p, i) => {
      if (p.id !== LOCAL_ID) m.set(p.id, layouts[i]!.rel);
    });
    return m;
  }, [shown]);
}

function ActionBar() {
  useLang();
  const shown = useGame((s) => s.shown);
  const busy = useGame((s) => s.busy);
  const queued = useGame((s) => s.queue.length);
  const targeting = useGame((s) => s.targeting);
  const send = useGame((s) => s.send);
  const setTargeting = useGame((s) => s.setTargeting);
  const pickTarget = useGame((s) => s.pickTarget);
  const numbers = useTargetNumbers();

  const legal = useGame((s) => s.legal);
  const myTurn = !!shown && shown.current === LOCAL_ID && !busy && queued === 0 && legal.length > 0 && shown.phase === 'action';
  const has = (pred: (c: Command) => boolean) => legal.some(pred);
  const act = (type: string) => has((c) => c.type === 'act' && c.action.type === type);

  // Keyboard: A attack, C charge, B new shield, E swap a shield, 1–7 pick a target, Esc cancel.
  useEffect(() => {
    if (!myTurn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') return setTargeting(null);
      if (targeting && /^[1-7]$/.test(k)) {
        const id = [...numbers.entries()].find(([, n]) => n === Number(k))?.[0];
        const p = shown?.players.find((x) => x.id === id);
        if (id && p && !p.eliminated) pickTarget(id);
        return;
      }
      if (k === 'a' && act('attack')) setTargeting('attack');
      else if (k === 'c' && act('charge')) send({ type: 'act', action: { type: 'charge' } });
      else if (k === 'b' && act('shieldSelf')) send({ type: 'act', action: { type: 'shieldSelf' } });
      else if (k === 'e' && act('shieldOther')) setTargeting('shieldOther');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!shown || shown.phase === 'over') return null;
  const me = shown.players.find((p) => p.id === LOCAL_ID)!;
  if (me.eliminated) return <div className="action-bar waiting">{t('hint.out')}</div>;
  if (!myTurn) {
    if (shown.phase === 'lifeOffer' && shown.current === LOCAL_ID) return null;
    const who = shown.players.find((p) => p.id === shown.current)?.name ?? '';
    return (
      <div className="action-bar waiting">
        <IconWait />
        {busy ? '…' : t('hint.waiting', { name: who })}
      </div>
    );
  }

  if (targeting) {
    return (
      <div className={`action-bar targeting ${targeting}`}>
        <div className="hint strong">{targeting === 'attack' ? t('hint.pickAttack') : t('hint.pickShield')}</div>
        <button className="ghost" onClick={() => setTargeting(null)}>
          {t('hint.cancel')} <kbd>Esc</kbd>
        </button>
      </div>
    );
  }

  const button = (cls: string, icon: React.ReactNode, name: string, sub: string, key: string, onClick: () => void) => (
    <button
      className={`act ${cls}`}
      onClick={() => {
        play('tap', { volume: 0.6 });
        onClick();
      }}
      title={`${name} : ${sub}`}
    >
      <span className="act-icon">{icon}</span>
      <span className="act-name">{name}</span>
      <span className="act-sub">{sub}</span>
      {key && <kbd>{key}</kbd>}
    </button>
  );

  return (
    <div className="action-bar">
      <div className="hint">{t('hint.yourTurn')}</div>
      <div className="actions">
        {act('attack') &&
          button('attack', <IconAttack />, t('act.attack'), me.chargeCount ? t('act.attack.subCharged', { n: me.chargeCount }) : t('act.attack.sub'), 'A', () => setTargeting('attack'))}
        {act('charge') && button('charge', <IconCharge />, t('act.charge'), t('act.charge.sub'), 'C', () => send({ type: 'act', action: { type: 'charge' } }))}
        {act('shieldSelf') && button('shield', <IconNewShield />, t('act.shield'), t('act.shield.sub'), 'B', () => send({ type: 'act', action: { type: 'shieldSelf' } }))}
        {act('shieldOther') && button('other', <IconSwapShield />, t('act.other'), t('act.other.sub'), 'E', () => setTargeting('shieldOther'))}
        {act('pass') && button('', null, t('act.pass'), t('act.pass.sub'), '', () => send({ type: 'act', action: { type: 'pass' } }))}
      </div>
      {has((c) => c.type === 'lifeSwap') && (
        <button className="life-swap" onClick={() => send({ type: 'lifeSwap' })}>
          <IconLifeSwap />
          <span>{t('act.lifeSwap')}</span>
          <small>{me.hp === 1 ? t('act.lifeSwap.see') : t('act.lifeSwap.blind')}</small>
        </button>
      )}
    </div>
  );
}

function LifeOffer() {
  useLang();
  const shown = useGame((s) => s.shown);
  const busy = useGame((s) => s.busy);
  const send = useGame((s) => s.send);
  if (!shown || busy || shown.phase !== 'lifeOffer' || !shown.lifeOffer) return null;
  const c = shown.lifeOffer;
  return (
    <div className="offer-panel" role="dialog" aria-label={t('offer.title', { card: cardLabel(c) })}>
      <div className="offer-title">{t('offer.title', { card: cardLabel(c) })}</div>
      <div className="offer-sub">{t('offer.sub', { n: c.rank })}</div>
      <div className="offer-buttons">
        <button className="primary" onClick={() => send({ type: 'acceptLife' })} autoFocus>
          {t('offer.accept', { n: c.rank })}
        </button>
        <button className="ghost" onClick={() => send({ type: 'declineLife' })}>
          {t('offer.decline')}
        </button>
      </div>
    </div>
  );
}

function Log({ open }: { open: boolean }) {
  const log = useGame((s) => s.log);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [log, open]);
  return (
    <div className={`log ${open ? 'open' : 'collapsed'}`} ref={ref} aria-live="polite">
      {log.map((l) => (
        <div key={l.id} className={`log-line ${l.tone}`}>
          {l.text}
        </div>
      ))}
    </div>
  );
}

function GameOver() {
  useLang();
  const mode = useGame((s) => s.mode);
  const table = useGame((s) => s.table);
  const shown = useGame((s) => s.shown);
  const busy = useGame((s) => s.busy);
  const stats = useGame((s) => s.stats);
  const start = useGame((s) => s.start);
  const back = useGame((s) => s.backToLobby);
  if (!shown || busy || shown.phase !== 'over') return null;
  const winner = shown.players.find((p) => p.id === shown.winner);
  const me = shown.players.find((p) => p.id === LOCAL_ID)!;
  const won = shown.winner === LOCAL_ID;
  // Winner first, then the reverse order of elimination.
  const order = [...(shown.winner ? [shown.winner] : []), ...[...stats.outOrder].reverse()];
  const byId = new Map(shown.players.map((p) => [p.id, p]));
  const biggestBy = stats.biggest ? byId.get(stats.biggest.by)?.name : null;
  return (
    <div className="gameover">
      <div className={`gameover-card ${won ? 'won' : ''}`}>
        <IconWinner className="gameover-crown" />
        <div className="gameover-title">{won ? t('over.victory') : t('over.wins', { name: winner?.name ?? '' })}</div>
        <div className="gameover-sub">{t('over.after', { n: shown.turn })}</div>
        <ol className="ranking" aria-label={t('over.ranking')}>
          {order.map((id, i) => {
            const p = byId.get(id);
            if (!p) return null;
            return (
              <li key={id} className={id === LOCAL_ID ? 'you' : ''}>
                <span className="place">{i + 1}</span>
                <span>{p.name}</span>
                <span className="stat">
                  {t('over.dealt', { n: stats.dealt[id] ?? 0 })} · {t('over.kills', { n: stats.kills[id] ?? 0 })}
                </span>
              </li>
            );
          })}
        </ol>
        {stats.biggest && stats.biggest.n > 0 && <div className="over-note">{t('over.biggest', { n: stats.biggest.n, name: biggestBy ?? '' })}</div>}
        <div className="offer-buttons">
          {mode === 'local' ? (
            <button className="primary" onClick={() => start(shown.players.length, me.name)} autoFocus>
              {t('over.again')}
            </button>
          ) : table?.isHost ? (
            <button className="primary" onClick={() => online.rematch()} autoFocus>
              {t('over.again')}
            </button>
          ) : (
            <span className="field-note">
              <IconWait />
              {t('room.waitHost')}
            </span>
          )}
          <button className="ghost" onClick={back}>
            {t('over.change')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Your turn" banner each time play comes back to the local player. */
function TurnBanner() {
  useLang();
  const n = useGame((s) => s.yourTurn);
  useEffect(() => {
    if (n > 0) play('knock', { volume: 0.8 });
  }, [n]);
  if (n === 0) return null;
  return (
    <div key={n} className="turn-banner" aria-live="assertive">
      <span>{t('banner.yourTurn')}</span>
    </div>
  );
}

export function Hud() {
  useLang();
  const shown = useGame((s) => s.shown);
  const back = useGame((s) => s.backToLobby);
  const [modal, setModal] = useState<null | 'rules' | 'settings'>(null);
  const [logOpen, setLogOpen] = useState(() => window.innerWidth > 760);
  const sound = useSoundPrefs();
  const netStatus = useGame((s) => s.netStatus);
  if (!shown) return null;
  const current = shown.players.find((p) => p.id === shown.current);
  const mine = shown.current === LOCAL_ID && shown.phase !== 'over';
  return (
    <>
      <div className="topbar">
        <div className="logo small">SHIELD</div>
        <div className="turn">{t('top.turn', { n: shown.turn })}</div>
        {current && shown.phase !== 'over' && (
          <div className={`now-playing ${mine ? 'you' : ''}`}>{mine ? t('top.playing.you') : t('top.playing', { name: current.name })}</div>
        )}
        <div className="spacer" />
        <div className="tools">
          <button className="icon-btn" onClick={() => setSoundEnabled(!sound.enabled)} title={t('top.sound')} aria-label={t('top.sound')} aria-pressed={sound.enabled}>
            {sound.enabled ? <IconSound /> : <IconMuted />}
          </button>
          <button className={`icon-btn ${logOpen ? 'on' : ''}`} onClick={() => setLogOpen((o) => !o)} title={t('top.log')} aria-label={t('top.log')} aria-pressed={logOpen}>
            <IconLog />
          </button>
          <button className="icon-btn" onClick={() => setModal('rules')} title={t('top.rules')} aria-label={t('top.rules')}>
            <IconRules />
          </button>
          <button className="icon-btn" onClick={() => setModal('settings')} title={t('top.settings')} aria-label={t('top.settings')}>
            <IconSettings />
          </button>
          <button className="icon-btn" onClick={back} title={t('top.leave')} aria-label={t('top.leave')}>
            <IconLeave />
          </button>
        </div>
      </div>
      <TurnBanner />
      {netStatus === 'reconnecting' && <div className="net-banner">{t('net.reconnecting')}</div>}
      <Log open={logOpen} />
      <ActionBar />
      <LifeOffer />
      <GameOver />
      {modal === 'rules' && <RulesModal onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
    </>
  );
}

export { RulesList };
