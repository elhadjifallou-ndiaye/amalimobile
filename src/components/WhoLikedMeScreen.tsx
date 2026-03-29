import { Heart, Clock } from 'lucide-react';
import Header from './Header';

interface WhoLikedMeScreenProps {
  notificationCount?: number;
  onNotificationClick?: () => void;
  onOpenPremium: () => void;
}

export default function WhoLikedMeScreen({ notificationCount, onNotificationClick }: WhoLikedMeScreenProps) {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <Header
        notificationCount={notificationCount}
        onNotificationClick={onNotificationClick}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="w-24 h-24 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <Heart className="w-12 h-12 text-rose-400" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Bientôt disponible
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            Qui vous a aimé
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xs">
            Découvrez les personnes qui ont liké votre profil. Cette fonctionnalité arrive très bientôt.
          </p>
        </div>
      </div>
    </div>
  );
}
