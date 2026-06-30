# Taqwa AI

An Islamic companion app built with React Native and Expo. Provides prayer times, Quran reader, Dhikr counter, Qibla compass, Islamic habits tracker, and AI-powered spiritual insights — all in one place.

## Features

- **Prayer Times** — Location-based prayer schedule with Adhan notifications
- **Quran** — Full Quran reader with audio recitation, bookmarks, and progress tracker
- **Dhikr / Tasbih** — Digital counter with haptic feedback
- **Qibla Compass** — Real-time compass pointing toward Mecca
- **Habits** — Track daily Islamic habits with a weekly grid
- **Daily Duas** — Curated supplications for everyday situations
- **Asmaul Husna** — The 99 Names of Allah with meanings
- **Hadith** — Daily hadith cards
- **Islamic Calendar** — Hijri date converter and events
- **Islamic Learning** — Curated YouTube content
- **Mosque Check-in** — Find and log visits to nearby mosques
- **AI Insights** — Personalized spiritual reflections via Google Gemini
- **Multi-language** — Arabic, English, Urdu, Hindi, Bengali, Turkish
- **Offline Support** — Core features work without internet

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo 54 |
| Navigation | Expo Router (file-based) |
| Styling | NativeWind (Tailwind CSS) |
| Backend / Auth | Supabase |
| AI | Google Gemini |
| Animations | Moti + React Native Reanimated |
| Audio | expo-audio (Adhan sounds) |
| Location | expo-location + expo-sensors |

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator or physical device with Expo Go

### Installation

```bash
git clone https://github.com/uzairahm290/taqwa-ai.git
cd taqwa-ai
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_YOUTUBE_API_KEY=your_youtube_data_api_key
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key
EXPO_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
```

### Database Setup

Run the SQL files in `supabase/` against your Supabase project in this order:

1. `supabase_schema.sql` — base schema
2. `supabase_dhikr_migration.sql`
3. `supabase_duas_migration.sql`
4. `supabase_permissions_fix.sql`
5. `supabase_prayers_permissions_fix.sql`
6. `supabase_quran_permissions_fix.sql`
7. `supabase_youtube_permissions_fix.sql`

### Running the App

```bash
# Start development server
npm start

# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
app/                  # Screens (Expo Router)
  (onboarding)/       # Onboarding flow
  (tabs)/             # Main tab screens
  quran/              # Surah detail screen
components/           # Reusable UI components
hooks/                # Custom React hooks
lib/                  # API clients and utilities
locales/              # i18n translation files
assets/               # Images, fonts, sounds
supabase/             # Database schema and migrations
scripts/              # Utility scripts
```

## License

MIT
