import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ThemeProvider, useTheme } from './components/ThemeContext';
import { LogIn, LogOut, Plus, FileText, CheckSquare, Settings, User as UserIcon, Menu, X, Share2, Trash2 } from 'lucide-react';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Dashboard from './pages/Dashboard';
import NotePage from './pages/NotePage';
import TodoPage from './pages/TodoPage';
import Login from './pages/Login';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(auth.currentUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        setUser(user);
        if (user) {
          const userDoc = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDoc);
          if (!docSnap.exists()) {
            await setDoc(userDoc, {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Anonymous',
              photoURL: user.photoURL || '',
              theme: 'light'
            });
          }
        }
      } catch (err) {
        console.error('Error in onAuthStateChanged:', err);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">SyncNote</span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/" className="text-sm font-bold hover:text-primary transition-colors tracking-tight">Dashboard</Link>
                <div className="flex items-center space-x-3 ml-4 pl-4 border-l">
                  <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-primary/20 shadow-sm">
                    <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <button onClick={handleLogout} className="p-2 rounded-xl hover:bg-muted transition-all active:scale-90" title="Logout">
                    <LogOut className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </>
            ) : (
              <button onClick={signInWithGoogle} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-all shadow-md active:scale-95">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>

          <button className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 z-40 bg-background pt-16"
          >
            <div className="p-6 space-y-6">
              {user ? (
                <>
                  <div className="flex items-center space-x-4 p-4 rounded-2xl bg-muted/50 border border-border/50">
                    <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-12 h-12 rounded-full border-2 border-primary/20" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold tracking-tight">{user.displayName}</p>
                      <p className="text-xs text-muted-foreground font-medium">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Link 
                      to="/" 
                      className="flex items-center space-x-3 p-4 rounded-xl hover:bg-muted transition-colors font-bold" 
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>Dashboard</span>
                    </Link>
                    <button 
                      onClick={handleLogout} 
                      className="flex items-center space-x-3 p-4 rounded-xl text-destructive hover:bg-destructive/10 transition-colors font-bold"
                    >
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span>Logout</span>
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={signInWithGoogle} className="w-full flex items-center justify-center space-x-3 p-5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg">
                  <LogIn className="w-6 h-6" />
                  <span>Sign In with Google</span>
                </button>
              )}
              
              <div className="pt-6 border-t border-border/50">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Themes</p>
                <div className="flex flex-wrap gap-3">
                  {(['light', 'dark', 'blue', 'green', 'purple'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={cn(
                        "w-10 h-10 rounded-full border-4 transition-all active:scale-90",
                        t === 'light' && "bg-white border-gray-100 shadow-sm",
                        t === 'dark' && "bg-gray-900 border-gray-800 shadow-sm",
                        t === 'blue' && "bg-blue-500 border-blue-400 shadow-sm",
                        t === 'green' && "bg-green-500 border-green-400 shadow-sm",
                        t === 'purple' && "bg-purple-500 border-purple-400 shadow-sm",
                        theme === t ? "scale-110 border-primary ring-4 ring-primary/10" : "opacity-80"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 SyncNote. Real-time collaborative notes & tasks.</p>
        </div>
      </footer>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/note/:id" element={<ProtectedRoute><NotePage /></ProtectedRoute>} />
            <Route path="/todo/:id" element={<ProtectedRoute><TodoPage /></ProtectedRoute>} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}
