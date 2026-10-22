import { AppBar } from '@/components/navigation/AppBar';
import { goBackOrDashboard } from '@/components/navigation/GlobalBackHandler';
import { Colors } from '@/constants/Colors';
import { Shadow } from '@/constants/Theme';
import { useNavigationUI } from '@/contexts/NavigationUIContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthManager } from '@/utils/auth';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

const MAIL_URL = 'https://mail.guc.edu.eg';

// OWA reloads the logon page with reason=2 after rejected credentials;
// retrying then would just loop, so auto sign-in is capped and skipped there.
const MAX_LOGIN_ATTEMPTS = 2;

const buildLoginScript = (username: string, password: string) => `
(function () {
  var user = document.getElementById('username');
  var pass = document.getElementById('password');
  var btn = document.querySelector('.signinbutton');
  if (!user || !pass || !btn) return;
  var setValue = function (el, value) {
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  setValue(user, ${JSON.stringify(username)});
  setValue(pass, ${JSON.stringify(password)});
  pass.blur();
  if (typeof clkLgn === 'function') clkLgn(); else btn.click();
})();
true;
`;

export default function EmailScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { sidebarOpen, quickAccessOpen } = useNavigationUI();
  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const loginAttempts = useRef(0);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [credsLoaded, setCredsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthManager.getCredentials()
      .then(({ username, password }) => {
        if (username && password) setCredentials({ username, password });
      })
      .finally(() => setCredsLoaded(true));
  }, []);

  // Hardware back navigates inside the mailbox first (GlobalBackHandler skips this route)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // Let GlobalBackHandler close app-level overlays first
      if (sidebarOpen || quickAccessOpen) return false;
      if (canGoBackRef.current) webRef.current?.goBack();
      else goBackOrDashboard();
      return true;
    });
    return () => sub.remove();
  }, [sidebarOpen, quickAccessOpen]);

  const onNavigationStateChange = (nav: WebViewNavigation) => {
    canGoBackRef.current = nav.canGoBack;
  };

  // Auto sign-in whenever OWA lands on its logon page (first open or expired session)
  const tryAutoLogin = (url: string) => {
    if (!credentials) return;
    const lower = url.toLowerCase();
    if (!lower.includes('/owa/auth/logon.aspx')) return;
    if (lower.includes('reason=2')) return;
    if (loginAttempts.current >= MAX_LOGIN_ATTEMPTS) return;
    loginAttempts.current += 1;
    webRef.current?.injectJavaScript(buildLoginScript(credentials.username, credentials.password));
  };

  const reload = () => {
    loginAttempts.current = 0;
    setLoading(true);
    webRef.current?.reload();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppBar
        title="Email"
        variant="back"
        showNotifications={false}
        rightActions={
          <TouchableOpacity
            onPress={reload}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }, Shadow.xs(colors)]}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reload"
          >
            <Ionicons name="refresh" size={20} color={colors.mainFont} />
          </TouchableOpacity>
        }
      />

      {/* Wait for stored credentials so the first logon page load can be auto-filled */}
      {credsLoaded ? (
        <WebView
          ref={webRef}
          source={{ uri: MAIL_URL }}
          style={styles.web}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={(e) => {
            setLoading(false);
            tryAutoLogin(e.nativeEvent.url);
          }}
        />
      ) : null}

      {loading && (
        <View style={styles.loader} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  web: {
    flex: 1,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
