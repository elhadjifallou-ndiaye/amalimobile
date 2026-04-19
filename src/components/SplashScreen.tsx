import { useEffect, useState } from 'react';
import logoAmali from "../assets/logoamali.png";


interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2800);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, 3100);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#090909' }}
    >
      {/* Particules flottantes */}
      <div className="particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`particle particle-${i + 1}`} />
        ))}
      </div>

      {/* Halo brillant derrière le logo */}
      <div className="glow-ring" />

      {/* Logo avec animation */}
      <div className="logo-wrapper">
        <img
          src={logoAmali}
          alt="AMALI"
          className="logo-img"
        />
      </div>

      {/* Petites étoiles scintillantes */}
      <div className="stars">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`star star-${i + 1}`}>✦</div>
        ))}
      </div>


      <style>{`
        /* ---------- fond ---------- */
        /* déjà géré inline avec #090909 */

        /* ---------- logo ---------- */
        .logo-wrapper {
          position: relative;
          z-index: 10;
          animation: logoPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
        }

        .logo-img {
          width: 160px;
          height: 160px;
          object-fit: contain;
          filter: drop-shadow(0 0 32px rgba(255,255,255,0.18));
        }

        @keyframes logoPop {
          0%   { opacity: 0; transform: scale(0.6) translateY(16px); }
          100% { opacity: 1; transform: scale(1)   translateY(0); }
        }

        /* ---------- halo ---------- */
        .glow-ring {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(180,120,255,0.12) 0%, transparent 70%);
          animation: pulse 2s ease-in-out 0.8s infinite alternate;
          z-index: 5;
        }

        @keyframes pulse {
          0%   { transform: scale(0.9); opacity: 0.5; }
          100% { transform: scale(1.2); opacity: 1; }
        }

        /* ---------- particules ---------- */
        .particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: rgba(255,255,255,0.6);
          animation: float linear infinite;
        }

        /* positions & timings variés */
        .particle-1  { left: 15%; top: 80%; width: 4px; height: 4px; animation-duration: 6s;  animation-delay: 0.2s;  }
        .particle-2  { left: 30%; top: 90%; width: 3px; height: 3px; animation-duration: 8s;  animation-delay: 0.8s;  background: rgba(200,150,255,0.7); }
        .particle-3  { left: 50%; top: 85%; width: 5px; height: 5px; animation-duration: 7s;  animation-delay: 0.4s;  }
        .particle-4  { left: 65%; top: 88%; width: 3px; height: 3px; animation-duration: 9s;  animation-delay: 1s;    background: rgba(150,200,255,0.7); }
        .particle-5  { left: 80%; top: 82%; width: 4px; height: 4px; animation-duration: 6.5s;animation-delay: 0.6s;  }
        .particle-6  { left: 10%; top: 75%; width: 3px; height: 3px; animation-duration: 7.5s;animation-delay: 1.2s;  background: rgba(255,180,200,0.7); }
        .particle-7  { left: 42%; top: 92%; width: 4px; height: 4px; animation-duration: 8.5s;animation-delay: 0.1s;  }
        .particle-8  { left: 72%; top: 78%; width: 3px; height: 3px; animation-duration: 6.8s;animation-delay: 1.5s;  background: rgba(200,150,255,0.6); }
        .particle-9  { left: 22%; top: 86%; width: 5px; height: 5px; animation-duration: 7.2s;animation-delay: 0.9s;  }
        .particle-10 { left: 88%; top: 90%; width: 3px; height: 3px; animation-duration: 9.5s;animation-delay: 0.3s;  background: rgba(150,220,255,0.6); }
        .particle-11 { left: 55%; top: 78%; width: 4px; height: 4px; animation-duration: 6.2s;animation-delay: 1.8s;  }
        .particle-12 { left: 5%;  top: 95%; width: 3px; height: 3px; animation-duration: 8.8s;animation-delay: 0.7s;  background: rgba(255,200,150,0.6); }

        @keyframes float {
          0%   { transform: translateY(0)   scale(1);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.8; }
          100% { transform: translateY(-120vh) scale(0.5); opacity: 0; }
        }

        /* ---------- étoiles scintillantes ---------- */
        .stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .star {
          position: absolute;
          font-size: 14px;
          color: rgba(255,255,255,0.7);
          animation: twinkle ease-in-out infinite;
        }

        .star-1 { top: 18%; left: 20%; font-size: 10px; animation-duration: 2.1s; animation-delay: 0.3s;  color: rgba(200,160,255,0.8); }
        .star-2 { top: 25%; left: 75%; font-size: 16px; animation-duration: 1.8s; animation-delay: 0.9s;  }
        .star-3 { top: 65%; left: 14%; font-size: 12px; animation-duration: 2.4s; animation-delay: 0.1s;  color: rgba(150,210,255,0.8); }
        .star-4 { top: 70%; left: 82%; font-size: 10px; animation-duration: 1.6s; animation-delay: 1.2s;  }
        .star-5 { top: 12%; left: 55%; font-size: 14px; animation-duration: 2.2s; animation-delay: 0.6s;  color: rgba(255,190,210,0.8); }
        .star-6 { top: 55%; left: 88%; font-size: 11px; animation-duration: 2.0s; animation-delay: 1.5s;  }

        @keyframes twinkle {
          0%, 100% { opacity: 0.1; transform: scale(0.8) rotate(0deg); }
          50%       { opacity: 1;   transform: scale(1.2) rotate(20deg); }
        }


      `}</style>
    </div>
  );
}
