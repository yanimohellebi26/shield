import { cardLabel, type Card, type GameView } from '@shield/engine';
import {
  deckPos,
  isPortrait,
  discardPos,
  FACE_DOWN,
  FACE_UP,
  CHARGE_SPIN,
  FLAT,
  offerPos,
  presentScale,
  PRESENT,
  hoverPos,
  lift,
  popupPos,
  seatLayouts,
  slotPos,
  type SeatLayout,
  type Vec3,
} from './layout';
import { play } from '../audio/sound';
import { t, tYou } from '../ui/i18n';
import { LOCAL_ID, nextId, useGame, type FlyerSpec, type LogLine, type Overrides, type UiEvent } from './store';

/**
 * Turns engine events into choreography. Each function resolves when its animation ends;
 * the store then commits the authoritative view for the new state.
 */

const get = useGame.getState;
const sp = () => get().speed;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms / sp()));

function seats(): Map<string, SeatLayout> {
  const players = get().shown!.players;
  const localIndex = Math.max(0, players.findIndex((p) => p.id === LOCAL_ID));
  const layouts = seatLayouts(players.length, localIndex);
  return new Map(players.map((p, i) => [p.id, layouts[i]!]));
}

function nm(id: string): string {
  return get().shown!.players.find((p) => p.id === id)?.name ?? id;
}
const you = (id: string) => id === LOCAL_ID;
/** Target name in a log line: "toi"/"you" for the local player. */
const tgtName = (id: string) => (id === LOCAL_ID ? t('log.targetYou') : nm(id));

type FlyOpts = Partial<Omit<FlyerSpec, 'key' | 'onDone'>> & { from: Vec3; to: Vec3 };

/** Resolvers of flights still in the air, by flyer id. */
const pending = new Map<string, () => void>();

/**
 * Launches (or relaunches) the flyer `id`; resolves when it lands. It stays until cleared.
 * Always resolves: on landing, when relaunched or cleared, or after a generous watchdog,
 * so a dropped frame or an unmounted card can never hold the game.
 */
function fly(id: string, o: FlyOpts): Promise<void> {
  pending.get(id)?.();
  return new Promise((resolve) => {
    const duration = (o.duration ?? 0.55) / sp();
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      if (pending.get(id) === done) pending.delete(id);
      resolve();
    };
    const watchdog = setTimeout(done, duration * 1000 * 4 + 1200);
    pending.set(id, done);
    const spec: FlyerSpec = {
      key: nextId(),
      card: o.card ?? null,
      from: o.from,
      to: o.to,
      fromFlip: o.fromFlip ?? FACE_DOWN,
      toFlip: o.toFlip ?? o.fromFlip ?? FACE_DOWN,
      fromTilt: o.fromTilt ?? FLAT,
      toTilt: o.toTilt ?? o.fromTilt ?? FLAT,
      fromScale: o.fromScale ?? 1,
      toScale: o.toScale ?? o.fromScale ?? 1,
      fromSpin: o.fromSpin ?? 0,
      toSpin: o.toSpin ?? 0,
      duration,
      arc: o.arc ?? 0.8,
      ease: o.ease ?? 'power2.inOut',
      glow: o.glow ?? null,
      onDone: done,
    };
    useGame.setState((s) => ({ flyers: { ...s.flyers, [id]: spec } }));
  });
}

function clear(...ids: string[]) {
  for (const id of ids) pending.get(id)?.();
  useGame.setState((s) => {
    const flyers = { ...s.flyers };
    for (const id of ids) delete flyers[id];
    return { flyers };
  });
}

function ov(patch: (o: Overrides) => void) {
  useGame.setState((s) => {
    const o: Overrides = structuredClone(s.ov);
    patch(o);
    return { ov: o };
  });
}

function popup(pos: Vec3, text: string, kind: 'damage' | 'blocked' | 'info' | 'heal', sub?: string) {
  const id = nextId();
  useGame.setState((s) => ({ popups: [...s.popups, { id, pos, text, kind, ...(sub ? { sub } : {}) }] }));
  setTimeout(() => useGame.setState((s) => ({ popups: s.popups.filter((p) => p.id !== id) })), 1700 / sp());
}

