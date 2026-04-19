// Meta Pixel — wrapper typé pour tous les événements de suivi

declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
}

/** Vue de page — à appeler à chaque changement d'écran */
export function trackPageView() {
  fbq('track', 'PageView');
}

/** Inscription réussie (email envoyé, avant confirmation) */
export function trackLead() {
  fbq('track', 'Lead');
}

/** Profil entièrement complété → utilisateur prêt à matcher */
export function trackCompleteRegistration() {
  fbq('track', 'CompleteRegistration');
}

/** Ouverture de l'écran Premium → vue de l'offre */
export function trackViewContent(params?: { content_name?: string; value?: number; currency?: string }) {
  fbq('track', 'ViewContent', params ?? { content_name: 'Premium' });
}

/** Ouverture du modal de paiement → intention d'achat */
export function trackInitiateCheckout(params?: { value?: number; currency?: string; content_name?: string }) {
  fbq('track', 'InitiateCheckout', params ?? {});
}

/** Paiement réussi */
export function trackPurchase(params: { value: number; currency: string; content_name?: string }) {
  fbq('track', 'Purchase', params);
}
