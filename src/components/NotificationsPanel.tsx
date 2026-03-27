import { createPortal } from 'react-dom';
import { X, Heart, Users, MessageCircle, Calendar, Bell, Newspaper } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';

interface NotificationsPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onNotificationClick?: (n: Notification) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const typeConfig = {
  new_match: {
    icon: Users,
    color: 'text-rose-500',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    label: 'Match',
  },
  new_like: {
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
    label: 'Like',
  },
  new_message: {
    icon: MessageCircle,
    color: 'text-blue-500',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Message',
  },
  profile_view: {
    icon: Bell,
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
    label: 'Visite',
  },
  system: {
    icon: Calendar,
    color: 'text-amber-500',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Info',
  },
};

export default function NotificationsPanel({ notifications, onClose, onMarkAllRead, onNotificationClick }: NotificationsPanelProps) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const panel = (
    <>
      {/* Overlay semi-transparent */}
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 right-0 z-[9999] bg-white dark:bg-slate-900 shadow-2xl rounded-b-3xl overflow-hidden"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-rose-500 font-semibold hover:text-rose-600 transition-colors"
              >
                Tout lire
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 64px)' }}>
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">Aucune notification</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            <ul>
              {notifications.map((n) => {
                const cfg = typeConfig[n.type] ?? typeConfig.system;
                const Icon = cfg.icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => { onNotificationClick?.(n); onClose(); }}
                      className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 last:border-0 ${
                        !n.is_read ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''
                      }`}
                    >
                      {/* Avatar ou icône */}
                      <div className="relative flex-shrink-0">
                        {n.data?.from_user_photo ? (
                          <img
                            src={n.data.from_user_photo}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${cfg.bg}`}>
                            <Icon className={`w-5 h-5 ${cfg.color}`} />
                          </div>
                        )}
                        {/* Badge type — icône communauté si action community */}
                        {n.type === 'system' && n.data?.action === 'community_post' ? (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 border-2 border-white dark:border-slate-900">
                            <Newspaper className="w-2.5 h-2.5 text-blue-500" />
                          </div>
                        ) : n.type === 'system' && n.data?.action === 'community_comment' ? (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 border-2 border-white dark:border-slate-900">
                            <MessageCircle className="w-2.5 h-2.5 text-indigo-500" />
                          </div>
                        ) : (
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${cfg.bg} border-2 border-white dark:border-slate-900`}>
                            <Icon className={`w-2.5 h-2.5 ${cfg.color}`} />
                          </div>
                        )}
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                            {n.title}
                          </p>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 flex-shrink-0 mt-0.5">
                            {timeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>

                      {/* Point non lu */}
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-1.5" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(panel, document.body);
}
