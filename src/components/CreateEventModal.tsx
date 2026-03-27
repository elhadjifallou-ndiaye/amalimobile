import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MapPin, Users, Clock, FileText } from 'lucide-react';
import { supabase, authService } from '@/lib/supabase';

interface CreateEventModalProps {
  onClose: () => void;
  onEventCreated: () => void;
}

export default function CreateEventModal({ onClose, onEventCreated }: CreateEventModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    maxParticipants: '',
    eventType: 'in-person',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventData.title.trim() || !eventData.date || !eventData.time || !eventData.location.trim()) {
      setError('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { user } = await authService.getCurrentUser();
      if (!user) {
        setError('Vous devez être connecté pour créer un événement');
        setLoading(false);
        return;
      }

      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);

      const { error: insertError } = await supabase.from('community_events').insert({
        title: eventData.title.trim(),
        description: eventData.description.trim(),
        event_date: eventDateTime.toISOString(),
        location: eventData.location.trim(),
        event_type: eventData.eventType,
        max_participants: eventData.maxParticipants ? parseInt(eventData.maxParticipants) : null,
        organizer_id: user.id,
        status: 'pending',
      });

      if (insertError) throw insertError;

      onEventCreated();
      onClose();
    } catch (err: any) {
      console.error('Erreur création événement:', err);
      setError('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-slate-900">

      {/* Header */}
      <div
        className="flex-shrink-0 bg-gradient-to-r from-rose-500 to-amber-500 px-5 flex items-center justify-between"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)', paddingBottom: '1rem' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Proposer un événement</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-all"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Scrollable form */}
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Titre */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Titre *
            </label>
            <input
              type="text"
              value={eventData.title}
              onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
              placeholder="Ex: Rencontre communautaire – Dakar"
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={eventData.description}
              onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              placeholder="Décrivez votre événement, le programme, les objectifs..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Date + Heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                Date *
              </label>
              <input
                type="date"
                value={eventData.date}
                onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent accent-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Heure *
              </label>
              <input
                type="time"
                value={eventData.time}
                onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent accent-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Type d'événement */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Type *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'in-person', label: '👥 En personne' },
                { value: 'online',    label: '💻 En ligne' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEventData({ ...eventData, eventType: opt.value })}
                  className={`px-4 py-3 rounded-2xl border-2 font-medium transition-all ${
                    eventData.eventType === opt.value
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {eventData.eventType === 'online' ? 'Lien / Plateforme *' : 'Lieu *'}
            </label>
            <input
              type="text"
              value={eventData.location}
              onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
              placeholder={eventData.eventType === 'online' ? 'Ex: Lien Zoom, Google Meet...' : 'Ex: Café Culturel, Almadies'}
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Max participants */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants max
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(optionnel)</span>
            </label>
            <input
              type="number"
              value={eventData.maxParticipants}
              onChange={(e) => setEventData({ ...eventData, maxParticipants: e.target.value })}
              placeholder="Ex: 30"
              min="1"
              className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          {/* Info modération */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              ℹ️ Votre événement sera examiné par notre équipe avant d'être publié.
            </p>
          </div>
        </div>

        {/* Footer — toujours visible */}
        <div
          className="flex-shrink-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 px-5 pt-3 space-y-2"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          {error && (
            <p className="text-sm text-red-500 text-center font-medium">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-semibold hover:from-rose-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi...' : 'Proposer'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return createPortal(modal, document.body);
}
