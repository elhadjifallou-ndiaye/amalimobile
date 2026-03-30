import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Calendar, Send, Image, X, Users, MapPin, ChevronDown, ChevronUp, Loader2, MoreVertical, Pencil, Trash2, Flag, Check } from 'lucide-react';
import Header from './Header';
import SettingsScreen from './SettingsScreen';
import CreateEventModal from './CreateEventModal';
import { supabase, authService } from '@/lib/supabase';

/* ------------------------------------------------------------------ */
/* Types                                                                 */
/* ------------------------------------------------------------------ */
interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_photo: string | null;
  liked_by_me: boolean;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string;
  author_photo: string | null;
  parent_comment_id: string | null;
  likes_count: number;
  liked_by_me: boolean;
  replies: Comment[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                               */
/* ------------------------------------------------------------------ */
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

/* ------------------------------------------------------------------ */
/* Main component                                                        */
/* ------------------------------------------------------------------ */
interface CommunityScreenProps {
  notificationCount?: number;
  onNotificationClick?: () => void;
}

export default function CommunityScreen({ notificationCount = 0, onNotificationClick }: CommunityScreenProps = {}) {
  const [tab, setTab] = useState<'feed' | 'events'>('feed');
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);

  // Current user
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);

  // Feed
  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [newPostImagePreview, setNewPostImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Modals natifs remplacés (window.prompt/confirm bloqués iOS PWA)
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportingComment, setReportingComment] = useState<{ id: string; user_id: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);

  useEffect(() => {
    initUser();
  }, []);

  useEffect(() => {
    if (userId) loadPosts();
  }, [userId]);

  const initUser = async () => {
    const { user } = await authService.getCurrentUser();
    if (!user) return;
    setUserId(user.id);
    const { data } = await supabase
      .from('profiles')
      .select('name, profile_photo_url')
      .eq('id', user.id)
      .single();
    if (data) {
      setUserName(data.name || '');
      setUserPhoto(data.profile_photo_url || null);
    }
  };

  const loadPosts = async () => {
    setFeedLoading(true);
    try {
      const { data: postsData, error } = await supabase
        .from('community_posts')
        .select(`
          id, user_id, content, image_url, likes_count, comments_count, created_at,
          profiles(name, profile_photo_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Récupérer mes likes
      const { data: myLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId!);

      const likedSet = new Set((myLikes || []).map(l => l.post_id));

      const formatted: Post[] = (postsData || []).map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        content: p.content,
        image_url: p.image_url,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        created_at: p.created_at,
        author_name: p.profiles?.name || 'Anonyme',
        author_photo: p.profiles?.profile_photo_url || null,
        liked_by_me: likedSet.has(p.id),
      }));

      setPosts(formatted);
    } catch {
      // table inexistante : on affiche le feed vide sans planter
    } finally {
      setFeedLoading(false);
    }
  };

  /* ---------- Créer une publication ---------- */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPostImage(file);
    setNewPostImagePreview(URL.createObjectURL(file));
  };

  const handlePost = async () => {
    if (!newPostContent.trim() || !userId) return;
    setPosting(true);
    try {
      let imageUrl: string | null = null;

      if (newPostImage) {
        const ext = newPostImage.name.split('.').pop();
        const path = `posts/${userId}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('community-images')
          .upload(path, newPostImage);
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('community-images').getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }

      const { data, error } = await supabase
        .from('community_posts')
        .insert({
          user_id: userId,
          content: newPostContent.trim(),
          image_url: imageUrl,
          likes_count: 0,
          comments_count: 0,
        })
        .select(`id, user_id, content, image_url, likes_count, comments_count, created_at`)
        .single();

      if (error) throw error;

      const newPost: Post = {
        ...data,
        author_name: userName,
        author_photo: userPhoto,
        liked_by_me: false,
      };
      setPosts(prev => [newPost, ...prev]);
      setNewPostContent('');
      setNewPostImage(null);
      setNewPostImagePreview(null);

      // Notifier tous les autres utilisateurs qu'il y a une nouvelle publication
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id')
        .neq('id', userId)
        .eq('profile_completed', true)
        .limit(500);

      if (allUsers && allUsers.length > 0) {
        const notifRows = allUsers.map(u => ({
          user_id: u.id,
          type: 'system',
          title: '💬 Nouvelle publication',
          message: `${userName} a partagé quelque chose dans la communauté`,
          data: {
            action: 'community_post',
            post_id: data.id,
            from_user_id: userId,
            from_user_name: userName,
            from_user_photo: userPhoto,
          },
          is_read: false,
        }));
        await supabase.from('notifications').insert(notifRows);
      }
    } catch (err) {
      console.error('Erreur publication:', err);
    } finally {
      setPosting(false);
    }
  };

  /* ---------- Like ---------- */
  const handleLike = async (post: Post) => {
    if (!userId) return;

    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, liked_by_me: !p.liked_by_me, likes_count: p.liked_by_me ? p.likes_count - 1 : p.likes_count + 1 }
        : p
    ));

    if (post.liked_by_me) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', userId);
      await supabase.from('community_posts').update({ likes_count: Math.max(0, post.likes_count - 1) }).eq('id', post.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId });
      await supabase.from('community_posts').update({ likes_count: post.likes_count + 1 }).eq('id', post.id);

      // Notifier l'auteur du post (si ce n'est pas nous-même)
      if (post.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'new_like',
          title: "❤️ Nouveau j'aime",
          message: `${userName} a aimé votre publication`,
          data: {
            action: 'community_like',
            post_id: post.id,
            from_user_id: userId,
            from_user_name: userName,
            from_user_photo: userPhoto,
          },
          is_read: false,
        });
      }
    }
  };

  /* ---------- Commentaires ---------- */
  const toggleComments = async (postId: string) => {
    const next = new Set(expandedComments);
    if (next.has(postId)) {
      next.delete(postId);
    } else {
      next.add(postId);
      if (!comments[postId]) await loadComments(postId);
    }
    setExpandedComments(next);
  };

  const loadComments = async (postId: string) => {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`id, post_id, user_id, content, created_at, parent_comment_id, likes_count, profiles(name, profile_photo_url)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) return;

    // Récupérer les likes de l'utilisateur sur ces commentaires
    const commentIds = (data || []).map((c: any) => c.id);
    let likedCommentIds = new Set<string>();
    if (commentIds.length > 0 && userId) {
      const { data: myLikes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', commentIds);
      (myLikes || []).forEach((l: any) => likedCommentIds.add(l.comment_id));
    }

    const all: Comment[] = (data || []).map((c: any) => ({
      id: c.id,
      post_id: c.post_id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      parent_comment_id: c.parent_comment_id || null,
      likes_count: c.likes_count || 0,
      liked_by_me: likedCommentIds.has(c.id),
      author_name: c.profiles?.name || 'Anonyme',
      author_photo: c.profiles?.profile_photo_url || null,
      replies: [],
    }));

    // Organiser en arbre parent → replies
    const map = new Map<string, Comment>();
    all.forEach(c => map.set(c.id, c));
    const topLevel: Comment[] = [];
    all.forEach(c => {
      if (c.parent_comment_id && map.has(c.parent_comment_id)) {
        map.get(c.parent_comment_id)!.replies.push(c);
      } else {
        topLevel.push(c);
      }
    });

    setComments(prev => ({ ...prev, [postId]: topLevel }));
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content || !userId) return;

    setCommentLoading(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({ post_id: postId, user_id: userId, content })
        .select(`id, post_id, user_id, content, created_at`)
        .single();

      if (error) throw error;

      const newComment: Comment = {
        ...data,
        parent_comment_id: null,
        likes_count: 0,
        liked_by_me: false,
        replies: [],
        author_name: userName,
        author_photo: userPhoto,
      };

      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), newComment] }));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));

      // Incrémenter le compteur (correction bug)
      const post = posts.find(p => p.id === postId);
      const newCount = (post?.comments_count ?? 0) + 1;
      await supabase.from('community_posts').update({ comments_count: newCount }).eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));

      // Notifier l'auteur du post (si ce n'est pas nous-même)
      if (post && post.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'system',
          title: '💬 Nouveau commentaire',
          message: `${userName} a commenté votre publication`,
          data: {
            action: 'community_comment',
            post_id: postId,
            from_user_id: userId,
            from_user_name: userName,
            from_user_photo: userPhoto,
          },
          is_read: false,
        });
      }

      // Notifier les autres commentateurs du même post
      const { data: prevComments } = await supabase
        .from('post_comments')
        .select('user_id')
        .eq('post_id', postId)
        .neq('user_id', userId);

      if (prevComments && prevComments.length > 0) {
        const uniqueIds = [...new Set(prevComments.map(c => c.user_id))]
          .filter(uid => uid !== post?.user_id); // déjà notifié ci-dessus

        if (uniqueIds.length > 0) {
          await supabase.from('notifications').insert(
            uniqueIds.map(uid => ({
              user_id: uid,
              type: 'system',
              title: '💬 Nouveau commentaire',
              message: `${userName} a aussi commenté une publication`,
              data: {
                action: 'community_comment',
                post_id: postId,
                from_user_id: userId,
                from_user_name: userName,
                from_user_photo: userPhoto,
              },
              is_read: false,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Erreur commentaire:', err);
    } finally {
      setCommentLoading(prev => ({ ...prev, [postId]: false }));
    }
  };

  /* ---------- Liker un commentaire ---------- */
  const handleLikeComment = async (postId: string, comment: Comment) => {
    if (!userId) return;
    const liked = comment.liked_by_me;

    // Optimiste UI
    const updateTree = (list: Comment[]): Comment[] => list.map(c => {
      if (c.id === comment.id) return { ...c, liked_by_me: !liked, likes_count: liked ? c.likes_count - 1 : c.likes_count + 1 };
      return { ...c, replies: updateTree(c.replies) };
    });
    setComments(prev => ({ ...prev, [postId]: updateTree(prev[postId] || []) }));

    if (liked) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', userId);
      await supabase.from('post_comments').update({ likes_count: Math.max(0, comment.likes_count - 1) }).eq('id', comment.id);
    } else {
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: userId });
      await supabase.from('post_comments').update({ likes_count: comment.likes_count + 1 }).eq('id', comment.id);
      // Notifier l'auteur du commentaire
      if (comment.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: comment.user_id,
          type: 'system',
          title: '❤️ Commentaire aimé',
          message: `${userName} a aimé votre commentaire`,
          data: { action: 'community_comment', post_id: postId, from_user_id: userId, from_user_name: userName, from_user_photo: userPhoto },
          is_read: false,
        });
      }
    }
  };

  /* ---------- Répondre à un commentaire ---------- */
  const handleReplyComment = async (postId: string, parentComment: Comment, content: string) => {
    if (!content.trim() || !userId) return;

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content: content.trim(), parent_comment_id: parentComment.id, likes_count: 0 })
      .select(`id, post_id, user_id, content, created_at, parent_comment_id, likes_count`)
      .single();

    if (error) return;

    const newReply: Comment = {
      ...data,
      parent_comment_id: parentComment.id,
      likes_count: 0,
      liked_by_me: false,
      author_name: userName,
      author_photo: userPhoto,
      replies: [],
    };

    // Ajouter la réponse dans l'arbre
    const addReply = (list: Comment[]): Comment[] => list.map(c =>
      c.id === parentComment.id ? { ...c, replies: [...c.replies, newReply] } : { ...c, replies: addReply(c.replies) }
    );
    setComments(prev => ({ ...prev, [postId]: addReply(prev[postId] || []) }));

    // Incrémenter le compteur du post
    await supabase.from('community_posts').update({ comments_count: (posts.find(p => p.id === postId)?.comments_count ?? 0) + 1 }).eq('id', postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));

    // Notifier l'auteur du commentaire parent
    if (parentComment.user_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: parentComment.user_id,
        type: 'system',
        title: '↩️ Nouvelle réponse',
        message: `${userName} a répondu à votre commentaire`,
        data: { action: 'community_comment', post_id: postId, from_user_id: userId, from_user_name: userName, from_user_photo: userPhoto },
        is_read: false,
      });
    }
  };

  /* ---------- Signaler une publication ---------- */
  const handleReportPost = (post: Post) => {
    setReportReason('');
    setReportingPost(post);
  };

  /* ---------- Signaler un commentaire / réponse ---------- */
  const handleReportComment = (comment: Comment) => {
    setReportReason('');
    setReportingComment({ id: comment.id, user_id: comment.user_id });
  };

  const submitReport = async () => {
    const isPost = !!reportingPost;
    if (!reportReason.trim() || !userId || (!reportingPost && !reportingComment)) return;
    setReportSubmitting(true);
    const { error } = await supabase.from('reports').insert(isPost ? {
      reporter_id: userId,
      reported_user_id: reportingPost!.user_id,
      type: 'post',
      post_id: reportingPost!.id,
      reason: reportReason.trim(),
      status: 'pending',
    } : {
      reporter_id: userId,
      reported_user_id: reportingComment!.user_id,
      type: 'comment',
      comment_id: reportingComment!.id,
      reason: reportReason.trim(),
      status: 'pending',
    });
    setReportSubmitting(false);
    if (error) { console.error('Report error:', error.message); return; }
    setReportingPost(null);
    setReportingComment(null);
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  /* ---------- Supprimer une publication ---------- */
  const handleDeletePost = (postId: string) => {
    if (!userId) return;
    setConfirmDeletePostId(postId);
  };

  const confirmDeletePost = async () => {
    if (!confirmDeletePostId || !userId) return;
    await supabase.from('community_posts').delete().eq('id', confirmDeletePostId).eq('user_id', userId);
    setPosts(prev => prev.filter(p => p.id !== confirmDeletePostId));
    setConfirmDeletePostId(null);
  };

  /* ---------- Modifier une publication ---------- */
  const handleEditPost = async (postId: string, newContent: string) => {
    if (!userId || !newContent.trim()) return;
    const { error } = await supabase
      .from('community_posts')
      .update({ content: newContent.trim() })
      .eq('id', postId)
      .eq('user_id', userId);
    if (!error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: newContent.trim() } : p));
    }
  };

  /* ------------------------------------------------------------------ */
  if (showSettings) return <SettingsScreen onClose={() => setShowSettings(false)} />;

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onNotificationClick={onNotificationClick}
        notificationCount={notificationCount}
      />

      {showCreateEvent && (
        <CreateEventModal onClose={() => setShowCreateEvent(false)} onEventCreated={() => {}} />
      )}

      {/* Toast succès signalement */}
      {reportSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          Merci, votre signalement a été envoyé.
        </div>
      )}

      {/* Modal signalement */}
      {(reportingPost || reportingComment) && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => { setReportingPost(null); setReportingComment(null); }}>
          <div className="bg-white dark:bg-slate-800 rounded-t-3xl p-5 w-full max-w-sm" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 text-center">Pourquoi signalez-vous ?</h3>
            <div className="space-y-2">
              {[
                { value: 'inappropriate_content', label: 'Contenu inapproprié' },
                { value: 'fake_profile', label: 'Faux profil' },
                { value: 'harassment', label: 'Harcèlement' },
                { value: 'spam', label: 'Spam' },
                { value: 'other', label: 'Autre' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setReportReason(value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-medium transition-all border-2 ${
                    reportReason === value
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={submitReport}
              disabled={!reportReason || reportSubmitting}
              className="w-full mt-4 py-3.5 bg-orange-500 text-white rounded-2xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {reportSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirmer le signalement
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDeletePostId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Supprimer la publication ?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeletePostId(null)}
                className="flex-1 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-medium text-sm"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeletePost}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-medium text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex-shrink-0 flex bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
        style={{ marginTop: 'calc(max(env(safe-area-inset-top), 12px) + 60px)' }}
      >
        {(['feed', 'events'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${
              tab === t
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 dark:text-slate-400'
            }`}
          >
            {t === 'feed' ? '💬 Publications' : '📅 Événements'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>

        {/* ---- FEED ---- */}
        {tab === 'feed' && (
          <div className="max-w-lg mx-auto px-4 py-4 space-y-4 pb-24">

            {/* Créer une publication */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-2.5">
              <div className="flex items-center gap-2">
                {userPhoto ? (
                  <img src={userPhoto} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {userName?.[0] || '?'}
                  </div>
                )}
                <input
                  type="text"
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePost()}
                  placeholder="Partagez quelque chose..."
                  className="flex-1 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50 dark:bg-slate-700 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="text-slate-400 hover:text-rose-400 transition-colors flex-shrink-0"
                >
                  <Image className="w-4 h-4" />
                </button>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <button
                  onClick={handlePost}
                  disabled={!newPostContent.trim() || posting}
                  className="flex-shrink-0 p-1.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-full disabled:opacity-40 transition-all active:scale-90"
                >
                  {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              {/* Préview image */}
              {newPostImagePreview && (
                <div className="relative mt-2 rounded-xl overflow-hidden">
                  <img src={newPostImagePreview} className="w-full max-h-32 object-cover rounded-xl" alt="" />
                  <button
                    onClick={() => { setNewPostImage(null); setNewPostImagePreview(null); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Liste des posts */}
            {feedLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-3">✨</div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">Soyez le premier à publier !</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Partagez vos pensées avec la communauté</p>
              </div>
            ) : (
              posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  isOwner={post.user_id === userId}
                  onLike={() => handleLike(post)}
                  onToggleComments={() => toggleComments(post.id)}
                  showComments={expandedComments.has(post.id)}
                  comments={comments[post.id] || []}
                  commentInput={commentInputs[post.id] || ''}
                  onCommentChange={v => setCommentInputs(prev => ({ ...prev, [post.id]: v }))}
                  onCommentSubmit={() => handleComment(post.id)}
                  commentSubmitting={!!commentLoading[post.id]}
                  userPhoto={userPhoto}
                  onDelete={() => handleDeletePost(post.id)}
                  onEdit={(newContent) => handleEditPost(post.id, newContent)}
                  onReport={() => handleReportPost(post)}
                  onReportComment={(comment) => handleReportComment(comment)}
                  onLikeComment={(comment) => handleLikeComment(post.id, comment)}
                  onReplyComment={(parentComment, content) => handleReplyComment(post.id, parentComment, content)}
                  currentUserId={userId}
                />
              ))
            )}
          </div>
        )}

        {/* ---- ÉVÉNEMENTS ---- */}
        {tab === 'events' && (
          <div className="max-w-lg mx-auto px-4 py-4 pb-24 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Événements à venir</h3>
            </div>

            <EventCard title="Rencontre communautaire - Dakar" date="Samedi 30 Nov, 15h00" participants={24} location="Café Culturel, Almadies" />
            <EventCard title="Discussion : Valeurs familiales" date="Dimanche 1 Déc, 17h00" participants={18} location="En ligne (Zoom)" />

            <button
              onClick={() => setShowCreateEvent(true)}
              className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-rose-400 hover:text-rose-500 transition-all font-medium"
            >
              + Proposer un événement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PostCard                                                              */
/* ------------------------------------------------------------------ */
interface PostCardProps {
  post: Post;
  isOwner: boolean;
  onLike: () => void;
  onToggleComments: () => void;
  showComments: boolean;
  comments: Comment[];
  commentInput: string;
  onCommentChange: (v: string) => void;
  onCommentSubmit: () => void;
  commentSubmitting: boolean;
  userPhoto: string | null;
  onDelete: () => void;
  onEdit: (newContent: string) => void;
  onReport: () => void;
  onReportComment: (comment: Comment) => void;
  onLikeComment: (comment: Comment) => void;
  onReplyComment: (parentComment: Comment, content: string) => void;
  currentUserId: string | null;
}

function PostCard({ post, isOwner, onLike, onToggleComments, showComments, comments, commentInput, onCommentChange, onCommentSubmit, commentSubmitting, userPhoto, onDelete, onEdit, onReport, onReportComment, onLikeComment, onReplyComment }: PostCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== post.content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Header post */}
      <div className="flex items-center gap-3 p-4 pb-3">
        {post.author_photo ? (
          <img src={post.author_photo} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex items-center justify-center text-white font-bold flex-shrink-0">
            {post.author_name?.[0] || '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-white text-sm">{post.author_name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(post.created_at)}</p>
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-9 z-20 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden min-w-[140px]">
                {isOwner ? (
                  <>
                    <button
                      onClick={() => { setIsEditing(true); setEditContent(post.content); setShowMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-blue-500" />
                      Modifier
                    </button>
                    <button
                      onClick={() => { setShowMenu(false); onDelete(); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setShowMenu(false); onReport(); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    Signaler
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="px-4 pb-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              className="w-full text-sm text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-500 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setIsEditing(false); setEditContent(post.content); }}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="px-3 py-1.5 text-xs text-white bg-gradient-to-r from-rose-500 to-amber-500 rounded-lg disabled:opacity-40 transition-all"
              >
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <img src={post.image_url} className="w-full max-h-80 object-cover" alt="" />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-all active:scale-90 ${
            post.liked_by_me ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400 hover:text-rose-400'
          }`}
        >
          <Heart className={`w-5 h-5 ${post.liked_by_me ? 'fill-rose-500' : ''}`} />
          {post.likes_count > 0 && post.likes_count}
        </button>

        <button
          onClick={onToggleComments}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-blue-400 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {post.comments_count > 0 && post.comments_count}
          {showComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Section commentaires */}
      {showComments && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 space-y-3 bg-slate-50 dark:bg-slate-700/50">
          {comments.map(c => (
            <div key={c.id}>
              {/* Commentaire parent */}
              <div className="flex gap-2.5">
                {c.author_photo ? (
                  <img src={c.author_photo} className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                    {c.author_name?.[0] || '?'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="bg-white dark:bg-slate-700 rounded-xl px-3 py-2">
                    <p className="text-xs font-semibold text-slate-800 dark:text-white">{c.author_name}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{c.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 px-1">
                    <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                    <button
                      onClick={() => onLikeComment(c)}
                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${c.liked_by_me ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${c.liked_by_me ? 'fill-rose-500' : ''}`} />
                      {c.likes_count > 0 && c.likes_count}
                    </button>
                    <button
                      onClick={() => { setReplyingToId(replyingToId === c.id ? null : c.id); setReplyText(''); }}
                      className="text-xs text-slate-400 hover:text-blue-400 font-medium transition-colors"
                    >
                      Répondre
                    </button>
                    <button
                      onClick={() => onReportComment(c)}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 font-medium transition-colors"
                    >
                      <Flag className="w-3 h-3" />
                      Signaler
                    </button>
                  </div>
                  {/* Input réponse */}
                  {replyingToId === c.id && (
                    <div className="flex gap-2 mt-2 items-center">
                      <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-600">
                        <input
                          type="text"
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) { onReplyComment(c, replyText); setReplyText(''); setReplyingToId(null); } }}
                          placeholder={`Répondre à ${c.author_name}...`}
                          autoFocus
                          className="flex-1 text-xs bg-transparent text-slate-800 dark:text-white placeholder-slate-400 outline-none"
                        />
                        <button
                          onClick={() => { if (replyText.trim()) { onReplyComment(c, replyText); setReplyText(''); setReplyingToId(null); } }}
                          disabled={!replyText.trim()}
                          className="text-rose-500 disabled:opacity-30"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Réponses */}
                  {c.replies.length > 0 && (
                    <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-600">
                      {c.replies.map(r => (
                        <div key={r.id} className="flex gap-2">
                          {r.author_photo ? (
                            <img src={r.author_photo} className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5" alt="" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                              {r.author_name?.[0] || '?'}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="bg-white dark:bg-slate-700 rounded-xl px-3 py-1.5">
                              <p className="text-xs font-semibold text-slate-800 dark:text-white">{r.author_name}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{r.content}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 px-1">
                              <span className="text-xs text-slate-400">{timeAgo(r.created_at)}</span>
                              <button
                                onClick={() => onLikeComment(r)}
                                className={`flex items-center gap-1 text-xs font-medium transition-colors ${r.liked_by_me ? 'text-rose-500' : 'text-slate-400 hover:text-rose-400'}`}
                              >
                                <Heart className={`w-3 h-3 ${r.liked_by_me ? 'fill-rose-500' : ''}`} />
                                {r.likes_count > 0 && r.likes_count}
                              </button>
                              <button
                                onClick={() => onReportComment(r)}
                                className="flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 font-medium transition-colors"
                              >
                                <Flag className="w-3 h-3" />
                                Signaler
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Saisir un commentaire */}
          <div className="flex gap-2 items-center pt-1">
            {userPhoto ? (
              <img src={userPhoto} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-amber-400 flex-shrink-0" />
            )}
            <div className="flex-1 flex items-center gap-2 bg-white dark:bg-slate-700 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-600">
              <input
                type="text"
                value={commentInput}
                onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onCommentSubmit()}
                placeholder="Écrire un commentaire..."
                className="flex-1 text-xs bg-transparent text-slate-800 dark:text-white placeholder-slate-400 outline-none"
              />
              <button
                onClick={onCommentSubmit}
                disabled={!commentInput.trim() || commentSubmitting}
                className="text-rose-500 disabled:opacity-30 transition-opacity"
              >
                {commentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* EventCard                                                             */
/* ------------------------------------------------------------------ */
function EventCard({ title, date, participants, location }: { title: string; date: string; participants: number; location: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="font-semibold text-slate-900 dark:text-white flex-1 pr-2">{title}</p>
        <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs text-slate-600 dark:text-slate-300 flex-shrink-0">
          <Users className="w-3.5 h-3.5" />
          {participants}
        </div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{date}</p>
      <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
        <MapPin className="w-3.5 h-3.5" />
        {location}
      </div>
    </div>
  );
}
