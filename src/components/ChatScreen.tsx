import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Image as ImageIcon, Smile, MoreVertical, Ban, Trash2, Flag, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/imageUtils';
import { cn } from '@/utils/cn';
import UserProfileScreen from './UserProfileScreen';

interface ChatScreenProps {
  conversation: {
    id: string;
    other_user_name: string;
    other_user_photo: string | null;
    user1_id: string;
    user2_id: string;
  };
  currentUserId: string;
  onBack: () => void;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio';
  media_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export default function ChatScreen({ conversation, currentUserId, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const otherUserId = conversation.user1_id === currentUserId 
    ? conversation.user2_id 
    : conversation.user1_id;

  useEffect(() => {
    loadMessages();
    markMessagesAsRead();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 300);

    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          
          if (newMsg.sender_id !== currentUserId) {
            markMessageAsRead(newMsg.id);
          }
          
          scrollToBottom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          setMessages(prev =>
            prev.map(msg => (msg.id === updatedMsg.id ? updatedMsg : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur chargement messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversation.id)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);

      const columnToUpdate = conversation.user1_id === currentUserId 
        ? 'user1_unread_count' 
        : 'user2_unread_count';

      await supabase
        .from('conversations')
        .update({ [columnToUpdate]: 0 })
        .eq('id', conversation.id);
    } catch (error) {
      console.error('Erreur marquage messages lus:', error);
    }
  };

  const markMessageAsRead = async (messageId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Erreur marquage message lu:', error);
    }
  };

  const handleBlock = async () => {
    const confirm = window.confirm(`Êtes-vous sûr de vouloir bloquer ${conversation.other_user_name} ?\n\nVous ne pourrez plus recevoir de messages de cette personne.`);
    
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUserId,
          blocked_id: otherUserId,
        });

      if (error) throw error;

