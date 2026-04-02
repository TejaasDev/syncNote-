import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, UserProfile } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const userDoc = doc(db, 'users', user.uid);
        const unsubscribeDoc = onSnapshot(userDoc, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            if (data.theme) {
              setThemeState(data.theme);
            }
          }
        });
        return () => unsubscribeDoc();
      } else {
        setThemeState('light');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'blue', 'green', 'purple');
    root.classList.add(theme);
    
    // Also handle dark mode specifically for system preferences if needed
    if (theme === 'dark') {
      root.classList.add('dark');
    }
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (auth.currentUser) {
      const userDoc = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDoc, { theme: newTheme });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
