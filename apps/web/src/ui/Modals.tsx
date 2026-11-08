import { useEffect, type ReactNode } from 'react';
import { useGame } from '../game/store';
import { setLang, t, type Lang } from './i18n';
import { setMotion, useLang, useMotion } from './prefs';
import { play, setSoundEnabled, setVolume, useSoundPrefs } from '../audio/sound';
import { IconAttack, IconCharge, IconClose, IconNewShield, IconSwapShield } from './icons';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('settings.close')}>
            <IconClose />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const RULE_KEYS = ['rules.life', 'rules.shield', 'rules.turn', 'rules.damage', 'rules.chargeRisk', 'rules.lifeSwap', 'rules.secondBonus', 'rules.values'] as const;

export function RulesList() {
  useLang();
  return (
    <ul className="rules-list">
      {RULE_KEYS.map((k) => (
        <li key={k} dangerouslySetInnerHTML={{ __html: t(k) }} />
      ))}
    </ul>
  );
}

export function RulesModal({ onClose }: { onClose: () => void }) {
  useLang();
  return (
    <Modal title={t('top.rules')} onClose={onClose}>
      <RulesList />
      <div className="kbd-help">
        <span>
          <kbd>A</kbd> <IconAttack /> {t('act.attack')}
        </span>
        <span>
          <kbd>C</kbd> <IconCharge /> {t('act.charge')}
        </span>
        <span>
          <kbd>B</kbd> <IconNewShield /> {t('act.shield')}
        </span>
        <span>
          <kbd>E</kbd> <IconSwapShield /> {t('act.other')}
        </span>
        <span>
          <kbd>1</kbd> … <kbd>7</kbd> {t('hint.pickAttack')}
        </span>
        <span>
          <kbd>Esc</kbd> {t('hint.cancel')}
        </span>
      </div>
    </Modal>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const lang = useLang();
  const motion = useMotion();
  const sound = useSoundPrefs();
  const speed = useGame((s) => s.speed);
  const setSpeed = useGame((s) => s.setSpeed);
  const seg = <T extends string | number>(value: T, options: [T, string][], set: (v: T) => void) => (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={String(v)} className={v === value ? 'on' : ''} onClick={() => set(v)}>
          {label}
        </button>
      ))}
    </div>
  );
  return (
    <Modal title={t('settings.title')} onClose={onClose}>
      <div className="settings">
        <label>{t('settings.lang')}</label>
        {seg<Lang>(lang, [['fr', 'Français'], ['en', 'English']], setLang)}
        <label>{t('settings.speed')}</label>
        {seg<number>(speed, [[1, '1×'], [1.5, '1.5×'], [2.5, '2.5×']], setSpeed)}
        <label>{t('settings.sound')}</label>
        <div className="sound-row">
          {seg(sound.enabled ? 'on' : 'off', [['on', t('settings.sound.on')], ['off', t('settings.sound.off')]], (v) => setSoundEnabled(v === 'on'))}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sound.volume}
            disabled={!sound.enabled}
            aria-label={t('settings.volume')}
            onChange={(e) => setVolume(Number(e.target.value))}
            onPointerUp={() => play('place')}
          />
        </div>
        <label>{t('settings.motion')}</label>
        {seg(motion, [['full', t('settings.motion.full')], ['reduced', t('settings.motion.reduced')]], setMotion)}
      </div>
    </Modal>
  );
}
