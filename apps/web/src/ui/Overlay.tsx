import { isHidden, type PlayerView } from '@shield/engine';
import { CARD_H, slotPos, deckPos, discardPos, seatLayouts, type SeatLayout, type Vec3 } from '../game/layout';
import { LOCAL_ID, useGame, type Popup } from '../game/store';
import { useAnchor } from '../three/anchors';
import { cardUrl } from '../three/textures';
import { t } from './i18n';
import { useLang } from './prefs';
import { useTargetNumbers } from './Hud';
import { IconCharge, IconHeart, IconLifeSwap, IconOut, IconShieldValue } from './icons';

function Anchored({ pos, className, children, onClick, title }: { pos: Vec3; className?: string; children: React.ReactNode; onClick?: () => void; title?: string }) {
  const ref = useAnchor(pos);
  return (
    <div ref={ref} className={`anchored ${className ?? ''}`} onClick={onClick} title={title}>
      {children}
    </div>
  );
}

function SeatBadge({ player, seat }: { player: PlayerView; seat: SeatLayout }) {
  const ov = useGame((s) => s.ov);
  const focus = useGame((s) => s.focus);
  const targeting = useGame((s) => s.targeting);
  const pickTarget = useGame((s) => s.pickTarget);

  const isLocal = player.id === LOCAL_ID;
  const dealing = useGame((s) => s.dealing);
  const bonus = useGame((s) => s.hpBonus[player.id] ?? 0);
  const hp = dealing ? player.life.reduce((t, c) => t + c.rank, 0) + (player.life.length === 2 ? bonus : 0) : (ov.hp[player.id] ?? player.hp);
  const out = !dealing && (player.eliminated || hp <= 0);
  const active = focus === player.id && !out;
  const targetable = !!targeting && !isLocal && !out;
  const shield = ov.shieldCard[player.id] ?? player.shield;
  const shieldValue = shield && !isHidden(shield) ? shield.rank : '?';
  const pos: Vec3 = [seat.pos[0], 0, seat.pos[2] + (CARD_H / 2) * seat.scale + 0.36];
  const number = useTargetNumbers().get(player.id);

  return (
    <Anchored
      pos={pos}
      className={['seat-badge', isLocal ? 'local' : '', active ? 'active' : '', out ? 'out' : '', targetable ? `target ${targeting}` : ''].join(' ')}
      onClick={() => targetable && pickTarget(player.id)}
    >
      <span className={`hp-seal ${hp < 5 && !out && !dealing ? 'low' : ''}`} title="HP">
        {out ? <IconOut /> : dealing && hp === 0 ? '–' : hp}
      </span>
      <span className="plate-body">
        <span className="seat-name">
          {targetable && number !== undefined && <span className="target-key">{number}</span>}
          {player.name}
        </span>
        <span className="seat-meta">
          <span className="chip shield" title={t('chip.shield')}>
            <IconShieldValue />
            {shieldValue}
          </span>
          <span className="chip charge" title={t('chip.charge')}>
            <IconCharge />
            {player.chargeCount}
          </span>
          <span className={`chip life ${player.lifeSwapUsed ? 'used' : ''}`} title={player.lifeSwapUsed ? t('chip.lifeUsed') : t('chip.lifeFree')}>
            <IconLifeSwap />
          </span>
        </span>
      </span>
      {targetable && (
        <span className={`target-preview ${targeting}`}>
          {targeting === 'attack' ? t('preview.attack', { shield: shieldValue }) : t('preview.shield', { shield: shieldValue })}
        </span>
      )}
    </Anchored>
  );
}

/** Phone opponent tile (Figma "Opponent Tile"): mini life cards, name, HP, shield value, charge. */
function OpponentTile({ player, seat }: { player: PlayerView; seat: SeatLayout }) {
  const ov = useGame((s) => s.ov);
  const focus = useGame((s) => s.focus);
  const targeting = useGame((s) => s.targeting);
  const pickTarget = useGame((s) => s.pickTarget);
  const dealing = useGame((s) => s.dealing);
  const bonus = useGame((s) => s.hpBonus[player.id] ?? 0);
  const hp = dealing ? player.life.reduce((t, c) => t + c.rank, 0) + (player.life.length === 2 ? bonus : 0) : (ov.hp[player.id] ?? player.hp);
  const out = !dealing && (player.eliminated || hp <= 0);
  const active = focus === player.id && !out;
  const targetable = !!targeting && !out;
  const shield = ov.shieldCard[player.id] ?? player.shield;
  const shieldValue = shield && !isHidden(shield) ? shield.rank : '?';
  const life = ov.hideLife[player.id] ? [] : player.life;
  return (
    <Anchored
      pos={seat.pos}
      className={['tile', active ? 'active' : '', out ? 'out' : '', targetable ? `target ${targeting}` : ''].join(' ')}
      onClick={() => targetable && pickTarget(player.id)}
    >
      <span className="tile-cards">
        {life.map((c, i) => (
          <img key={c.id} src={cardUrl(c)} alt="" style={{ transform: `rotate(${i ? -5 : 6}deg)`, left: i * 10, top: i ? 0 : 4 }} />
        ))}
      </span>
      <span className="tile-info">
        <span className="tile-name">{player.name}</span>
        <span className="tile-hp">
          {out ? (
            <IconOut />
          ) : (
            <>
              <IconHeart className="heart" />
              {dealing && hp === 0 ? '–' : hp}
            </>
          )}
        </span>
        <span className="tile-chips">
          <span className="chip shield">
            <IconShieldValue />
            {shieldValue}
          </span>
          <span className="chip charge">
            <IconCharge />
            {player.chargeCount}
          </span>
        </span>
      </span>
    </Anchored>
  );
}

