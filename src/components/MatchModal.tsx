import { useEffect, useState } from 'react';
import { Heart, MessageCircle, X, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MatchModalProps {
  matchedUser: {
    id: string;
    name: string;
    photo: string | null;
    age: number;
    location: string;
  };
  currentUserPhoto: string | null;
  onClose: () => void;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
}

export default function MatchModal({ 
  matchedUser, 
  currentUserPhoto,
  onClose, 
  onSendMessage,
  onKeepSwiping 
}: MatchModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [heartsAnimation, setHeartsAnimation] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    setTimeout(() => setIsVisible(true), 100);
    
    // Animation des coeurs
    setTimeout(() => setHeartsAnimation(true), 800);
    
    // Vibration festive (si supporté)
    if (navigator.vibrate) {
      // Intro + crescendo + célébration finale
      navigator.vibrate([100, 50, 100, 50, 200, 100, 300, 100, 400]);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSendMessage = () => {
    setIsVisible(false);
    setTimeout(onSendMessage, 300);
  };

  const handleKeepSwiping = () => {
    setIsVisible(false);
    setTimeout(onKeepSwiping, 300);
  };

  // Génération de coeurs animés
  const hearts = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
      isVisible ? "opacity-100" : "opacity-0"
    )}>
      {/* Overlay avec blur */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose}
      />

      {/* Coeurs animés en fond */}
      {heartsAnimation && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {hearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute bottom-0 animate-float-up"
              style={{
                left: `${heart.left}%`,
                animationDelay: `${heart.delay}s`,
                animationDuration: `${heart.duration}s`,
              }}
            >
              <Heart className="w-8 h-8 text-rose-400 fill-rose-400 opacity-70" />
            </div>
          ))}
        </div>
      )}

      {/* Contenu principal */}
      <div className={cn(
        "relative bg-white rounded-3xl max-w-md w-full overflow-hidden transition-all duration-500 transform",
        isVisible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"
      )}>
        {/* Bouton fermer */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {/* En-tête avec dégradé */}
        <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 p-8 text-center relative overflow-hidden">
          {/* Étoiles brillantes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-32 h-32 text-white/20 animate-pulse" />
          </div>

          <div className="relative z-10">
            <div className={cn(
              "text-6xl mb-3 transition-all duration-700 transform",
              isVisible ? "scale-100 rotate-0" : "scale-0 rotate-180"
            )}>
              🎉
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              C'est un Match !
            </h2>
            <p className="text-white/90 text-sm">
              Vous vous plaisez tous les deux
            </p>
          </div>
        </div>

        {/* Photos des utilisateurs */}
        <div className="relative -mt-16 px-8 mb-6">
          <div className="flex items-center justify-center gap-4">
            {/* Photo utilisateur actuel */}
            <div className={cn(
              "relative transition-all duration-700 delay-200 transform",
              isVisible ? "translate-x-0 opacity-100" : "-translate-x-12 opacity-0"
            )}>
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-rose-500 to-amber-500">
                {currentUserPhoto ? (
                  <img
                    src={currentUserPhoto}
                    alt="Vous"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                    Vous
                  </div>
                )}
              </div>
            </div>

            {/* Icône coeur au milieu */}
            <div className={cn(
              "relative z-10 transition-all duration-700 delay-300 transform",
              isVisible ? "scale-100 rotate-0" : "scale-0 rotate-180"
            )}>
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                <Heart className="w-8 h-8 text-white fill-white" />
              </div>
            </div>

            {/* Photo de la personne matchée */}
            <div className={cn(
              "relative transition-all duration-700 delay-200 transform",
              isVisible ? "translate-x-0 opacity-100" : "translate-x-12 opacity-0"
            )}>
              <div className="w-28 h-28 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500">
                {matchedUser.photo ? (
                  <img
                    src={matchedUser.photo}
                    alt={matchedUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                    {matchedUser.name[0]}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Informations de la personne */}
        <div className="px-8 mb-6 text-center">
          <h3 className="text-2xl font-bold text-slate-900 mb-1">
            {matchedUser.name}, {matchedUser.age}
          </h3>
          <p className="text-slate-600 flex items-center justify-center gap-1">
            <span>📍</span>
            <span>{matchedUser.location}</span>
          </p>
        </div>

        {/* Messages motivants */}
        <div className="px-8 mb-6">
          <div className="bg-gradient-to-br from-amber-50 to-rose-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-slate-700 text-sm text-center leading-relaxed">
              <strong className="text-amber-700">💫 Félicitations !</strong> Vous avez tous les deux manifesté de l'intérêt. 
              C'est le moment de démarrer une belle conversation !
            </p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="px-8 pb-8 space-y-3">
          <button
            onClick={handleSendMessage}
            className="w-full py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl active:scale-98 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            Envoyer un message
          </button>
          
          <button
            onClick={handleKeepSwiping}
            className="w-full py-4 border-2 border-slate-300 text-slate-700 rounded-2xl font-semibold hover:bg-slate-50 transition-all active:scale-98"
          >
            Continuer à découvrir
          </button>
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
          }
        }
        
        .animate-float-up {
          animation: float-up 5s ease-in infinite;
        }
      `}</style>
    </div>
  );
}
