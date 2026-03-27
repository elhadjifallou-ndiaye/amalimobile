import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: string; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('App crash:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl mb-4">💫</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Une erreur est survenue</h2>
          <p className="text-slate-500 text-sm mb-6">L'application a rencontré un problème. Veuillez réessayer.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-amber-500 text-white font-semibold rounded-2xl"
          >
            Relancer l'app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
