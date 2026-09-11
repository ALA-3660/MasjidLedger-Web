import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleResetCache = () => {
    try {
      localStorage.removeItem('ml_token');
      localStorage.removeItem('ml_user_id');
      localStorage.removeItem('ml_mosque_id');
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div id="error-boundary-fallback" className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে</h1>
                <p className="text-xs text-slate-400 mt-1">An unexpected application error occurred</p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs font-mono text-amber-200/90 overflow-x-auto max-h-40">
              {this.state.error?.message || 'Unknown component error'}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                id="btn-error-reload"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium text-sm transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                পেজ পুনরায় লোড করুন
              </button>
              <button
                id="btn-error-reset-cache"
                onClick={this.handleResetCache}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                ক্যাশ রিসেট ও রিফ্রেশ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
