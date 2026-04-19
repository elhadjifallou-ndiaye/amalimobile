import { useState, useEffect, useRef } from 'react';
import { ScreenType } from '@/types';
import { trackPageView } from '@/lib/pixel';
import DiscoveryScreen from '@/components/DiscoveryScreen';
import CommunityScreen from '@/components/CommunityScreen';
import MessagesScreen from '@/components/MessagesScreen';
import ProfileScreen from '@/components/ProfileScreen';
import WhoLikedMeScreen from '@/components/WhoLikedMeScreen';
import BottomNavigation from '@/components/BottomNavigation';
import AuthScreen from '@/components/AuthScreen';
import ProfileCompletion from '@/components/ProfileCompletion';
import SplashScreen from '@/components/SplashScreen';
import { authService, AuthUser, supabase } from '@/lib/supabase';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useStatusBar } from '@/hooks/useStatusBar';
import { useNotifications } from '@/hooks/useNotifications';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import NotificationToast from '@/components/NotificationToast';
import NotificationsPanel from '@/components/NotificationsPanel';
import GenderModal from '@/components/GenderModal';
import ResetPasswordScreen from '@/components/ResetPasswordScreen';

function AppContent() {
  const sessionStart = useRef(new Date().toISOString());
  const [activeScreen, setActiveScreen] = useState<ScreenType>('discovery');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isInChat, setIsInChat] = useState(false);
  const [messagesNotificationCount, setMessagesNotificationCount] = useState(0);
  const [likesNotificationCount, setLikesNotificationCount] = useState(0);
  const [initialConversationId, setInitialConversationId] = useState<string | null>(null);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [needsGender, setNeedsGender] = useState(false);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);
  const [activeToast, setActiveToast] = useState<{
    title: string;
    message: string;
    photo?: string | null;
    type: 'match' | 'like' | 'message' | 'other';
  } | null>(null);

  const { isDarkMode } = useTheme();
  // ✅ UNE SEULE instance centralisée — se connecte dès que user est connu
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id ?? undefined);

  // Meta Pixel — PageView à chaque changement d'écran
  useEffect(() => { trackPageView(); }, [activeScreen]);

  useStatusBar(isDarkMode);
  usePushNotifications(user?.id ?? null);

  // ✅ Badge messages calculé en permanence (peu importe l'écran actif)
  useEffect(() => {
    if (!user?.id) return;

    const calcBadge = async () => {
      const { data: convData } = await supabase
        .from('conversations')
        .select('user1_id, user2_id, last_message, user1_unread_count, user2_unread_count')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (!convData) return;

      const unread = convData.reduce((sum, c) => {
        return sum + (c.user1_id === user.id ? c.user1_unread_count : c.user2_unread_count);
      }, 0);
      const newMatches = convData.filter(c => !c.last_message).length;
      setMessagesNotificationCount(unread + newMatches);
    };

    calcBadge();

    const channel = supabase
      .channel(`app-conv-badge-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, calcBadge)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  // Badge likes reçus (nouveaux depuis la dernière visite de l'onglet)
  useEffect(() => {
    if (!user?.id) return;

    const calcLikesBadge = async () => {
      const since = sessionStart.current;
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .gte('created_at', since);
      setLikesNotificationCount(count ?? 0);
    };

    calcLikesBadge();

    const channel = supabase
      .channel(`app-likes-badge-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'likes',
        filter: `to_user_id=eq.${user.id}`,
      }, () => setLikesNotificationCount((n) => n + 1))
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  // Toast temps réel pour likes, matchs, messages
  useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[0];
    if (!latest.is_read && latest.created_at > sessionStart.current) {
      // Notifications communauté → badge seulement, pas de toast
      if (
        latest.type === 'system' &&
        (latest.data?.action === 'community_post' ||
          latest.data?.action === 'community_comment')
      ) {
        return;
      }
      const typeMap: Record<string, 'match' | 'like' | 'message' | 'other'> = {
        new_like: 'like',
        new_match: 'match',
        new_message: 'message',
      };
      setActiveToast({
        title: latest.title,
        message: latest.message,
        photo: latest.data?.from_user_photo,
        type: typeMap[latest.type] ?? 'other',
      });
    }
  }, [notifications[0]?.id]);

  useEffect(() => {
    checkUser();
    const { data: { subscription } } = authService.onAuthStateChange((user, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
        setUser(user);
        return;
      }
      setNeedsPasswordReset(false);
      setUser(user);
      if (user) checkProfileCompletion(user.id);
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  const checkUser = async () => {
    try {
      const { user } = await authService.getCurrentUser();
      setUser(user as AuthUser);
      if (user) await checkProfileCompletion(user.id);
    } catch (error) {
      console.error('❌ Erreur de vérification utilisateur:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkProfileCompletion = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('profile_completed, name, profile_photo_url, date_of_birth, gender')
        .eq('id', userId)
        .single();
      if (error) { setNeedsProfileCompletion(true); return; }
      const isValidGender = (g?: string) => g && g !== 'null' && g !== 'undefined';
      // Profil incomplet OU champs obligatoires manquants → ProfileCompletion
      if (
        !profile?.profile_completed ||
        !profile?.name?.trim() ||
        !profile?.profile_photo_url ||
        !profile?.date_of_birth ||
        !isValidGender(profile?.gender)
      ) {
        setNeedsProfileCompletion(true);
        return;
      }
    } catch {
      setNeedsProfileCompletion(true);
    }
  };

  const handleProfileComplete = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('profile_completed, name, profile_photo_url, date_of_birth, gender')
        .eq('id', user.id)
        .single();
      const isValidGender = (g?: string) => g && g !== 'null' && g !== 'undefined';
      const isComplete =
        profile?.profile_completed &&
        profile?.name?.trim() &&
        profile?.profile_photo_url &&
        profile?.date_of_birth &&
        isValidGender(profile?.gender);
      if (isComplete) setNeedsProfileCompletion(false);
      // sinon l'utilisateur reste sur ProfileCompletion
    }
  };

  const handleNavigateToMessages = (conversationId?: string) => {
    if (conversationId) setInitialConversationId(conversationId);
    setActiveScreen('messages');
  };

  // Clic sur une notification dans le panneau
  const handleNotificationClick = async (n: typeof notifications[0]) => {
    markAsRead(n.id);
    setShowNotificationsPanel(false);
    if (n.type === 'new_match' && n.data?.from_user_id) {
      // Trouver la conversation liée au match et naviguer vers messages
      const currentUser = user;
      if (currentUser) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${n.data.from_user_id}),and(user1_id.eq.${n.data.from_user_id},user2_id.eq.${currentUser.id})`)
          .maybeSingle();
        handleNavigateToMessages(conv?.id ?? undefined);
      }
    } else if (n.type === 'new_message') {
      setActiveScreen('messages');
    } else if (
      n.type === 'system' &&
      (n.data?.action === 'community_post' || n.data?.action === 'community_comment' || n.data?.action === 'community_like')
    ) {
      setActiveScreen('community');
    }
  };

  return (
    <>
      {/* Toast temps réel */}
      {activeToast && user && !showSplash && (
        <NotificationToast
          title={activeToast.title}
          message={activeToast.message}
          photo={activeToast.photo}
          type={activeToast.type}
          onClose={() => setActiveToast(null)}
          onClick={() => {
            setActiveToast(null);
            if (activeToast.type === 'message') setActiveScreen('messages');
            else if (activeToast.type === 'match') setShowNotificationsPanel(true);
          }}
        />
      )}

      {/* Panneau de notifications centralisé (accessible depuis tous les écrans) */}
      {showNotificationsPanel && user && !showSplash && (
        <NotificationsPanel
          notifications={notifications}
          onClose={() => setShowNotificationsPanel(false)}
          onMarkAllRead={markAllAsRead}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {!showSplash && loading && (
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-amber-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Chargement...</p>
          </div>
        </div>
      )}

      {!showSplash && needsPasswordReset && (
        <ResetPasswordScreen onComplete={() => {
          setNeedsPasswordReset(false);
          if (user) checkProfileCompletion(user.id);
        }} />
      )}

      {!showSplash && !loading && !user && !needsPasswordReset && (
        <AuthScreen onAuthenticated={checkUser} />
      )}

      {!showSplash && !loading && user && needsProfileCompletion && !needsPasswordReset && (
        <div className="relative">
          <ProfileCompletion
            userId={user.id}
            onComplete={handleProfileComplete}
            onSkipForNow={async () => {
              await authService.signOut();
              setUser(null);
              setNeedsProfileCompletion(false);
            }}
          />
          {import.meta.env.DEV && (
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
              <button onClick={() => { if (user) checkProfileCompletion(user.id); }}
                className="px-3 py-2 bg-blue-500 text-white text-xs rounded shadow">🐛 Debug</button>
              <button onClick={() => setNeedsProfileCompletion(false)}
                className="px-3 py-2 bg-red-500 text-white text-xs rounded shadow">⏭️ Force Skip</button>
            </div>
          )}
        </div>
      )}

      {needsGender && user && !showSplash && !loading && !needsProfileCompletion && (
        <GenderModal userId={user.id} onComplete={() => setNeedsGender(false)} />
      )}

      {!showSplash && !loading && user && !needsProfileCompletion && !needsPasswordReset && (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
          <div className="max-w-md mx-auto min-h-screen flex flex-col relative">
            {activeScreen === 'discovery' && (
              <DiscoveryScreen
                onNavigateToMessages={handleNavigateToMessages}
                notificationCount={unreadCount}
                onNotificationClick={() => setShowNotificationsPanel(true)}
              />
            )}
            {activeScreen === 'community' && (
              <CommunityScreen
                notificationCount={unreadCount}
                onNotificationClick={() => setShowNotificationsPanel(true)}
              />
            )}
            {activeScreen === 'messages' && (
              <MessagesScreen
                onChatStateChange={setIsInChat}
                initialConversationId={initialConversationId}
                onInitialConversationHandled={() => setInitialConversationId(null)}
              />
            )}
            {activeScreen === 'likes' && (
              <WhoLikedMeScreen
                notificationCount={unreadCount}
                onNotificationClick={() => setShowNotificationsPanel(true)}
                onOpenPremium={() => setActiveScreen('profile')}
                onNavigateToMessages={handleNavigateToMessages}
              />
            )}
            {activeScreen === 'profile' && <ProfileScreen />}

            {!isInChat && (
              <BottomNavigation
                activeScreen={activeScreen}
                onNavigate={(screen) => {
                  if (screen === 'likes') setLikesNotificationCount(0);
                  setActiveScreen(screen);
                }}
                messagesNotificationCount={messagesNotificationCount}
                likesNotificationCount={likesNotificationCount}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