      alert(`✅ ${conversation.other_user_name} a été bloqué(e)`);
      setShowMenu(false);
      onBack();
    } catch (error: any) {
      console.error('Erreur blocage:', error);
      if (error.code === '23505') {
        alert('Cet utilisateur est déjà bloqué');
      } else {
        alert('Erreur lors du blocage');
      }
    }
  };

  const handleDelete = async () => {
    const confirm = window.confirm(`Êtes-vous sûr de vouloir supprimer cette conversation avec ${conversation.other_user_name} ?\n\nCette action est irréversible.`);
    
    if (!confirm) return;

    try {
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversation.id);

      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversation.id);

      if (error) throw error;

      alert('✅ Conversation supprimée');
      setShowMenu(false);
      onBack();
    } catch (error) {
      console.error('Erreur suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleReport = async (reason: string, details: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: currentUserId,
          reported_user_id: otherUserId,
          reason: reason,
          details: details,
        });

      if (error) throw error;

      alert('✅ Utilisateur signalé. Notre équipe va examiner le signalement.');
      setShowReportModal(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Erreur signalement:', error);
      alert('Erreur lors du signalement');
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: messageContent,
      message_type: 'text',
      media_url: null,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const { data: insertedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: messageContent,
          message_type: 'text',
        })
        .select()
        .single();

      if (messageError) throw messageError;

      setMessages(prev => 
        prev.map(msg => msg.id === tempMessage.id ? insertedMessage : msg)
      );

      const unreadColumn = conversation.user1_id === currentUserId
        ? 'user2_unread_count'
        : 'user1_unread_count';

      const [{ data: currentConv }, { data: myProfile }] = await Promise.all([
        supabase.from('conversations').select(unreadColumn).eq('id', conversation.id).single(),
        supabase.from('profiles').select('name, profile_photo_url').eq('id', currentUserId).single(),
      ]);

      const currentUnread = (currentConv?.[unreadColumn as keyof typeof currentConv] as number | undefined) || 0;

      await Promise.all([
        supabase.from('conversations').update({
          last_message: messageContent.length > 50
            ? messageContent.substring(0, 50) + '...'
            : messageContent,
          last_message_at: new Date().toISOString(),
          [unreadColumn]: currentUnread + 1,
        }).eq('id', conversation.id),

        myProfile && supabase.from('notifications').insert({
          user_id: otherUserId,
          type: 'new_message',
          title: myProfile.name,
          message: messageContent.length > 60 ? messageContent.substring(0, 60) + '…' : messageContent,
          data: {
            from_user_id: currentUserId,
            from_user_name: myProfile.name,
            from_user_photo: myProfile.profile_photo_url,
            conversation_id: conversation.id,
          },
          is_read: false,
        }),
      ]);

      inputRef.current?.focus();
    } catch (error) {
      console.error('Erreur envoi message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageContent);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setSendingImage(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('Upload image: session expirée');
      setSendingImage(false);
      return;
    }

    const path = `chat/${conversation.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

    let uploadBlob: Blob;
    try {
      uploadBlob = await compressImage(file, 1200, 0.75);
    } catch {
      uploadBlob = file;
    }

    const { error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(path, uploadBlob, { contentType: 'image/jpeg', cacheControl: '31536000' });

    if (uploadError) {
      console.error('Upload image:', uploadError.message);
      setSendingImage(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
    const mediaUrl = urlData.publicUrl;

    const tempId = `temp-img-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversation_id: conversation.id,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: '📷 Photo',
      message_type: 'image',
      media_url: mediaUrl,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    scrollToBottom();

    const { data: inserted, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: '📷 Photo',
        message_type: 'image',
        media_url: mediaUrl,
      })
      .select()
      .single();

    if (!msgError && inserted) {
      setMessages(prev => prev.map(m => m.id === tempId ? inserted : m));

      const unreadColumn = conversation.user1_id === currentUserId ? 'user2_unread_count' : 'user1_unread_count';
      const { data: currentConv } = await supabase.from('conversations').select(unreadColumn).eq('id', conversation.id).single();
      const currentUnread = (currentConv?.[unreadColumn as keyof typeof currentConv] as number | undefined) || 0;
      await supabase.from('conversations').update({
        last_message: '📷 Photo',
        last_message_at: new Date().toISOString(),
        [unreadColumn]: currentUnread + 1,
      }).eq('id', conversation.id);
    } else {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }

    setSendingImage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long' 
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.created_at).toDateString();
    
    return currentDate !== prevDate;
  };

  if (showProfile) {
    return (
      <UserProfileScreen
        userId={otherUserId}
        onClose={() => setShowProfile(false)}
      />
    );
  }

  if (loading) {
    return (
      <div 
        className="fixed inset-0 z-[9999] flex flex-col h-screen bg-slate-50 dark:bg-slate-900"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-50 dark:bg-slate-900"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        height: '100dvh',
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>

        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl p-2 -m-2 transition-colors"
        >
          {conversation.other_user_photo ? (
            <img
              src={conversation.other_user_photo}
              alt={conversation.other_user_name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ display: conversation.other_user_photo ? 'none' : 'flex' }}
          >
            {conversation.other_user_name?.[0]?.toUpperCase() || '?'}
          </div>
          
          <div className="flex-1 min-w-0 text-left">
            <p className="font-semibold text-slate-900 dark:text-white truncate">
              {conversation.other_user_name || 'Utilisateur'}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">En ligne</p>
          </div>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2">
                <button
                  onClick={handleBlock}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <Ban className="w-5 h-5 text-orange-600" />
                  <span className="text-slate-900 dark:text-white font-medium">Bloquer</span>
                </button>
                
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <Trash2 className="w-5 h-5 text-red-600" />
                  <span className="text-slate-900 dark:text-white font-medium">Supprimer</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowReportModal(true);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                >
                  <Flag className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span className="text-slate-900 dark:text-white font-medium">Signaler</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showReportModal && (
        <ReportModal
          userName={conversation.other_user_name}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReport}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => {
          const isMe = message.sender_id === currentUserId;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDate = shouldShowDateSeparator(message, prevMessage);
          const isTemp = message.id.startsWith('temp-');

          return (
            <div key={message.id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300">
                    {formatDateSeparator(message.created_at)}
                  </div>
                </div>
              )}

              <div className={cn(
                "flex",
                isMe ? "justify-end" : "justify-start"
              )}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl overflow-hidden",
                  message.message_type === 'image' ? '' : 'px-4 py-2.5',
                  isMe
                    ? "bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-br-sm"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-bl-sm",
                  isTemp && "opacity-70"
                )}>
                  {message.message_type === 'image' && message.media_url ? (
                    <div>
                      <img
                        src={message.media_url}
                        alt="Photo"
                        className="max-w-[240px] max-h-[320px] object-cover rounded-2xl"
                        onClick={() => window.open(message.media_url!, '_blank')}
                      />
                      <div className={cn(
                        "flex items-center gap-1 px-3 pb-2 pt-1 text-xs",
                        isMe ? "text-white/80 justify-end" : "text-slate-500 dark:text-slate-400"
                      )}>
                        <span>{formatMessageTime(message.created_at)}</span>
                        {isMe && <span>{isTemp ? '⏱' : message.is_read ? '✓✓' : '✓'}</span>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                      <div className={cn(
                        "flex items-center gap-1 mt-1 text-xs",
                        isMe ? "text-white/80 justify-end" : "text-slate-500 dark:text-slate-400"
                      )}>
                        <span>{formatMessageTime(message.created_at)}</span>
                        {isMe && (
                          <span>{isTemp ? '⏱' : message.is_read ? '✓✓' : '✓'}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/20 dark:to-amber-900/20 rounded-full flex items-center justify-center mb-4">
              <Smile className="w-10 h-10 text-rose-500" />
            </div>
            <p className="text-slate-900 dark:text-white font-semibold mb-2">
              C'est un match ! 🎉
            </p>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Démarrez la conversation avec {conversation.other_user_name}
            </p>
          </div>
        )}
      </div>

      {/* Input */}
      <div 
        className="sticky bottom-0 z-10 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
        }}
      >
        <div className="flex items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSend}
          />
          <label
            htmlFor="chat-image-input"
            onClick={() => imageInputRef.current?.click()}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer",
              sendingImage
                ? "bg-slate-200 dark:bg-slate-700"
                : "hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
          >
            {sendingImage
              ? <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              : <ImageIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            }
          </label>

          <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 h-10 flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Écrivez un message..."
              inputMode="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="sentences"
              className="w-full bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0",
              newMessage.trim() && !sending
                ? "bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
            )}
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReportModalProps {
  userName: string;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}

function ReportModal({ userName, onClose, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reasons = [
    'Comportement inapproprié',
    'Harcèlement',
    'Contenu offensant',
    'Spam',
    'Faux profil',
    'Autre',
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Signaler {userName}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Merci de nous aider à maintenir une communauté sûre et respectueuse.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Raison du signalement
            </label>
            <div className="space-y-2">
              {reasons.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border-2 text-left transition-all",
                    reason === r
                      ? "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-white"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              Détails (optionnel)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Décrivez le problème..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!reason) {
                  alert('Veuillez sélectionner une raison');
                  return;
                }
                onSubmit(reason, details);
              }}
              disabled={!reason}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Signaler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}