/** Blue tag pinned on a table seat's shield card, so a face-up shield never reads as a life card. */
function ShieldTag({ player, seat }: { player: PlayerView; seat: SeatLayout }) {
  const ov = useGame((s) => s.ov);
  const shield = ov.shieldCard[player.id] ?? player.shield;
  if (!shield || ov.hideShield[player.id] || player.eliminated) return null;
  const [x, , z] = slotPos(seat, 'shield');
  // Your own self-chosen shield: you see it, the others don't yet.
  const secret = player.shieldPrivate && !ov.shieldCard[player.id];
  return (
    <Anchored
      pos={[x, 0.1, z - 0.62 * seat.scale]}
      className={`shield-tag ${isHidden(shield) ? 'hidden' : ''} ${secret ? 'secret' : ''}`}
      title={secret ? t('seat.shieldSecretHint') : undefined}
    >
      <IconShieldValue />
      {isHidden(shield) ? t('seat.shield') : secret ? t('seat.shieldSecret', { n: shield.rank }) : `${t('seat.shield')} ${shield.rank}`}
    </Anchored>
  );
}

/** "×N" counter on a table seat's charge pile. */
function ChargeCount({ player, seat }: { player: PlayerView; seat: SeatLayout }) {
  const hidden = useGame((s) => s.ov.hideCharge[player.id]);
  if (hidden || player.chargeCount === 0 || player.eliminated) return null;
  const [x, , z] = slotPos(seat, 'charge', player.chargeCount);
  return (
    <Anchored pos={[x + 0.3 * seat.scale, 0.1, z - 0.22 * seat.scale]} className="charge-count">
      ×{player.chargeCount}
    </Anchored>
  );
}

function PopupView({ p }: { p: Popup }) {
  return (
    <Anchored pos={p.pos} className="popup-anchor">
      <div className={`popup ${p.kind}`}>
        <div className="popup-text">{p.text}</div>
        {p.sub && <div className="popup-sub">{p.sub}</div>}
      </div>
    </Anchored>
  );
}

/** Screen-space labels that follow the 3D table: seat badges, pile counts, popups. */
export function Overlay() {
  useLang();
  const shown = useGame((s) => s.shown);
  useGame((s) => s.portrait);
  const ov = useGame((s) => s.ov);
  const popups = useGame((s) => s.popups);
  if (!shown) return null;
  const localIndex = Math.max(0, shown.players.findIndex((p) => p.id === LOCAL_ID));
  const layouts = seatLayouts(shown.players.length, localIndex);
  const deckCount = Math.max(0, shown.deckCount + ov.deckDelta);
  const discardCount = ov.discardCount ?? shown.discard.length;
  return (
    <div className="overlay">
      {shown.players.map((p, i) =>
        layouts[i]!.tile ? (
          <OpponentTile key={p.id} player={p} seat={layouts[i]!} />
        ) : (
          <span key={p.id}>
            <SeatBadge player={p} seat={layouts[i]!} />
            <ShieldTag player={p} seat={layouts[i]!} />
            <ChargeCount player={p} seat={layouts[i]!} />
          </span>
        ),
      )}
      <Anchored pos={[deckPos()[0], 0, deckPos()[2] + 0.82]} className="pile-label">
        {t('seat.deck', { n: deckCount })}
      </Anchored>
      <Anchored pos={[discardPos()[0], 0, discardPos()[2] + 0.82]} className="pile-label">
        {t('seat.discard', { n: discardCount })}
      </Anchored>
      {popups.map((p) => (
        <PopupView key={p.id} p={p} />
      ))}
    </div>
  );
}