/** Impact sparks with a shockwave ring: the one particle effect. */
function burst(pos: Vec3, color: string, size = 1) {
  // Keep bursts on phone tiles small so they don't swamp neighbouring tiles.
  if (pos[1] >= 0.39 && isPortrait()) size *= 0.45;
  const id = nextId();
  useGame.setState((s) => ({ bursts: [...s.bursts, { id, pos, color, size }] }));
  setTimeout(() => useGame.setState((s) => ({ bursts: s.bursts.filter((b) => b.id !== id) })), 900);
}

function updatePlayer(id: string, patch: (p: GameView['players'][number]) => GameView['players'][number]) {
  const shown = get().shown!;
  useGame.setState({ shown: { ...shown, players: shown.players.map((p) => (p.id === id ? patch(p) : p)) } });
}

function log(text: string, tone: LogLine['tone']) {
  useGame.setState((s) => ({ log: [...s.log.slice(-60), { id: nextId(), text, tone }] }));
}

function discardTop(): Vec3 {
  const shown = get().shown!;
  const count = get().ov.discardCount ?? shown.discard.length;
  return [discardPos()[0], 0.012 + Math.min(count, 30) * 0.004, discardPos()[2]];
}

function bumpDiscard(n: number) {
  ov((o) => {
    o.discardCount = (o.discardCount ?? get().shown!.discard.length) + n;
  });
}

function drawFromDeck() {
  play('slide', { volume: 0.7 });
  ov((o) => {
    o.deckDelta -= 1;
  });
}

/** Sends cards one after another to the discard pile, face up. */
async function toDiscard(items: { id: string; from: Vec3; card: Card; flip?: number; tilt?: number; scale?: number }[]) {
  await Promise.all(
    items.map(async (it, i) => {
      await wait(i * 70);
      await fly(it.id, {
        card: it.card,
        from: it.from,
        to: lift(discardTop(), i * 0.004),
        fromFlip: it.flip ?? FACE_UP,
        toFlip: FACE_UP,
        fromTilt: it.tilt ?? FLAT,
        toTilt: FLAT,
        fromScale: it.scale ?? 1,
        toScale: 1,
        duration: 0.5,
        arc: 1.2,
      });
      bumpDiscard(1);
      play('place', { volume: 0.45 });
      ov((o) => {
        o.discardTop = it.card;
      });
      clear(it.id);
    }),
  );
}

