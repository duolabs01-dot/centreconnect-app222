'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LiteModeContextType {
  isLiteMode: boolean;
  toggleLiteMode: () => void;
  setLiteMode: (value: boolean) => void;
}

const LiteModeContext = createContext<LiteModeContextType | undefined>(undefined);

export function LiteModeProvider({ children }: { children: ReactNode }) {
  const [isLiteMode, setIsLiteMode] = useState(false);

  useEffect(() => {
    // Read from localStorage on mount
    const storedLiteMode = localStorage.getItem('liteMode');
    if (storedLiteMode !== null) {
      const parsed = JSON.parse(storedLiteMode);
      setIsLiteMode(parsed);
      if (parsed) {
        document.documentElement.classList.add('lite-mode');
      }
    } else {
        // Default to off and save to localStorage
        localStorage.setItem('liteMode', JSON.stringify(false));
    }
  }, []);

  useEffect(() => {
    // Add/remove class to html element based on isLiteMode state
    if (isLiteMode) {
      document.documentElement.classList.add('lite-mode');
    } else {
      document.documentElement.classList.remove('lite-mode');
    }
    // Update localStorage whenever isLiteMode changes
    localStorage.setItem('liteMode', JSON.stringify(isLiteMode));
  }, [isLiteMode]);

  const toggleLiteMode = () => setIsLiteMode(prev => !prev);
  const setLiteMode = (value: boolean) => setIsLiteMode(value);

  return (
    <LiteModeContext.Provider value={{ isLiteMode, toggleLiteMode, setLiteMode }}>
      {children}
    </LiteModeContext.Provider>
  );
}

export function useLiteMode() {
  const context = useContext(LiteModeContext);
  if (context === undefined) {
    throw new Error('useLiteMode must be used within a LiteModeProvider');
  }
  return context;
}
