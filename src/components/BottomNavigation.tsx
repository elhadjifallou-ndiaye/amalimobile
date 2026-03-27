import { Compass, Users, MessageCircle, User } from 'lucide-react';
import { ScreenType } from '@/types';
import { cn } from '@/utils/cn';

interface BottomNavigationProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  messagesNotificationCount?: number;
}

export default function BottomNavigation({ 
  activeScreen, 
  onNavigate,
  messagesNotificationCount = 0
}: BottomNavigationProps) {
  const navItems = [
    { id: 'discovery' as ScreenType, icon: Compass, label: 'Découvrir' },
    { id: 'community' as ScreenType, icon: Users, label: 'Communauté' },
    { 
      id: 'messages' as ScreenType, 
      icon: MessageCircle, 
      label: 'Messages',
      notificationCount: messagesNotificationCount
    },
    { id: 'profile' as ScreenType, icon: User, label: 'Profil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bottom-nav-safe">
      {/* ✅ TINDER STYLE: Fond dégradé avec flou */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/90 to-transparent dark:from-black/95 dark:via-black/90 backdrop-blur-lg"></div>
      
      <div className="relative max-w-md mx-auto px-4 py-1">
        <div className="flex items-center justify-around gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            const hasNotification = (item.notificationCount ?? 0) > 0;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="flex flex-col items-center justify-center relative"
              >
                {/* ✅ BOUTON CIRCULAIRE TINDER STYLE */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-br from-rose-500 to-amber-500 shadow-lg shadow-rose-500/30 scale-105"
                    : "bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 hover:scale-105"
                )}>
                  <div className="relative">
                    <Icon className={cn(
                      "w-5 h-5 transition-all",
                      isActive ? "text-white stroke-[2.5]" : "text-slate-600 dark:text-slate-400"
                    )} />

                    {/* Point rouge - s'affiche uniquement si messages non lus */}
                    {hasNotification && (
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-black shadow-sm" />
                    )}
                  </div>
                </div>
                
                {/* Label — visible uniquement si actif */}
                {isActive && (
                  <span className="text-[9px] font-medium mt-0.5 text-rose-500 dark:text-rose-400">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}