export async function animateEvent(e: UiEvent): Promise<void> {
  const S = seats();
  switch (e.type) {
    case 'shuffle': {
      play('shuffle');
      // Two riffles: the deck splits left and right, then the halves interleave back.
      const d = deckPos();
      const n = 10;
      for (let round = 0; round < 2; round++) {
        await Promise.all(
          Array.from({ length: n }, async (_, i) => {
            const side = i % 2 ? 1 : -1;
            await wait(i * 18);
            await fly(`sh${i}`, {
              from: lift(d, 0.3 + i * 0.012),
              to: [d[0] + side * 0.85, 0.25 + i * 0.02, d[2] + 0.05],
              fromFlip: FACE_DOWN,
              toSpin: side * 0.12,
              duration: 0.22,
              arc: 0.35,
              ease: 'power2.out',
            });
          }),
        );
        await Promise.all(
          Array.from({ length: n }, async (_, i) => {
            const side = i % 2 ? 1 : -1;
            await wait(i * 30);
            await fly(`sh${i}`, {
              from: [d[0] + side * 0.85, 0.25 + i * 0.02, d[2] + 0.05],
              to: lift(d, 0.32 + i * 0.008),
              fromFlip: FACE_DOWN,
              fromSpin: side * 0.12,
              duration: 0.2,
              arc: 0.45,
              ease: 'power2.in',
            });
          }),
        );
      }
      clear(...Array.from({ length: n }, (_, i) => `sh${i}`));
      log(t('log.shuffle'), 'neutral');
      return;
    }

    case 'deal': {
      // Round-robin like a real dealer: first life card to everyone, second life card, then the secret shields.
      const players = e.view.players;
      const order: { pid: string; slot: 'life0' | 'life1' | 'shield'; card: Card | null }[] = [];
      for (const slot of ['life0', 'life1', 'shield'] as const) {
        for (const p of players) order.push({ pid: p.id, slot, card: slot === 'shield' ? null : (p.life[slot === 'life0' ? 0 : 1] ?? null) });
      }
      const gap = Math.max(55, 1600 / order.length);
      await Promise.all(
        order.map(async (o, k) => {
          await wait(k * gap);
          const seat = S.get(o.pid)!;
          drawFromDeck();
          const id = `deal${k}`;
          const faceUp = o.slot !== 'shield';
          await fly(id, {
            card: o.card,
            from: lift(deckPos(), 0.35),
            to: slotPos(seat, o.slot),
            fromFlip: FACE_DOWN,
            toFlip: faceUp ? FACE_UP : FACE_DOWN,
            fromSpin: (Math.random() - 0.5) * 0.8,
            toSpin: 0,
            toScale: seat.tile ? 0.55 : seat.scale,
            duration: 0.5,
            arc: 1.1,
            ease: 'power2.out',
            glow: faceUp ? null : '#5aa9ff',
          });
          play('place', { volume: 0.35 });
          updatePlayer(o.pid, (p) =>
            o.slot === 'shield' ? { ...p, shield: { hidden: true } } : { ...p, life: o.card ? [...p.life, o.card] : p.life },
          );
          clear(id);
        }),
      );
      await wait(250);
      useGame.setState({ focus: get().game?.players[get().game!.current]?.id ?? null });
      return;
    }

    case 'turnStart': {
      useGame.setState({ focus: e.player });
      await wait(160);
      return;
    }

    case 'reshuffle': {
      play('shuffle', { volume: 0.8 });
      log(t('log.reshuffle', { n: e.count }), 'neutral');
      ov((o) => {
        o.discardCount = 0;
      });
      const n = Math.min(8, e.count);
      await Promise.all(
        Array.from({ length: n }, async (_, i) => {
          await wait(i * 45);
          await fly(`rs${i}`, { from: lift(discardPos(), 0.1), to: lift(deckPos(), 0.3), fromFlip: FACE_DOWN, duration: 0.35, arc: 1 });
          clear(`rs${i}`);
        }),
      );
      ov((o) => {
        o.deckDelta += e.count;
      });
      return;
    }

    case 'charge': {
      const seat = S.get(e.player)!;
      drawFromDeck();
      await fly('c', {
        from: lift(deckPos(), 0.3),
        to: slotPos(seat, 'charge', e.chargeCount - 1),
        fromFlip: FACE_DOWN,
        toSpin: seat.tile ? 0 : CHARGE_SPIN,
        duration: 0.6,
        arc: 1.6,
        glow: '#ffb347',
        fromScale: 1,
        toScale: seat.scale,
      });
      burst(slotPos(seat, 'charge'), '#ffb347', 0.7);
      play('shove');
      popup(seat.tile ? popupPos(seat) : lift(slotPos(seat, 'charge'), 0.5), t('pop.charge', { n: e.chargeCount }), 'info');
      log(tYou('log.charge', you(e.player), { name: nm(e.player), n: e.chargeCount }), 'charge');
      // The committed view will show the new stack at the same spot.
      useGame.setState({ shown: { ...get().shown!, players: get().shown!.players.map((p) => (p.id === e.player ? { ...p, chargeCount: e.chargeCount } : p)) } });
      clear('c');
      return;
    }

    case 'shieldChange': {
      const target = S.get(e.target)!;
      const self = e.player === e.target;
      ov((o) => {
        o.hideShield[e.target] = true;
      });
      const oldPos = slotPos(target, 'shield');
      const discarding = e.oldShield
        ? toDiscard([{ id: 'old', from: oldPos, card: e.oldShield, flip: FACE_DOWN, scale: target.scale }])
        : Promise.resolve();
      drawFromDeck();
      await wait(120);
      await fly('ns', {
        from: lift(deckPos(), 0.3),
        to: oldPos,
        fromFlip: FACE_DOWN,
        duration: 0.65,
        arc: 1.8,
        glow: '#5aa9ff',
        toScale: target.scale,
      });
      burst(oldPos, '#5aa9ff', 0.9);
      play('place');
      await discarding;
      useGame.setState({
        shown: {
          ...get().shown!,
          players: get().shown!.players.map((p) => (p.id === e.target ? { ...p, shield: { hidden: true } } : p)),
        },
      });
      ov((o) => {
        delete o.hideShield[e.target];
      });
      clear('ns');
      {
        const old = e.oldShield ? t('log.oldShield', { card: cardLabel(e.oldShield) }) : '';
        log(
          self
            ? tYou('log.shieldSelf', you(e.player), { name: nm(e.player), old })
            : tYou('log.shieldOther', you(e.player), { name: nm(e.player), target: tgtName(e.target), old }),
          'shield',
        );
      }
      return;
    }

    case 'attack': {
      const atk = S.get(e.player)!;
      const tgt = S.get(e.target)!;
      const all: { id: string; card: Card }[] = [
        ...e.charge.map((card, i) => ({ id: `ch${i}`, card })),
        ...(e.card ? [{ id: 'atk', card: e.card }] : []),
      ];
      const spread = (i: number) => (i - (all.length - 1) / 2) * 0.95;

      // 1. Draw the attack card and lift the charge, all face down above the attacker.
      if (e.charge.length) {
        ov((o) => {
          o.hideCharge[e.player] = true;
        });
      }
      if (e.card) drawFromDeck();
      await Promise.all(
        all.map((c, i) =>
          fly(c.id, {
            card: c.card,
            from: c.id === 'atk' ? lift(deckPos(), 0.3) : slotPos(atk, 'charge', i),
            fromSpin: c.id === 'atk' || atk.tile ? 0 : CHARGE_SPIN,
            to: hoverPos(atk, spread(i)),
            fromFlip: FACE_DOWN,
            toFlip: FACE_DOWN,
            toTilt: PRESENT,
            toScale: presentScale(),
            duration: 0.55,
            arc: 0.6,
          }),
        ),
      );
      // 2. Reveal them.
      await Promise.all(
        all.map((c, i) =>
          fly(c.id, {
            card: c.card,
            from: hoverPos(atk, spread(i)),
            to: lift(hoverPos(atk, spread(i)), 0.25),
            fromFlip: FACE_DOWN,
            toFlip: FACE_UP,
            fromTilt: PRESENT,
            fromScale: presentScale(),
            duration: 0.42,
            arc: 0.1,
            ease: 'back.out(1.6)',
            glow: '#ff7a3d',
          }),
        ),
      );
      play('fan', { volume: 0.6 });
      popup(lift(hoverPos(atk), 1.35), t('pop.atk', { n: e.attack }), 'info');
      await wait(380);

      // 3. Strike the target's shield.
      const shieldAt = slotPos(tgt, 'shield');
      await Promise.all(
        all.map((c, i) =>
          fly(c.id, {
            card: c.card,
            from: lift(hoverPos(atk, spread(i)), 0.25),
            to: lift(shieldAt, 0.35 + i * 0.03),
            fromFlip: FACE_UP,
            fromTilt: PRESENT,
            toTilt: FLAT + 0.25,
            fromScale: presentScale(),
            toScale: tgt.scale,
            duration: 0.34,
            arc: 0.9,
            ease: 'power3.in',
            glow: '#ff7a3d',
          }),
        ),
      );

      // 4. Impact: reveal the shield if it was hidden.
      useGame.setState((s) => ({ shake: s.shake + (e.damage > 0 ? Math.min(1, 0.35 + e.damage / 14) : 0.25) }));
      if (e.shieldWasHidden) {
        ov((o) => {
          o.hideShield[e.target] = true;
        });
        play('fan', { volume: 0.5 });
        await fly('shieldflip', {
          card: e.shield,
          from: shieldAt,
          to: shieldAt,
          fromFlip: FACE_DOWN,
          toFlip: FACE_UP,
          fromScale: tgt.scale,
          duration: 0.4,
          arc: 0.9,
          ease: 'power2.out',
          glow: '#5aa9ff',
        });
        ov((o) => {
          o.shieldCard[e.target] = e.shield;
          delete o.hideShield[e.target];
        });
        clear('shieldflip');
      }
      burst(shieldAt, e.damage > 0 ? '#ff4b3a' : '#5aa9ff', e.damage > 0 ? 1.4 : 1.1);
      play(e.damage > 0 ? 'hit' : 'block', { volume: e.damage > 0 ? Math.min(1, 0.6 + e.damage / 20) : 0.8 });
      ov((o) => {
        o.hp[e.target] = e.hpAfter;
      });
      popup(
        popupPos(tgt, 'shield'),
        e.damage > 0 ? `−${e.damage}` : t('pop.blocked'),
        e.damage > 0 ? 'damage' : 'blocked',
        t('pop.vs', { atk: e.attack, shield: e.shield.rank }),
      );
      log(
        tYou(e.damage > 0 ? 'log.hit' : 'log.block', you(e.player), {
          name: nm(e.player),
          target: tgtName(e.target),
          atk: e.attack,
          shield: e.shield.rank,
          dmg: e.damage,
          hp: e.hpAfter,
        }),
        e.damage > 0 ? 'hit' : 'block',
      );
      await wait(650);

      // 5. Spent cards go to the discard pile.
      await toDiscard(all.map((c) => ({ id: c.id, from: lift(shieldAt, 0.35), card: c.card, scale: tgt.scale })));
      return;
    }

    case 'chargeLost': {
      const seat = S.get(e.player)!;
      ov((o) => {
        o.hideCharge[e.player] = true;
      });
      popup(popupPos(seat, seat.tile ? undefined : 'charge'), t('pop.chargeBroken'), 'damage', t('pop.chargeBroken.sub', { n: e.attack }));
      burst(slotPos(seat, 'charge'), '#ffb347', 1.1);
      play('break', { volume: 0.7 });
      log(tYou('log.chargeLost', you(e.player), { name: nm(e.player), cards: e.cards.map(cardLabel).join(' + ') }), 'out');
      await toDiscard(
        e.cards.map((card, i) => ({
          id: `cl${i}`,
          from: slotPos(seat, 'charge', i),
          card,
          flip: FACE_DOWN,
          scale: seat.tile ? 0.55 : seat.scale,
        })),
      );
      useGame.setState({
        shown: { ...get().shown!, players: get().shown!.players.map((p) => (p.id === e.player ? { ...p, chargeCount: 0 } : p)) },
      });
      ov((o) => {
        delete o.hideCharge[e.player];
      });
      return;
    }

    case 'chargeHeld': {
      const seat = S.get(e.player)!;
      burst(slotPos(seat, 'charge'), '#ffb347', 0.8);
      play('tap');
      popup(popupPos(seat, seat.tile ? undefined : 'charge'), t('pop.chargeHolds'), 'info', t('pop.chargeHolds.sub', { n: e.attack }));
      log(tYou('log.chargeHeld', you(e.player), { name: nm(e.player), n: e.attack }), 'charge');
      await wait(500);
      return;
    }

    case 'eliminated': {
      const seat = S.get(e.player)!;
      log(tYou('log.eliminated', you(e.player), { name: nm(e.player) }), 'out');
      popup(seat.tile ? popupPos(seat) : lift(seat.pos, 1.6), t('pop.eliminated'), 'damage');
      burst(seat.pos, '#ff4b3a', 2);
      play('bell', { volume: 0.75 });
      useGame.setState((s) => ({ shake: s.shake + 0.6 }));
      ov((o) => {
        o.hideLife[e.player] = true;
        o.hideShield[e.player] = true;
        o.hideCharge[e.player] = true;
      });
      await toDiscard(e.discarded.map((card, i) => ({ id: `el${i}`, from: lift(seat.pos, 0.05), card, scale: seat.scale })));
      return;
    }

    case 'lifeSwap': {
      const seat = S.get(e.player)!;
      drawFromDeck();
      ov((o) => {
        o.hideLife[e.player] = true;
      });
      const discarding = toDiscard(
        e.oldLife.map((card, i) => ({ id: `ol${i}`, from: slotPos(seat, i === 0 ? 'life0' : 'life1'), card, scale: seat.scale })),
      );
      await fly('life', { card: e.card, from: lift(deckPos(), 0.3), to: hoverPos(seat), fromFlip: FACE_DOWN, toTilt: PRESENT, toScale: 1.2, duration: 0.55 });
      await fly('life', {
        card: e.card,
        from: hoverPos(seat),
        to: lift(hoverPos(seat), 0.2),
        fromFlip: FACE_DOWN,
        toFlip: FACE_UP,
        fromTilt: PRESENT,
        fromScale: 1.2,
        duration: 0.45,
        arc: 0.1,
        ease: 'back.out(1.6)',
        glow: '#5dff9a',
      });
      await wait(450);
      await fly('life', {
        card: e.card,
        from: lift(hoverPos(seat), 0.2),
        to: slotPos(seat, 'life0'),
        fromFlip: FACE_UP,
        fromTilt: PRESENT,
        toTilt: FLAT,
        fromScale: 1.2,
        toScale: seat.scale,
        duration: 0.5,
      });
      await discarding;
      burst(slotPos(seat, 'life0'), '#5dff9a', 1);
      play('chime');
      popup(popupPos(seat), t('pop.hp', { n: e.hpAfter }), e.hpAfter >= e.hpBefore ? 'heal' : 'damage', t('pop.lifeReplaced', { n: e.hpBefore }));
      useGame.setState({
        shown: {
          ...get().shown!,
          players: get().shown!.players.map((p) => (p.id === e.player ? { ...p, life: [e.card], hp: e.hpAfter, lifeSwapUsed: true } : p)),
        },
      });
      ov((o) => {
        delete o.hideLife[e.player];
      });
      clear('life');
      log(tYou('log.lifeSwap', you(e.player), { name: nm(e.player), from: e.hpBefore, to: e.hpAfter }), 'life');
      return;
    }

    case 'lifeOffer': {
      const seat = S.get(e.player)!;
      drawFromDeck();
      const mine = e.player === LOCAL_ID;
      await fly('offer', {
        card: e.card,
        from: lift(deckPos(), 0.3),
        to: mine ? offerPos() : hoverPos(seat),
        fromFlip: FACE_DOWN,
        toFlip: mine ? FACE_UP : FACE_DOWN,
        toTilt: PRESENT,
        toScale: mine ? 2 : 1.15,
        duration: 0.7,
        arc: 0.6,
        glow: '#5dff9a',
      });
      log(tYou('log.offer', you(e.player), { name: nm(e.player) }), 'life');
      return;
    }

    case 'lifeOfferResolved': {
      const seat = S.get(e.player)!;
      const mine = e.player === LOCAL_ID;
      const at = mine ? offerPos() : hoverPos(seat);
      const scale = mine ? 2 : 1.15;
      if (e.accepted) {
        ov((o) => {
          o.hideLife[e.player] = true;
        });
        const discarding = toDiscard(
          e.oldLife.map((card, i) => ({ id: `ol${i}`, from: slotPos(seat, i === 0 ? 'life0' : 'life1'), card, scale: seat.scale })),
        );
        await fly('offer', {
          card: e.card,
          from: at,
          to: slotPos(seat, 'life0'),
          fromFlip: mine ? FACE_UP : FACE_DOWN,
          toFlip: FACE_UP,
          fromTilt: PRESENT,
          toTilt: FLAT,
          fromScale: scale,
          toScale: seat.scale,
          duration: 0.6,
          glow: '#5dff9a',
        });
        await discarding;
        burst(slotPos(seat, 'life0'), '#5dff9a', 1);
        play('chime');
        popup(popupPos(seat), t('pop.hp', { n: e.hpAfter }), 'heal', t('pop.lifeReplacedShort'));
        useGame.setState({
          shown: {
            ...get().shown!,
            players: get().shown!.players.map((p) => (p.id === e.player ? { ...p, life: [e.card], hp: e.hpAfter, lifeSwapUsed: true } : p)),
          },
        });
        ov((o) => {
          delete o.hideLife[e.player];
        });
        clear('offer');
        log(tYou('log.accept', you(e.player), { name: nm(e.player), card: cardLabel(e.card), n: e.hpAfter }), 'life');
      } else {
        clear('offer');
        await toDiscard([{ id: 'offerd', from: at, card: e.card, flip: mine ? FACE_UP : FACE_DOWN, tilt: PRESENT, scale }]);
        log(tYou('log.decline', you(e.player), { name: nm(e.player), card: cardLabel(e.card) }), 'life');
      }
      return;
    }

    case 'pass': {
      log(tYou('log.pass', you(e.player), { name: nm(e.player) }), 'neutral');
      await wait(300);
      return;
    }

    case 'gameOver': {
      log(tYou('log.win', you(e.winner), { name: nm(e.winner) }), 'life');
      const seat = S.get(e.winner)!;
      burst(seat.pos, '#f2d38f', 1.6);
      play('bell');
      play('fan', { delay: 0.25 });
      useGame.setState({ focus: e.winner });
      await wait(1400);
      return;
    }
  }
}
