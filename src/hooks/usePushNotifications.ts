import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer;
}

export function usePushNotifications(userId: string | null) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!userId || registeredRef.current) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    const setup = async () => {
      try {
        // Enregistrer le service worker
        const registration = await navigator.serviceWorker.ready;

        // Vérifier si déjà souscrit
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          await saveSubscription(userId, existing);
          registeredRef.current = true;
          return;
        }

        // Demander la permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // S'abonner
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await saveSubscription(userId, subscription);
        registeredRef.current = true;

        // Écouter les messages du service worker (click sur notif)
        navigator.serviceWorker.addEventListener('message', handleSwMessage);
      } catch (err) {
        console.error('Push setup error:', err);
      }
    };

    setup();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    };
  }, [userId]);
}

function handleSwMessage(event: MessageEvent) {
  if (event.data?.type === 'NOTIFICATION_CLICK') {
    const { data } = event.data;
    // Rediriger selon le type de notif (géré par le composant parent via window event)
    window.dispatchEvent(new CustomEvent('push-notification-click', { detail: data }));
  }
}

async function saveSubscription(userId: string, subscription: PushSubscription) {
  const sub = subscription.toJSON();
  await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: (sub.keys as Record<string, string>)?.p256dh,
      auth: (sub.keys as Record<string, string>)?.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,endpoint' }
  );
}
