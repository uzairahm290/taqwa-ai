import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DARK_COLORS = {
  bg: '#0A0A0F',
  card: '#111118',
  nav: '#0D0D14',
  gold: '#C9A84C',
  goldLight: '#E8C96A',
  goldMuted: '#7A6230',
  textPrimary: '#F0EDE6',
  textSecondary: '#9E9B94',
  textTertiary: '#5C5A55',
  success: '#3DA876',
  danger: '#8B3A3A',
  border: 'rgba(201,168,76,0.2)',
};

const LIGHT_COLORS = {
  bg: '#FDFCF7', // Premium parchment background
  card: '#FFFFFF', // Clean white for cards
  nav: '#F7F4EC', // Slightly off-white for navigation
  gold: '#A68326', // Deeper gold for better text contrast
  goldLight: '#C9A84C',
  goldMuted: '#B3974D',
  textPrimary: '#1A1814', // Very dark brown/black
  textSecondary: '#666158',
  textTertiary: '#99948A',
  success: '#277A50',
  danger: '#A33636',
  border: 'rgba(166,131,38,0.2)', // Gold tint border
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themePref, setThemePref] = useState('system'); // 'system', 'light', 'dark'
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const savedPref = await AsyncStorage.getItem('@theme_preference');
        if (savedPref) {
          setThemePref(savedPref);
        }
      } catch (e) {}
      setIsReady(true);
    })();
  }, []);

  const changeThemePreference = async (pref) => {
    setThemePref(pref);
    try {
      await AsyncStorage.setItem('@theme_preference', pref);
    } catch (e) {}
  };

  const isDark = themePref === 'system' 
    ? systemColorScheme === 'dark' 
    : themePref === 'dark';

  const COLORS = isDark ? DARK_COLORS : LIGHT_COLORS;

  const CARD_STYLE = {
    backgroundColor: COLORS.card,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    shadowColor: isDark ? '#000' : '#8A8780',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0 : 0.05,
    shadowRadius: 12,
    elevation: isDark ? 0 : 2,
  };

  if (!isReady) return null; // Prevent flicker while loading from AsyncStorage

  return (
    <ThemeContext.Provider value={{ COLORS, CARD_STYLE, isDark, themePref, changeThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return { COLORS: DARK_COLORS, CARD_STYLE: { backgroundColor: DARK_COLORS.card, borderWidth: 0.5, borderColor: DARK_COLORS.border, borderRadius: 14 }, isDark: true, themePref: 'system', changeThemePreference: () => {} };
  }
  return context;
}

export const PRAYERS_AR = {
  Fajr: 'الفجر',
  Dhuhr: 'الظهر',
  Asr: 'العصر',
  Maghrib: 'المغرب',
  Isha: 'العشاء',
  Tahajjud: 'التهجد',
  Duha: 'الضحى',
  Witr: 'الوتر',
};

export const PRAYER_LIST = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
export const NAFL_LIST = ['Tahajjud', 'Duha', 'Witr'];

// Temporary legacy exports to prevent app crash during migration
export const COLORS = DARK_COLORS;
export const CARD_STYLE = {
  backgroundColor: DARK_COLORS.card,
  borderWidth: 0.5,
  borderColor: DARK_COLORS.border,
  borderRadius: 14,
};
