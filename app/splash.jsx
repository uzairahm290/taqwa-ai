import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '../components/SplashScreen';
import { useSession } from '../hooks/useSupabase';

export default function SplashRoute() {
  const router = useRouter();
  const { session } = useSession();

  async function handleFinish() {
    const onboardingDone = await AsyncStorage.getItem('onboarding_complete');

    if (!onboardingDone) {
      router.replace('/(onboarding)');
    } else {
      router.replace('/(tabs)');
    }
  }

  return <SplashScreen onFinish={handleFinish} />;
}
