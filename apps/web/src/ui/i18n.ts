/**
 * Interface text in French and English. French is the default for French-speaking browsers.
 * Keys ending in ".you" are the second-person variant used when the local player is the subject.
 */
export type Lang = 'fr' | 'en';

const fr = {
  'app.tagline': 'Jeu de cartes et de bluff, de 2 à 8 joueurs',
  'app.loading': 'On installe la table…',
  'lobby.name': 'Ton nom',
  'lobby.namePlaceholder': 'Toi',
  'lobby.players': 'Nombre de joueurs',
  'lobby.start': 'Jouer',
  'lobby.rules': 'Règles du jeu',
  'lobby.seats': 'Toi et {bots} adversaires',
  'rules.life': '<b>Vie.</b> Tes deux cartes face visible. Leur total donne tes HP.',
  'rules.shield': "<b>Bouclier.</b> Un seul, face cachée. Personne ne le connaît, pas même toi, jusqu'à la première attaque.",
  'rules.turn': "<b>Ton tour.</b> Annonce ton action d'abord, la carte est piochée ensuite : attaquer, charger, changer ton bouclier ou celui d'un adversaire.",
  'rules.damage': "<b>Dégâts.</b> Attaque moins bouclier. Une charge s'ajoute à ta prochaine attaque ; elle reste cachée, même pour toi.",
  'rules.chargeRisk': '<b>Charge en danger.</b> Si un coup passe ton bouclier, tu perds toute ta charge.',
  'rules.lifeSwap': "<b>Sous 5 HP.</b> Une fois par partie, tu peux remplacer ta vie par une carte tirée à l'aveugle. À 1 HP pile, tu la vois avant de choisir.",
  'rules.values': '<b>Valeurs.</b> As 1, cartes 2 à 10, Valet 11, Dame 12, Roi 13. La pastille dorée de chaque carte rappelle sa valeur.',
  'top.turn': 'Tour {n}',
  'top.playing': '{name} joue',
  'top.playing.you': 'À toi de jouer',
  'top.leave': 'Quitter',
  'top.rules': 'Règles',
  'top.settings': 'Réglages',
  'top.log': 'Journal',
  'settings.title': 'Réglages',
  'settings.lang': 'Langue',
  'settings.speed': 'Vitesse des animations',
  'settings.motion': 'Effets de mouvement',
  'settings.motion.full': 'Complets',
  'settings.motion.reduced': 'Réduits',
  'settings.close': 'Fermer',
  'act.attack': 'Attaquer',
  'act.attack.sub': 'Pioche et frappe',
  'act.attack.subCharged': 'Pioche + {n} en charge',
  'act.charge': 'Charger',
  'act.charge.sub': 'Garde une carte cachée',
  'act.shield': 'Nouveau bouclier',
  'act.shield.sub': 'Remplace le tien',
  'act.other': 'Changer un bouclier',
  'act.other.sub': 'Impose un bouclier',
  'act.pass': 'Passer',
  'act.pass.sub': 'Plus de carte à piocher',
  'act.lifeSwap': 'Remplacer ma vie',
  'act.lifeSwap.blind': "à l'aveugle",
  'act.lifeSwap.see': 'tu verras la carte',
  'hint.yourTurn': 'Choisis ton action',
  'hint.pickAttack': 'Choisis qui attaquer',
  'hint.pickShield': 'Choisis à qui changer le bouclier',
  'hint.cancel': 'Annuler',
  'hint.waiting': '{name} réfléchit…',
  'hint.out': 'Tu es éliminé. La partie continue.',
  'preview.attack': 'Bouclier {shield}',
  'preview.shield': 'Bouclier {shield}',
  'offer.title': 'Tu es à 1 HP. La carte tirée : {card}',
  'offer.sub': 'Si tu acceptes, ta vie passe à {n}. Ton remplacement est utilisé dans tous les cas.',
  'offer.accept': 'Prendre ({n} HP)',
  'offer.decline': 'Garder 1 HP',
  'over.victory': 'Victoire',
  'over.wins': '{name} remporte la partie',
  'over.after': 'en {n} tours',
  'over.again': 'Rejouer',
  'over.change': 'Changer de table',
  'over.ranking': 'Classement',
  'over.dealt': '{n} dégâts',
  'over.kills': '{n} élim.',
  'over.biggest': 'Plus gros coup de la partie : {n}, par {name}',
  'seat.out': 'Éliminé',
  'seat.shield': 'BOUCLIER',
  'seat.deck': 'Paquet · {n}',
  'seat.discard': 'Défausse · {n}',
  'chip.shield': 'Valeur du bouclier (? tant qu’il n’a pas été attaqué)',
  'chip.charge': 'Cartes chargées (cachées pour tous)',
  'chip.lifeUsed': 'Remplacement de vie déjà utilisé',
  'chip.lifeFree': 'Remplacement de vie encore disponible',
  'pop.atk': '{n}',
  'pop.blocked': 'Bloqué',
  'pop.vs': '{atk} contre {shield}',
  'pop.charge': 'Charge ×{n}',
  'pop.chargeBroken': 'Charge perdue',
  'pop.chargeBroken.sub': 'coup reçu',
  'pop.chargeHolds': 'La charge tient',
  'pop.chargeHolds.sub': '',
  'pop.eliminated': 'Éliminé',
  'pop.hp': '{n} HP',
  'pop.lifeReplaced': 'avant : {n}',
  'pop.lifeReplacedShort': 'nouvelle vie',
  'banner.yourTurn': 'À toi de jouer',
  'log.first': '{name} commence.',
  'log.first.you': 'Tu commences.',
  'rules.secondBonus': '<b>À deux joueurs.</b> Celui qui joue en second commence avec 3 HP de plus.',
  'log.secondBonus': '{name} joue en second et commence avec 3 HP de plus.',
  'log.secondBonus.you': 'Tu joues en second et commences avec 3 HP de plus.',
  'log.shuffle': 'Le paquet est mélangé.',
  'log.reshuffle': 'La défausse est remélangée ({n} cartes).',
  'log.charge': '{name} charge une carte ({n} en réserve).',
  'log.charge.you': 'Tu charges une carte ({n} en réserve).',
  'log.shieldSelf': '{name} change son bouclier{old}.',
  'log.shieldSelf.you': 'Tu changes ton bouclier{old}.',
  'log.shieldOther': '{name} change le bouclier de {target}{old}.',
  'log.shieldOther.you': 'Tu changes le bouclier de {target}{old}.',
  'log.oldShield': ', {card} part à la défausse',
  'log.hit': '{name} attaque {target} : {atk} contre {shield}, {dmg} dégâts. Il reste {hp} HP.',
  'log.hit.you': 'Tu attaques {target} : {atk} contre {shield}, {dmg} dégâts. Il reste {hp} HP.',
  'log.block': '{name} attaque {target} : {atk} contre {shield}, bloqué.',
  'log.block.you': 'Tu attaques {target} : {atk} contre {shield}, bloqué.',
  'log.targetYou': 'toi',
  'log.chargeLost': '{name} perd sa charge ({cards}).',
  'log.chargeLost.you': 'Tu perds ta charge ({cards}).',
  'log.chargeHeld': 'La charge de {name} résiste à {n}.',
  'log.chargeHeld.you': 'Ta charge résiste à {n}.',
  'log.eliminated': '{name} est éliminé.',
  'log.eliminated.you': 'Tu es éliminé.',
  'log.lifeSwap': '{name} remplace sa vie : {from} HP devient {to} HP.',
  'log.lifeSwap.you': 'Tu remplaces ta vie : {from} HP devient {to} HP.',
  'log.offer': '{name} est à 1 HP et regarde une carte de vie.',
  'log.offer.you': 'Tu es à 1 HP, tu regardes une carte de vie.',
  'log.accept': '{name} prend {card} et passe à {n} HP.',
  'log.accept.you': 'Tu prends {card} et passes à {n} HP.',
  'log.decline': '{name} refuse {card} et reste à 1 HP.',
  'log.decline.you': 'Tu refuses {card} et restes à 1 HP.',
  'log.pass': '{name} ne peut pas piocher et passe.',
  'log.pass.you': 'Tu ne peux pas piocher et passes.',
  'log.win': '{name} gagne !',
  'log.win.you': 'Tu gagnes !',
};

