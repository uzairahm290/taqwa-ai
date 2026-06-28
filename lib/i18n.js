import { I18nManager } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@app_language';
const RTL_LANGS = new Set(['ar', 'ur']);

const translations = {
  en: require('../locales/en'),
  ur: require('../locales/ur'),
  ar: require('../locales/ar'),
  tr: require('../locales/tr'),
  hi: require('../locales/hi'),
  bn: require('../locales/bn'),
};

export const LANGUAGES = [
  { code: 'en', name: 'English',  nativeName: 'English',  rtl: false },
  { code: 'ur', name: 'Urdu',     nativeName: 'اردو',      rtl: true },
  { code: 'ar', name: 'Arabic',   nativeName: 'العربية',   rtl: true },
  { code: 'tr', name: 'Turkish',  nativeName: 'Türkçe',    rtl: false },
  { code: 'hi', name: 'Hindi',    nativeName: 'हिंदी',      rtl: false },
  { code: 'bn', name: 'Bengali',  nativeName: 'বাংলা',      rtl: false },
];

let _locale = 'en';
const _listeners = new Set();

export function getCurrentLocale() {
  return _locale;
}

export function isRTL() {
  return RTL_LANGS.has(_locale);
}

export function t(key) {
  const parts = key.split('.');
  let val = translations[_locale];
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  if (val === undefined || typeof val !== 'string') {
    let fb = translations.en;
    for (const p of parts) { fb = fb?.[p]; }
    return typeof fb === 'string' ? fb : key;
  }
  return val;
}

export async function initI18n() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) {
      _locale = saved;
    } else {
      try {
        const { getLocales } = await import('expo-localization');
        const deviceLang = getLocales()?.[0]?.languageCode;
        if (deviceLang && translations[deviceLang]) {
          _locale = deviceLang;
        }
      } catch (_) {}
    }
    const needsRTL = RTL_LANGS.has(_locale);
    if (I18nManager.isRTL !== needsRTL) {
      I18nManager.forceRTL(needsRTL);
    }
  } catch (_) {}
  return _locale;
}

export async function setLocale(code) {
  if (!translations[code]) return false;
  const prevRTL = RTL_LANGS.has(_locale);
  const nextRTL = RTL_LANGS.has(code);
  _locale = code;
  await AsyncStorage.setItem(STORAGE_KEY, code);
  _listeners.forEach(fn => fn(code));
  return prevRTL !== nextRTL;
}

export function useTranslation() {
  const [locale, setLocaleState] = useState(_locale);

  useEffect(() => {
    const fn = (l) => setLocaleState(l);
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }, []);

  return { t, locale, isRTL: RTL_LANGS.has(locale) };
}
