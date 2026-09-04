import { useNavigationUI } from '@/contexts/NavigationUIContext';
import { router, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/** Canonical route for the home/dashboard screen. */
export const DASHBOARD_ROUTE = '/(tabs)/dashboard';

/** Routes where the hardware back button must keep its default behaviour. */
const EXIT_ROUTES = ['/dashboard', '/(tabs)/dashboard', '/login', '/'];

export const isDashboardRoute = (pathname: string) =>
  pathname === '/dashboard' || pathname === '/(tabs)/dashboard';

/**
 * Sends the user back to the dashboard instead of leaving the app.
 * Used by the hardware back button and by the AppBar back arrow whenever
 * there is nothing left on the navigation stack to pop.
 */
export const goBackOrDashboard = () => {
  if (router.canGoBack()) router.back();
  else router.replace(DASHBOARD_ROUTE as any);
};

/**
 * App-wide hardware back handling. The dashboard is the only screen the back
 * button may exit from: every other screen either pops its own stack entry or
 * falls back to the dashboard, so the dashboard is always the last stop before
 * the app closes.
 *
 * Rendered after <Stack> in the root layout so its listener is registered last
 * and therefore runs before React Navigation's own handler.
 */
export function GlobalBackHandler() {
  const pathname = usePathname();
  const { sidebarOpen, closeSidebar, quickAccessOpen, closeQuickAccess } = useNavigationUI();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      // App-level overlays close first.
      if (quickAccessOpen) {
        closeQuickAccess();
        return true;
      }
      if (sidebarOpen) {
        closeSidebar();
        return true;
      }

      // Dashboard (and login) keep the default behaviour: exit the app.
      if (EXIT_ROUTES.includes(pathname)) return false;

      goBackOrDashboard();
      return true;
    });

    return () => subscription.remove();
  }, [pathname, sidebarOpen, closeSidebar, quickAccessOpen, closeQuickAccess]);

  return null;
}
