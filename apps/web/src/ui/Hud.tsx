import { useEffect, useMemo, useRef, useState } from 'react';
import { cardLabel, legalCommands, MAX_PLAYERS, MIN_PLAYERS, type Card, type Command } from '@shield/engine';
import { seatLayouts } from '../game/layout';
import { LOCAL_ID, useGame } from '../game/store';
import { cardUrl } from '../three/textures';
import { setLang, t } from './i18n';
import { RulesList, RulesModal, SettingsModal } from './Modals';
import { useLang } from './prefs';
import { IconAttack, IconCharge, IconLeave, IconLifeSwap, IconLog, IconNewShield, IconPlayers, IconRules, IconSettings, IconSwapShield, IconWait, IconWinner } from './icons';

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

export function Lobby() {
  useLang();
  const start = useGame((s) => s.start);
  const [count, setCount] = useState(6);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('shield.name') ?? '';
    } catch {
      return '';
    }
  });
  const [rules, setRules] = useState(false);
  const go = () => {
    try {
      localStorage.setItem('shield.name', name);
    } catch {
      // Name not remembered; nothing else depends on it.
    }
    start(count, name);
  };
  return (
    <div className="lobby">
      <LangSwitch />
      <div className="lobby-card">
        <div className="lobby-fan" aria-hidden>
          {FAN.map((c, i) => {
            const a = (i - 1.5) * 13;
            const ah = (i - 1.5) * 19;
            return (
              <img
                key={c.id}
                src={cardUrl(c)}
                alt=""
                style={
                  {
                    transform: `translateX(-50%) rotate(${a}deg)`,
                    '--fan-hover': `translateX(-50%) rotate(${ah}deg) translateY(-6px)`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
        <div className="logo">SHIELD</div>
        <p className="tagline">{t('app.tagline')}</p>
        <label className="field">
          <span>{t('lobby.name')}</span>
          <input value={name} maxLength={16} placeholder={t('lobby.namePlaceholder')} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
        </label>
        <div className="field">
          <span>{t('lobby.players')}</span>
          <div className="count-row" role="radiogroup" aria-label={t('lobby.players')}>
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map((n) => (
              <button key={n} role="radio" aria-checked={n === count} className={`count ${n === count ? 'on' : ''}`} onClick={() => setCount(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="seat-dots" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <i key={i} className={i === 0 ? 'you' : 'bot'} />
            ))}
          </div>
          <div className="field-note">
            <IconPlayers />
            {t('lobby.seats', { n: count, bots: count - 1 })}
          </div>
        </div>
        <button className="primary big" onClick={go} autoFocus>
          {t('lobby.start')}
        </button>
        <button className="ghost" onClick={() => setRules(true)}>
          <IconRules />
          {t('lobby.rules')}
        </button>
      </div>
      {rules && <RulesModal onClose={() => setRules(false)} />}
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
  const game = useGame((s) => s.game);
  const shown = useGame((s) => s.shown);
  const busy = useGame((s) => s.busy);
  const queued = useGame((s) => s.queue.length);
  const targeting = useGame((s) => s.targeting);
  const send = useGame((s) => s.send);
  const setTargeting = useGame((s) => s.setTargeting);
  const pickTarget = useGame((s) => s.pickTarget);
  const numbers = useTargetNumbers();

  const legal = useMemo(() => (game ? legalCommands(game, LOCAL_ID) : []), [game]);
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

  if (!game || !shown || shown.phase === 'over') return null;
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
    <button className={`act ${cls}`} onClick={onClick} title={`${name} : ${sub}`}>
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
          <button className="primary" onClick={() => start(shown.players.length, me.name)} autoFocus>
            {t('over.again')}
          </button>
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