type Key = keyof typeof fr;

const en: Record<Key, string> = {
  'app.tagline': 'A card game of bluff for 2 to 8 players',
  'app.loading': 'Setting up the table…',
  'lobby.name': 'Your name',
  'lobby.namePlaceholder': 'You',
  'lobby.players': 'Number of players',
  'lobby.start': 'Play',
  'lobby.rules': 'Rules',
  'lobby.seats': 'You and {bots} opponents',
  'rules.life': '<b>Life.</b> Your two face-up cards. Their total is your HP.',
  'rules.shield': '<b>Shield.</b> Just one, face down. Nobody knows it, not even you, until it is first attacked.',
  'rules.turn': "<b>Your turn.</b> Call your action first, then the card is drawn: attack, charge, replace your shield or an opponent's.",
  'rules.damage': '<b>Damage.</b> Attack minus shield. A charge adds to your next attack; it stays hidden, even from you.',
  'rules.chargeRisk': '<b>Charge at risk.</b> If a hit gets through your shield, you lose your whole charge.',
  'rules.lifeSwap': '<b>Below 5 HP.</b> Once per game you may replace your life with a blind draw. At exactly 1 HP you see it before choosing.',
  'rules.values': '<b>Values.</b> Ace 1, cards 2 to 10, Jack 11, Queen 12, King 13. The gold coin on each card shows its value.',
  'top.turn': 'Turn {n}',
  'top.playing': '{name} is playing',
  'top.playing.you': 'Your turn',
  'top.leave': 'Leave',
  'top.rules': 'Rules',
  'top.settings': 'Settings',
  'top.log': 'Log',
  'settings.title': 'Settings',
  'settings.lang': 'Language',
  'settings.speed': 'Animation speed',
  'settings.motion': 'Motion effects',
  'settings.motion.full': 'Full',
  'settings.motion.reduced': 'Reduced',
  'settings.close': 'Close',
  'act.attack': 'Attack',
  'act.attack.sub': 'Draw and strike',
  'act.attack.subCharged': 'Draw + {n} charged',
  'act.charge': 'Charge',
  'act.charge.sub': 'Keep a hidden card',
  'act.shield': 'New shield',
  'act.shield.sub': 'Replace yours',
  'act.other': 'Swap a shield',
  'act.other.sub': 'Force a new shield',
  'act.pass': 'Pass',
  'act.pass.sub': 'No card left to draw',
  'act.lifeSwap': 'Replace my life',
  'act.lifeSwap.blind': 'blind draw',
  'act.lifeSwap.see': 'you will see it',
  'hint.yourTurn': 'Choose your action',
  'hint.pickAttack': 'Choose who to attack',
  'hint.pickShield': 'Choose whose shield to replace',
  'hint.cancel': 'Cancel',
  'hint.waiting': '{name} is choosing…',
  'hint.out': 'You are out. The game goes on.',
  'preview.attack': 'Shield {shield}',
  'preview.shield': 'Shield {shield}',
  'offer.title': 'You are at 1 HP. The card: {card}',
  'offer.sub': 'If you take it, your life becomes {n}. Your replacement is used either way.',
  'offer.accept': 'Take it ({n} HP)',
  'offer.decline': 'Keep 1 HP',
  'over.victory': 'Victory',
  'over.wins': '{name} wins the game',
  'over.after': 'in {n} turns',
  'over.again': 'Play again',
  'over.change': 'Change table',
  'over.ranking': 'Ranking',
  'over.dealt': '{n} damage',
  'over.kills': '{n} KO',
  'over.biggest': 'Biggest hit of the game: {n}, by {name}',
  'seat.out': 'Out',
  'seat.shield': 'SHIELD',
  'seat.deck': 'Deck · {n}',
  'seat.discard': 'Discard · {n}',
  'chip.shield': 'Shield value (? until attacked)',
  'chip.charge': 'Charged cards (hidden from everyone)',
  'chip.lifeUsed': 'Life replacement used',
  'chip.lifeFree': 'Life replacement still available',
  'pop.atk': '{n}',
  'pop.blocked': 'Blocked',
  'pop.vs': '{atk} vs {shield}',
  'pop.charge': 'Charge ×{n}',
  'pop.chargeBroken': 'Charge lost',
  'pop.chargeBroken.sub': 'hit taken',
  'pop.chargeHolds': 'Charge holds',
  'pop.chargeHolds.sub': '',
  'pop.eliminated': 'Eliminated',
  'pop.hp': '{n} HP',
  'pop.lifeReplaced': 'was {n}',
  'pop.lifeReplacedShort': 'new life',
  'banner.yourTurn': 'Your turn',
  'log.first': '{name} plays first.',
  'log.first.you': 'You play first.',
  'rules.secondBonus': '<b>Two players.</b> Whoever plays second starts with 3 extra HP.',
  'log.secondBonus': '{name} plays second and starts with 3 extra HP.',
  'log.secondBonus.you': 'You play second and start with 3 extra HP.',
  'log.shuffle': 'The deck is shuffled.',
  'log.reshuffle': 'The discard pile is reshuffled ({n} cards).',
  'log.charge': '{name} charges a card ({n} stored).',
  'log.charge.you': 'You charge a card ({n} stored).',
  'log.shieldSelf': '{name} replaces their own shield{old}.',
  'log.shieldSelf.you': 'You replace your own shield{old}.',
  'log.shieldOther': "{name} replaces {target}'s shield{old}.",
  'log.shieldOther.you': "You replace {target}'s shield{old}.",
  'log.oldShield': ', {card} discarded',
  'log.hit': '{name} attacks {target}: {atk} vs {shield}, {dmg} damage. {hp} HP left.',
  'log.hit.you': 'You attack {target}: {atk} vs {shield}, {dmg} damage. {hp} HP left.',
  'log.block': '{name} attacks {target}: {atk} vs {shield}, blocked.',
  'log.block.you': 'You attack {target}: {atk} vs {shield}, blocked.',
  'log.targetYou': 'you',
  'log.chargeLost': '{name} loses their charge ({cards}).',
  'log.chargeLost.you': 'You lose your charge ({cards}).',
  'log.chargeHeld': "{name}'s charge holds against {n}.",
  'log.chargeHeld.you': 'Your charge holds against {n}.',
  'log.eliminated': '{name} is eliminated.',
  'log.eliminated.you': 'You are eliminated.',
  'log.lifeSwap': '{name} replaces their life: {from} HP becomes {to} HP.',
  'log.lifeSwap.you': 'You replace your life: {from} HP becomes {to} HP.',
  'log.offer': '{name} is at 1 HP and looks at a life card.',
  'log.offer.you': 'You are at 1 HP and look at a life card.',
  'log.accept': '{name} takes {card} and goes to {n} HP.',
  'log.accept.you': 'You take {card} and go to {n} HP.',
  'log.decline': '{name} declines {card} and stays at 1 HP.',
  'log.decline.you': 'You decline {card} and stay at 1 HP.',
  'log.pass': '{name} cannot draw and passes.',
  'log.pass.you': 'You cannot draw and pass.',
  'log.win': '{name} wins!',
  'log.win.you': 'You win!',
};

const dicts: Record<Lang, Record<Key, string>> = { fr, en };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('shield.lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch {
    // Storage may be unavailable (private mode); fall back to the browser language.
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let lang: Lang = initialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang) {
  lang = l;
  try {
    localStorage.setItem('shield.lang', l);
  } catch {
    // Not persisted; the choice still applies to this session.
  }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}

export function onLangChange(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

/** Translates `key`, filling `{name}`-style placeholders. */
export function t(key: Key, params: Record<string, string | number> = {}): string {
  const s = dicts[lang][key] ?? fr[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/** Second-person variant when the local player is the subject (`key.you`), if one exists. */
export function tYou(key: Key, isYou: boolean, params: Record<string, string | number> = {}): string {
  const youKey = `${key}.you` as Key;
  return t(isYou && youKey in fr ? youKey : key, params);
}

export type { Key as I18nKey };
