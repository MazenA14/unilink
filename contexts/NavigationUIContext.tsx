import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Global UI state for app-level navigation chrome that must be reachable
 * from any screen: the slide-in sidebar and the Quick Access media modal.
 * Pure UI orchestration — no business logic.
 */
interface NavigationUIContextType {
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  quickAccessOpen: boolean;
  openQuickAccess: () => void;
  closeQuickAccess: () => void;
}

const NavigationUIContext = createContext<NavigationUIContextType | undefined>(undefined);

export function NavigationUIProvider({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickAccessOpen, setQuickAccessOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openQuickAccess = useCallback(() => setQuickAccessOpen(true), []);
  const closeQuickAccess = useCallback(() => setQuickAccessOpen(false), []);

  const value = useMemo(
    () => ({
      sidebarOpen,
      openSidebar,
      closeSidebar,
      quickAccessOpen,
      openQuickAccess,
      closeQuickAccess,
    }),
    [sidebarOpen, openSidebar, closeSidebar, quickAccessOpen, openQuickAccess, closeQuickAccess]
  );

  return <NavigationUIContext.Provider value={value}>{children}</NavigationUIContext.Provider>;
}

export function useNavigationUI() {
  const context = useContext(NavigationUIContext);
  if (context === undefined) {
    throw new Error('useNavigationUI must be used within a NavigationUIProvider');
  }
  return context;
}
