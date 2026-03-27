import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Récupérer la préférence sauvegardée
    const saved = localStorage.getItem('amali-dark-mode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Sinon, blanc par défaut
    return false;
  });

  useEffect(() => {
    // Sauvegarder la préférence
    localStorage.setItem('amali-dark-mode', JSON.stringify(isDarkMode));
    
    // Ajouter/retirer la classe 'dark' sur le HTML
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const setDarkModeValue = (value: boolean) => {
    setIsDarkMode(value);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode: setDarkModeValue }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}