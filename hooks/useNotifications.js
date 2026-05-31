import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabaseClient';
import { scheduleAdhanNotifications, cancelAdhanNotifications, ADHAN_CHANNEL_ID } from '../lib/scheduleAdhan';
export { ADHAN_CHANNEL_ID };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupAndroidPrayerChannel() {
  if (Platform.OS !== 'android') return;
  // Delete old channel (was created without the correct sound file)
  try { await Notifications.deleteNotificationChannelAsync('prayers'); } catch (_) {}
  await Notifications.setNotificationChannelAsync(ADHAN_CHANNEL_ID, {
    name: 'Prayer Times (Adhan)',
    description: 'Adhan call for all five daily prayers',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'azan',
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#C9A84C',
    enableLights: true,
    enableVibrate: true,
    showBadge: false,
    bypassDnd: false,
  });
}

export function useNotifications() {
  const notifListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    const notifSub = notifListener.current;
    const respSub = responseListener.current;
    return () => {
      notifSub?.remove();
      respSub?.remove();
    };
  }, []);

  async function registerForPushNotifications() {
    await setupAndroidPrayerChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return false;

    // Save push token for remote notifications (standalone builds only)
    try {
      if (Constants.appOwnership !== 'expo') {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;
        if (user && token) {
          await supabase.from('push_subscriptions').upsert({ user_id: user.id, expo_token: token });
        }
      }
    } catch (_) {
      // Expo Go doesn't support remote push tokens
    }

    // Schedule 7 days of Adhan notifications immediately after permission is granted
    await scheduleAdhanNotifications({ force: true });
    return true;
  }

  async function sendMosqueNearbyNotification(mosqueName) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Masjid nearby',
        body: `You're near ${mosqueName}. Pray here?`,
        data: { type: 'mosque_nearby', mosqueName },
        ...(Platform.OS === 'android' && { channelId: ADHAN_CHANNEL_ID }),
      },
      trigger: null,
    });
  }

  async function checkPermissionStatus() {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  return {
    registerForPushNotifications,
    scheduleAdhanNotifications,
    cancelAdhanNotifications,
    sendMosqueNearbyNotification,
    checkPermissionStatus,
  };
}
