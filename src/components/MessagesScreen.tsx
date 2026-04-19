import { useState, useEffect } from 'react';
import { supabase, authService } from '@/lib/supabase';
import { withTransform } from '@/lib/imageUtils';
import ChatScreen from './ChatScreen';
import UserProfileScreen from './UserProfileScreen';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search } from 'lucide-react';

interface Match {
  id: string;
  conversationId: string;
  user1_id: string;
  user2_id: string;
  matched_at: string;
  otherUser: {
    id: string;
    name: string;
    profile_photo_url: string;
    age: number;
  };
}

interface Conversation {
  id: string;
  match_id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string;
  user1_unread_count: number;
  user2_unread_count: number;
  otherUser: {
    id: string;
    name: string;
    profile_photo_url: string;
    age: number;
  };
}

interface ChatScreenConversation {
  id: string;
  other_user_name: string;
  other_user_photo: string | null;
  user1_id: string;
  user2_id: string;
}

interface MessagesScreenProps {
  onChatStateChange?: (isInChat: boolean) => void;
  onNotificationCountChange?: (count: number) => void;
  initialConversationId?: string | null;
  onInitialConversationHandled?: () => void;
}

export default function MessagesScreen({ onChatStateChange, onNotificationCountChange, initialConversationId, onInitialConversationHandled }: MessagesScreenProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatScreenConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    onChatStateChange?.(selectedConversation !== null);
  }, [selectedConversation, onChatStateChange]);

  useEffect(() => {
    const totalUnread = conversations.reduce((sum, conv) => {
      const unreadCount = conv.user1_id === userId
        ? conv.user1_unread_count
        : conv.user2_unread_count;
      return sum + unreadCount;
    }, 0);

    const totalNotifications = totalUnread + newMatches.length;
    onNotificationCountChange?.(totalNotifications);
  }, [conversations, newMatches, userId, onNotificationCountChange]);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('messages-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => loadData())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  // Ouvrir automatiquement la conversation après un match
  useEffect(() => {
    if (!initialConversationId || loading) return;

    const allConvs = [...conversations, ...newMatches.map(m => ({
      id: m.conversationId,
      match_id: m.id,
      user1_id: m.user1_id,
      user2_id: m.user2_id,
      last_message: null,
      last_message_at: m.matched_at,
      user1_unread_count: 0,
      user2_unread_count: 0,
      otherUser: m.otherUser,
    }))];

    const target = allConvs.find(c => c.id === initialConversationId);
    if (target) {
      setSelectedConversation(convertToChatScreenFormat(target as any));
      onInitialConversationHandled?.();
    }
  }, [initialConversationId, loading, conversations, newMatches]);

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const loadData = async () => {
    try {
      const { user } = await authService.getCurrentUser();
      if (!user) return;

      setUserId(user.id);

      // Étape 1 : Charger toutes les conversations (sans join FK)
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (convError) console.error('❌ Erreur conversations:', convError);

      if (!convData?.length) {
        setConversations([]);
        setNewMatches([]);
        setLoading(false);
        return;
      }

      // Étape 2 : Récupérer les profils des autres utilisateurs
      const otherUserIds = [...new Set(
        convData.map(conv => conv.user1_id === user.id ? conv.user2_id : conv.user1_id)
      )];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, profile_photo_url, date_of_birth')
        .in('id', otherUserIds);

      if (profilesError) console.error('❌ Erreur profils:', profilesError);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Étape 3 : Construire les conversations avec les données de profil
      const allConvs: Conversation[] = convData.map(conv => {
        const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
        const profile = profilesMap.get(otherId);
        return {
          ...conv,
          otherUser: {
            id: otherId,
            name: profile?.name || 'Utilisateur',
            profile_photo_url: profile?.profile_photo_url || '',
            age: profile?.date_of_birth ? calculateAge(profile.date_of_birth) : 0,
          },
        };
      });

      // "Nouveaux Matchs" = conversations SANS message (match récent, pas encore de conversation)
      const noMsgConvs = allConvs.filter(c => !c.last_message);
      const withMsgConvs = allConvs.filter(c => !!c.last_message);

      // Transformer les convs sans message en format "Match"
      const matchList: Match[] = noMsgConvs.map(conv => ({
        id: conv.match_id || conv.id,
        conversationId: conv.id,
        user1_id: conv.user1_id,
        user2_id: conv.user2_id,
        matched_at: conv.last_message_at,
        otherUser: conv.otherUser,
      }));

      setNewMatches(matchList);
      setConversations(withMsgConvs);
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const convertToChatScreenFormat = (conv: Conversation): ChatScreenConversation => ({
    id: conv.id,
    other_user_name: conv.otherUser.name,
    other_user_photo: conv.otherUser.profile_photo_url,
    user1_id: conv.user1_id,
    user2_id: conv.user2_id,
  });

  const handleOpenChat = (conversation: Conversation) => {
    setSelectedConversation(convertToChatScreenFormat(conversation));
  };

  const handleOpenNewMatch = async (match: Match) => {
    // On a déjà l'ID de conversation, on l'ouvre directement
    const conv: Conversation = {
      id: match.conversationId,
      match_id: match.id,
      user1_id: match.user1_id,
      user2_id: match.user2_id,
      last_message: null,
      last_message_at: match.matched_at,
      user1_unread_count: 0,
      user2_unread_count: 0,
      otherUser: match.otherUser,
    };
    setSelectedConversation(convertToChatScreenFormat(conv));
  };

  // Liste unifiée : matchs sans message + conversations avec message
  const allItems: Array<{
    id: string;
    conversationId: string;
    user1_id: string;
    user2_id: string;
    last_message: string | null;
    last_message_at: string;
    unreadCount: number;
    otherUser: { id: string; name: string; profile_photo_url: string; age: number };
    isNewMatch: boolean;
  }> = [
    ...newMatches.map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      user1_id: m.user1_id,
      user2_id: m.user2_id,
      last_message: null,
      last_message_at: m.matched_at,
      unreadCount: 0,
      otherUser: m.otherUser,
      isNewMatch: true,
    })),
    ...conversations.map(c => ({
      id: c.id,
      conversationId: c.id,
      user1_id: c.user1_id,
      user2_id: c.user2_id,
      last_message: c.last_message,
      last_message_at: c.last_message_at,
      unreadCount: c.user1_id === userId ? c.user1_unread_count : c.user2_unread_count,
      otherUser: c.otherUser,
      isNewMatch: false,
    })),
  ].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
   .filter(item =>
    item.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (viewingProfileUserId) {
    return (
      <UserProfileScreen
        userId={viewingProfileUserId}
        onClose={() => setViewingProfileUserId(null)}
      />
    );
  }

  if (selectedConversation) {
    return (
      <ChatScreen
        conversation={selectedConversation}
        currentUserId={userId}
        onBack={() => {
          setSelectedConversation(null);
          loadData();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-slate-900 flex flex-col">
      {/* Barre de recherche + safe area top */}
      <div
        className="flex-shrink-0 px-4 bg-white dark:bg-slate-900"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          paddingBottom: '12px',
        }}
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-full text-sm text-slate-700 dark:text-white placeholder-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Liste unifiée */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)' }}>
        <div>
          {/* Message de bienvenue Amali — toujours affiché */}
          <div className="flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src="/assets/logoamali.png" alt="Amali" className="w-10 h-10 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-slate-900 dark:text-white">Amali</span>
                <span className="text-xs text-slate-400">Maintenant</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Bonjour 👋 C'est ici que vous verrez vos matchs et pourrez leur envoyer des messages.
              </p>
            </div>
          </div>

          {allItems.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                Commencez à matcher pour démarrer des conversations !
              </p>
            </div>
          )}

          {allItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.isNewMatch) {
                    handleOpenNewMatch({
                      id: item.id,
                      conversationId: item.conversationId,
                      user1_id: item.user1_id,
                      user2_id: item.user2_id,
                      matched_at: item.last_message_at,
                      otherUser: item.otherUser,
                    });
                  } else {
                    handleOpenChat({
                      id: item.conversationId,
                      match_id: '',
                      user1_id: item.user1_id,
                      user2_id: item.user2_id,
                      last_message: item.last_message,
                      last_message_at: item.last_message_at,
                      user1_unread_count: item.user1_id === userId ? item.unreadCount : 0,
                      user2_unread_count: item.user2_id === userId ? item.unreadCount : 0,
                      otherUser: item.otherUser,
                    });
                  }
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {item.otherUser.profile_photo_url ? (
                    <img
                      src={withTransform(item.otherUser.profile_photo_url, 112)}
                      alt={item.otherUser.name}
                      className="w-14 h-14 rounded-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        {item.otherUser.name[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  {item.unreadCount > 0 && (
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">{item.unreadCount}</span>
                    </div>
                  )}
                </div>

                {/* Texte */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className={`font-semibold text-slate-900 dark:text-white truncate ${item.unreadCount > 0 ? 'font-bold' : ''}`}>
                      {item.otherUser.name}{item.otherUser.age ? `, ${item.otherUser.age}` : ''}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatDistanceToNow(new Date(item.last_message_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${item.unreadCount > 0 ? 'font-semibold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.last_message || 'Démarrez la conversation...'}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
