import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';

interface NotificationToastProps {
  title: string;
  message: string;
  photo?: string | null;
  type: 'match' | 'like' | 'message' | 'other';
  onClose: () => void;
  onClick?: () => void;
}

export default function NotificationToast({ title, message, photo, type, onClose, onClick }: NotificationToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animation entrée
    setTimeout(() => setVisible(true), 50);
    // Auto-dismiss après 5s
    const timer = setTimeout(() => handleClose(), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleClick = () => {
    handleClose();
    onClick?.();
  };

  const bgColor = type === 'match'
    ? 'from-rose-500 to-amber-500'
    : type === 'like'
    ? 'from-rose-400 to-pink-500'
    : 'from-slate-700 to-slate-800';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex justify-center transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <button
        onClick={handleClick}
        className={`mx-4 w-full max-w-md bg-gradient-to-r ${bgColor} rounded-2xl shadow-2xl p-4 flex items-center gap-3 text-left`}
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/20 flex-shrink-0 flex items-center justify-center">
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <Heart className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Texte */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm truncate">{title}</p>
          <p className="text-white/90 text-xs truncate">{message}</p>
        </div>

        {/* Fermer */}
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </button>
    </div>
  );
}
