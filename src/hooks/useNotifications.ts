import { useState, useEffect, useRef } from 'react';
import { supabase, authService } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_like' | 'new_match' | 'new_message' | 'profile_view' | 'system';
  title: string;
  message: string;
  data?: {
    from_user_id?: string;
    from_user_name?: string;
    from_user_photo?: string;
    related_id?: string;
    [key: string]: any;
  };
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

function updateAppBadge(count: number) {
  if ('setAppBadge' in navigator) {
    if (count > 0) {
      (navigator as any).setAppBadge(count).catch(() => {});
    } else {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelId = useRef(`notifications-${Math.random().toString(36).slice(2)}`).current;

  const loadNotifications = async (uid?: string) => {
    try {
      const resolvedUid = uid ?? (await authService.getCurrentUser()).user?.id;
      if (!resolvedUid) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', resolvedUid)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Erreur chargement notifications:', error);
        return;
      }

      const unread = data?.filter(n => !n.is_read).length || 0;
      setNotifications(data || []);
      setUnreadCount(unread);
      updateAppBadge(unread);
      console.log('✅ Notifications chargées:', data?.length);
    } catch (error) {
      console.error('❌ Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Erreur mark as read:', error);
        return;
      }

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => {
        const next = Math.max(0, prev - 1);
        updateAppBadge(next);
        return next;
      });

      console.log('✅ Notification marquée comme lue');
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error('❌ Erreur mark all as read:', error);
        return;
      }

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
      updateAppBadge(0);

      console.log('✅ Toutes les notifications marquées comme lues');
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('❌ Erreur delete notification:', error);
        return;
      }

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      console.log('✅ Notification supprimée');
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  useEffect(() => {
    // Résoudre le userId : soit passé en prop, soit via authService
    const setup = async () => {
      const uid = userId ?? (await authService.getCurrentUser()).user?.id;
      if (!uid) return;

      // Charger les notifications initiales
      await loadNotifications(uid);

      // Abonnement realtime
      const subscription = supabase
        .channel(`${channelId}-${uid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => {
              const next = prev + 1;
              updateAppBadge(next);
              return next;
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: newNotification.data?.from_user_photo || '/logo.png',
              });
            }
          }
        )
        .subscribe();

      return () => { subscription.unsubscribe(); };
    };

    let cleanup: (() => void) | undefined;
    setup().then(fn => { cleanup = fn; });

    return () => { cleanup?.(); };
  }, [userId]); // ← se relance quand le userId change (ex: après login)

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: loadNotifications,
  };
}

// ✅ FONCTION FINALE CORRIGÉE
export async function createNotification(params: {
  userId: string;
  type: 'like' | 'super_like' | 'match' | 'message' | 'visit';  // ← Types d'entrée (anciens)
  title: string;
  message: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserPhoto?: string;
  relatedId?: string;
}) {
  try {
    console.log('📝 createNotification appelé avec:', params);

    // ✅ CONVERSION des types anciens → nouveaux
    let dbType: 'new_like' | 'new_match' | 'new_message' | 'profile_view' | 'system';
    
    switch (params.type) {
      case 'like':
      case 'super_like':
        dbType = 'new_like';
        break;
      case 'match':
        dbType = 'new_match';
        break;
      case 'message':
        dbType = 'new_message';
        break;
      case 'visit':
        dbType = 'profile_view';
        break;
      default:
        dbType = 'system';
    }

    console.log('🔄 Type converti:', params.type, '→', dbType);

    // Mettre les infos supplémentaires dans le champ `data` (JSONB)
    const notificationData: any = {};
    if (params.fromUserId) notificationData.from_user_id = params.fromUserId;
    if (params.fromUserName) notificationData.from_user_name = params.fromUserName;
    if (params.fromUserPhoto) notificationData.from_user_photo = params.fromUserPhoto;
    if (params.relatedId) notificationData.related_id = params.relatedId;

    console.log('📝 Données à insérer:', {
      user_id: params.userId,
      type: dbType,  // ✅ Type correct !
      title: params.title,
      message: params.message,
      data: notificationData,
      is_read: false,
    });

    const { data, error } = await supabase.from('notifications').insert({
      user_id: params.userId,
      type: dbType,  // ✅ Utilise le type converti
      title: params.title,
      message: params.message,
      data: notificationData,
      is_read: false,
    }).select();

    if (error) {
      console.error('❌ ERREUR CRÉATION NOTIFICATION:');
      console.error('   Code:', error.code);
      console.error('   Message:', error.message);
      console.error('   Details:', error.details);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ Notification créée avec succès:', data);
    return true;
  } catch (error) {
    console.error('❌ Exception lors de la création:', error);
    return false;
  }
}