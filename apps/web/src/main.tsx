import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { setPortrait } from './game/layout';
import { useGame } from './game/store';
import { Scene } from './three/Scene';
import { preloadCardArt } from './three/textures';
import { Hud, Lobby } from './ui/Hud';
import { Overlay } from './ui/Overlay';
import './styles.css';
import { getLang } from './ui/i18n';
import { t } from './ui/i18n';

// Animations must finish on time even when a frame is slow. GSAP's default lag smoothing
// stretches time after a long frame, which on a struggling device made attacks look frozen.
gsap.ticker.lagSmoothing(0);

document.documentElement.lang = getLang();

function Loading() {
  return (
    <div className="loading">
      <div className="loading-inner">
        <svg className="loading-shield" viewBox="-64 -72 128 158" aria-hidden>
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2d38f" />
              <stop offset="0.5" stopColor="#b8893a" />
              <stop offset="1" stopColor="#7a5520" />
            </linearGradient>
          </defs>
          <path d="M0 -70C33 -52 56 -56 61 -59C63 5 47 56 0 82C-47 56 -63 5 -61 -59C-56 -56 -33 -52 0 -70Z" fill="url(#lg)" />
          <path d="M0 -57C27 -43 46 -46 50 -48C52 4 39 46 0 67C-39 46 -52 4 -50 -48C-46 -46 -27 -43 0 -57Z" fill="#0f2148" />
          <text x="0" y="18" textAnchor="middle" fontFamily="'Alegreya SC', Georgia, serif" fontWeight="800" fontSize="52" fill="#d6aa5a">
            S
          </text>
        </svg>
        {t('app.loading')}
      </div>
    </div>
  );
}

function App() {
  const screen = useGame((s) => s.screen);
  // Card faces are drawn on canvases, so the fonts must be loaded first.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    Promise.all([document.fonts.load("800 64px 'Alegreya SC'"), document.fonts.load("500 16px 'Alegreya Sans'"), document.fonts.load("800 16px 'Alegreya Sans'"), preloadCardArt()])
      .catch(() => undefined)
      .finally(() => setFontsReady(true));
  }, []);
  useEffect(() => {
    const update = () => {
      const p = window.innerWidth < window.innerHeight;
      setPortrait(p);
      if (useGame.getState().portrait !== p) useGame.setState({ portrait: p });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  if (!fontsReady) return <Loading />;
  return screen === 'lobby' ? (
    <Lobby />
  ) : (
    <div className="stage">
      <Scene />
      <Overlay />
      <Hud />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
