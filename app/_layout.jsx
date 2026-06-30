import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreenExpo from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OfflineBanner from '../components/OfflineBanner';
import NotificationPermissionModal from '../components/NotificationPermissionModal';
import { useNotifications } from '../hooks/useNotifications';
import { scheduleAdhanNotifications } from '../lib/scheduleAdhan';
import { setupAndroidPrayerChannel } from '../hooks/useNotifications';
import {
  useFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import {
  JetBrainsMono_400Regular,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Amiri_400Regular,
} from '@expo-google-fonts/amiri';
import {
  NotoNastaliqUrdu_400Regular,
} from '@expo-google-fonts/noto-nastaliq-urdu';
import { useSession } from '../hooks/useSupabase';
import { useRecoveryAuth } from '../hooks/useRecoveryAuth';
import { initI18n } from '../lib/i18n';
import '../global.css';

SplashScreenExpo.preventAutoHideAsync();

import { ThemeProvider, useAppTheme } from '../components/theme';

function RootApp() {
  const { session, loading } = useSession();
  const { initializeAuth, loading: authLoading } = useRecoveryAuth();
  const router = useRouter();
  const segments = useSegments();
  const { COLORS, isDark } = useAppTheme();
  const { registerForPushNotifications, checkPermissionStatus } = useNotifications();
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const appState = useRef(AppState.currentState);
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    JetBrainsMono_400Regular,
    Amiri_400Regular,
    NotoNastaliqUrdu_400Regular,
  });

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then(() => setOnboardingLoaded(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && !loading && !authLoading && onboardingLoaded) {
      SplashScreenExpo.hideAsync();
    }
  }, [fontsLoaded, loading, authLoading, onboardingLoaded]);

  const hasInitializedAuth = useRef(false);

  useEffect(() => {
    if (onboardingLoaded && !session && !loading && !authLoading && !hasInitializedAuth.current) {
      hasInitializedAuth.current = true;
      // Ensure we have an account created under the hood
      AsyncStorage.getItem('onboarding_complete').then((done) => {
        if (done) {
          initializeAuth().catch((err) => console.warn('Auth init failed:', err.message));
        }
      });
    }
  }, [session, loading, authLoading, onboardingLoaded, initializeAuth]);

  useEffect(() => {
    if (!session || loading || !fontsLoaded) return;
    setupAndroidPrayerChannel();
    scheduleAdhanNotifications();
  }, [session, loading, fontsLoaded]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (session) scheduleAdhanNotifications();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [session]);

  useEffect(() => {
    if (!session || loading || !fontsLoaded) return;
    (async () => {
      const alreadyAsked = await AsyncStorage.getItem('notif_permission_asked');
      if (alreadyAsked) return;
      const status = await checkPermissionStatus();
      if (status === 'granted') {
        await AsyncStorage.setItem('notif_permission_asked', '1');
        return;
      }
      setShowNotifModal(true);
    })();
  }, [session, loading, fontsLoaded]);

  useEffect(() => {
    if (loading || authLoading || !fontsLoaded || !onboardingLoaded) return;

    const inSplash     = segments[0] === 'splash';
    const inOnboarding = segments[0] === '(onboarding)';
    const inTabs       = segments[0] === '(tabs)';
    const inQuran      = segments[0] === 'quran';

    if (!inSplash && !inOnboarding && !inTabs && !inQuran) {
      AsyncStorage.getItem('onboarding_complete').then((done) => {
        if (!done) {
          router.replace('/(onboarding)');
        } else {
          router.replace('/(tabs)');
        }
      });
    }
  }, [session, loading, authLoading, fontsLoaded, segments, onboardingLoaded]);

  if (!fontsLoaded || loading || !onboardingLoaded) return null;

  async function handleNotifAllow() {
    setShowNotifModal(false);
    await AsyncStorage.setItem('notif_permission_asked', '1');
    await registerForPushNotifications();
  }

  async function handleNotifSkip() {
    setShowNotifModal(false);
    await AsyncStorage.setItem('notif_permission_asked', '1');
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={COLORS.bg} />
      <OfflineBanner />
      <NotificationPermissionModal
        visible={showNotifModal}
        onAllow={handleNotifAllow}
        onSkip={handleNotifSkip}
      />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="splash" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootApp />
    </ThemeProvider>
  );
}
