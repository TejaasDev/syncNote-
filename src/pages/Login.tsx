import React, { useEffect, useState } from 'react';
import { signInWithGoogle, auth } from '../firebase';
import { LogIn, FileText, Share2, Zap } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const Login: React.FC = () => {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) return <Navigate to="/" />;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-10 bg-card border rounded-3xl shadow-2xl text-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="space-y-6 relative">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mx-auto shadow-xl rotate-3 hover:rotate-0 transition-transform duration-300">
            <FileText className="w-12 h-12 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter">SyncNote</h1>
            <p className="text-muted-foreground text-base sm:text-lg font-medium leading-tight">
              Collaborate in real-time. <br className="hidden sm:block" />
              Notes, tasks, and ideas in one place.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 relative">
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 text-left space-y-2 hover:bg-muted/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-primary" />
            </div>
            <p className="font-bold text-sm">Real-time Sharing</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Share links and edit together instantly with anyone.</p>
          </div>
          <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 text-left space-y-2 hover:bg-muted/50 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <p className="font-bold text-sm">Fast & Simple</p>
            <p className="text-xs text-muted-foreground leading-relaxed">Minimal design focused on speed and productivity.</p>
          </div>
        </div>

        <div className="space-y-4 relative">
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-lg hover:opacity-95 transition-all shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
          >
            <LogIn className="w-6 h-6" />
            <span>Sign In with Google</span>
          </button>

          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
            Secure authentication via Google
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
