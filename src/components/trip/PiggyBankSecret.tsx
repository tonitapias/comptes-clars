import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../Toast';

interface PiggyBankSecretProps {
  isSettled: boolean;
}

const PARTICLE_TYPES = ['🪙', '🪙', '💸', '💸', '💰', '💎', '✨', '👑'];

export function PiggyBankSecret({ isSettled }: PiggyBankSecretProps) {
  const [clicks, setClicks] = useState(0);
  const [exploded, setExploded] = useState(false);
  const [visible, setVisible] = useState(false);
  const { toast, showToast } = useToast();

  useEffect(() => {
    if (isSettled && !exploded) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isSettled, exploded]);

  // GENERACIÓ DE PARTÍCULES 3D
  const particles = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const velocity = 200 + Math.random() * 450; 
      const rotationDir = Math.random() > 0.5 ? 1 : -1;
      
      // FÍSICA 3D: Eixos X i Y (com abans) + Eix Z (profunditat)
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity - (150 + Math.random() * 250); 
      // L'eix Z fa que les partícules vinguin cap a nosaltres (>0) o s'allunyin (<0)
      const vz = (Math.random() - 0.5) * 1000; 

      // Rotacions tridimensionals (fins a 4 voltes = 1440 graus)
      const rotX = Math.random() * 1440 * rotationDir;
      const rotY = Math.random() * 1440 * rotationDir;
      const rotZ = Math.random() * 720 * rotationDir;

      return {
        id: i,
        emoji: PARTICLE_TYPES[Math.floor(Math.random() * PARTICLE_TYPES.length)],
        style: {
          '--vx': `${vx}px`,
          '--vy': `${vy}px`,
          '--vz': `${vz}px`, // Nova variable Z
          '--rotX': `${rotX}deg`,
          '--rotY': `${rotY}deg`,
          '--rotZ': `${rotZ}deg`,
          animationDelay: `${Math.random() * 0.15}s`, 
          fontSize: `${Math.random() * 2 + 1.5}rem`, 
        } as React.CSSProperties
      };
    });
  }, []);

  if (!visible || !isSettled) return null;

  const handleTap = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);

    if (navigator.vibrate) {
        if (newClicks === 1) navigator.vibrate(50);
        if (newClicks === 2) navigator.vibrate([80, 30, 80]);
    }

    if (newClicks >= 3) {
      setExploded(true);
      if (navigator.vibrate) navigator.vibrate([150, 50, 300, 50, 100]);

      showToast('💥 BOOM! Zero deutes, màxima llibertat! 💥', 'success', 5000);
      
      setTimeout(() => setVisible(false), 3500);
    }
  };

  return (
    // CONTENIDOR 3D: Afegim 'perspective' per activar el motor 3D de CSS
    <div className={`flex flex-col items-center justify-center py-10 relative z-20 overflow-visible transition-all ${exploded ? 'animate-screen-shake' : ''}`} style={{ perspective: '1200px' }}>
      {toast}

      {/* El Porquet en 3D */}
      <div 
        onClick={!exploded ? handleTap : undefined}
        className={`
          relative text-9xl select-none transition-all duration-200 ease-out origin-bottom transform-gpu
          ${!exploded ? 'cursor-pointer animate-breath-3d' : 'scale-0 opacity-0 duration-200'}
          ${clicks === 1 ? 'scale-110 rotate-y-12 rotate-x-6 brightness-110 contrast-125' : ''}
          ${clicks === 2 ? 'scale-125 -rotate-y-12 -rotate-x-12 brightness-125 saturate-200 animate-shake-3d' : ''}
        `}
        style={{ transformStyle: 'preserve-3d' }}
        role="button"
      >
        🐖
        {clicks > 0 && !exploded && (
            <span className={`absolute inset-0 flex items-center justify-center opacity-70 animate-ping-slow transform-gpu translate-z-10 ${clicks === 2 ? 'text-8xl' : 'text-6xl'}`}>💥</span>
        )}
      </div>

      {/* L'Explosió 3D */}
      {/* L'Explosió 3D (OPTIMITZADA PER RENDIMENT) */}
      {exploded && (
        <div className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
          {particles.slice(0, 50).map((particle) => ( // Limitem a 50 partícules per seguretat
            <div
              key={particle.id}
              // Hem eliminat el drop-shadow-2xl
              className="absolute top-0 left-0 flex items-center justify-center transition-all will-change-transform opacity-0 transform-gpu"
              style={{
                ...particle.style,
                animation: `supernova3D 2.5s cubic-bezier(0.1, 0.8, 0.2, 1) forwards ${particle.style.animationDelay}`
              }}
            >
              {particle.emoji}
            </div>
          ))}
           {/* Flashos optimitzats: Sense mix-blend-mode i amb menys blur */}
           <div className="absolute inset-0 rounded-full bg-yellow-400 blur-2xl animate-flash-fade-intense z-[-1] transform-gpu translate-z-[-100px]"></div>
        </div>
      )}
      
      {!exploded && clicks === 0 && (
        <p className="text-sm text-indigo-400 dark:text-indigo-300 font-bold mt-6 animate-pulse uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/50 px-4 py-2 rounded-full shadow-lg transform-gpu translate-z-10">
          Missió Complerta. Toca la guardiola.
        </p>
      )}

      <style>{`
        /* Respiració amb lleugera rotació 3D */
        @keyframes breath3d {
            0%, 100% { transform: scale(1) rotateY(0deg) rotateX(0deg); }
            50% { transform: scale(1.05) rotateY(10deg) rotateX(5deg); }
        }

        /* Tremolor violent en 3D (Z, Y i X barrejats) */
        @keyframes shake3d {
            0% { transform: translate3d(1px, 1px, 0) rotateY(0deg) rotateZ(0deg); }
            10% { transform: translate3d(-2px, -2px, 20px) rotateY(-10deg) rotateZ(-2deg); }
            20% { transform: translate3d(-3px, 0px, -10px) rotateY(15deg) rotateZ(3deg); }
            30% { transform: translate3d(3px, 2px, 30px) rotateY(-15deg) rotateZ(0deg); }
            40% { transform: translate3d(1px, -1px, -20px) rotateY(10deg) rotateZ(1deg); }
            50% { transform: translate3d(-1px, 2px, 10px) rotateY(-5deg) rotateZ(-2deg); }
            60% { transform: translate3d(-3px, 1px, 25px) rotateY(20deg) rotateZ(0deg); }
            70% { transform: translate3d(3px, 1px, -15px) rotateY(-20deg) rotateZ(-2deg); }
            80% { transform: translate3d(-1px, -1px, 10px) rotateY(10deg) rotateZ(3deg); }
            90% { transform: translate3d(1px, 2px, 5px) rotateY(-10deg) rotateZ(0deg); }
            100% { transform: translate3d(1px, -2px, 0) rotateY(0deg) rotateZ(-2deg); }
        }

        @keyframes screenShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes flashFadeIntense {
            0% { opacity: 0; transform: scale(0.1); }
            10% { opacity: 1; transform: scale(1.5); }
            100% { opacity: 0; transform: scale(4); }
        }
         @keyframes flashFadeQuick {
            0% { opacity: 0; transform: scale(0.5); }
            5% { opacity: 0.8; transform: scale(1); }
            50% { opacity: 0; transform: scale(2); }
        }

        /* NOVA FÍSICA 3D: Surt del fons cap endavant o s'allunya en profunditat */
        @keyframes supernova3D {
          0% {
            opacity: 0;
            transform: translate3d(-50%, -50%, 0) scale(0.1) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          5% {
             opacity: 1;
             transform: translate3d(-50%, -50%, 0) scale(1.2) rotateX(0deg) rotateY(0deg) rotateZ(0deg);
          }
          25% {
            opacity: 1;
            /* Incorporem la variable Z i les rotacions reals 3D */
            transform: translate3d(calc(var(--vx) - 50%), calc(var(--vy) - 50%), var(--vz)) scale(1.5) rotateX(var(--rotX)) rotateY(var(--rotY)) rotateZ(var(--rotZ));
          }
          100% {
            opacity: 0;
            /* La gravetat estira en Y (+800px) i les partícules continuen girant mentre cauen */
            transform: translate3d(calc(var(--vx) * 1.5 - 50%), calc(var(--vy) + 800px - 50%), calc(var(--vz) * 1.5)) scale(0.5) rotateX(calc(var(--rotX) * 2)) rotateY(calc(var(--rotY) * 2)) rotateZ(calc(var(--rotZ) * 2));
          }
        }

        .animate-breath-3d { animation: breath3d 3s infinite ease-in-out; }
        .animate-shake-3d { animation: shake3d 0.2s infinite; }
        .animate-screen-shake { animation: screenShake 0.5s ease-out; }
        .animate-flash-fade-intense { animation: flashFadeIntense 1s ease-out forwards; }
        .animate-flash-fade-quick { animation: flashFadeQuick 0.5s ease-out forwards; }
        .animate-ping-slow { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}