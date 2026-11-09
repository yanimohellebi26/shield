import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import { online } from '../net/online';
import { t } from './i18n';
import { useLang } from './prefs';
import { IconChat, IconClose } from './icons';

/** Quick reactions, sent as keys; each player reads them in their own language. */
export const REACTIONS = ['bravo', 'ouch', 'gg', 'laugh', 'think', 'hurry'] as const;
type ReactionKey = (typeof REACTIONS)[number];
const reactionText = (r: string) => (REACTIONS.includes(r as ReactionKey) ? t(`react.${r as ReactionKey}`) : r);

/** Table chat for online games: quick reactions plus short messages. */
export function ChatPanel({ embedded = false }: { embedded?: boolean }) {
  useLang();
  const chat = useGame((s) => s.chat);
  const setOpen = useGame((s) => s.setChatOpen);
  const [text, setText] = useState('');
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [chat]);
  const send = () => {
    const v = text.trim();
    if (!v) return;
    online.chat({ text: v });
    setText('');
  };
  return (
    <div className={`chat-panel ${embedded ? 'embedded' : ''}`} role="dialog" aria-label={t('chat.title')}>
      <div className="chat-head">
        <span>{t('chat.title')}</span>
        {!embedded && (
          <button className="icon-btn small" onClick={() => setOpen(false)} aria-label={t('chat.close')} title={t('chat.close')}>
            <IconClose />
          </button>
        )}
      </div>
      <div className="chat-list" ref={list} aria-live="polite">
        {chat.length === 0 && <div className="chat-empty">{t('chat.empty')}</div>}
        {chat.map((m) => (
          <div key={m.id} className={`chat-line ${m.you ? 'you' : ''} ${m.reaction ? 'reaction' : ''}`}>
            <b>{m.you ? t('chat.you') : m.from}</b> {m.reaction ? reactionText(m.reaction) : m.text}
          </div>
        ))}
      </div>
      <div className="chat-reactions">
        {REACTIONS.map((r) => (
          <button key={r} className="chip-btn" onClick={() => online.chat({ reaction: r })}>
            {t(`react.${r}`)}
          </button>
        ))}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} maxLength={140} onChange={(e) => setText(e.target.value)} placeholder={t('chat.placeholder')} aria-label={t('chat.placeholder')} />
        <button className="ghost" type="submit" disabled={!text.trim()}>
          {t('chat.send')}
        </button>
      </form>
    </div>
  );
}

/** Top-bar button with an unread counter. */
export function ChatButton() {
  useLang();
  const open = useGame((s) => s.chatOpen);
  const unread = useGame((s) => s.chatUnread);
  const setOpen = useGame((s) => s.setChatOpen);
  return (
    <button className={`icon-btn ${open ? 'on' : ''}`} onClick={() => setOpen(!open)} title={t('chat.title')} aria-label={t('chat.title')} aria-pressed={open}>
      <IconChat />
      {unread > 0 && <span className="badge-count">{unread}</span>}
    </button>
  );
}

/** While the panel is closed, the latest message shows for a few seconds. */
export function ChatToast() {
  useLang();
  const last = useGame((s) => s.chat.at(-1));
  const open = useGame((s) => s.chatOpen);
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!last || last.you) return;
    setShown(last.id);
    const id = setTimeout(() => setShown(null), 4000);
    return () => clearTimeout(id);
  }, [last]);
  if (open || !last || shown !== last.id) return null;
  return (
    <div className="chat-toast" aria-hidden>
      <b>{last.from}</b> {last.reaction ? reactionText(last.reaction) : last.text}
    </div>
  );
}
