import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useAppTheme } from '../../components/theme';
import { useTranslation } from '../../lib/i18n';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home01Icon, PrayerRug01Icon, Quran01Icon, Task01Icon, YoutubeIcon, Menu01Icon } from '@hugeicons/core-free-icons';

function HomeIcon({ focused, COLORS }) {
  return <HugeiconsIcon icon={Home01Icon} size={24} color={focused ? COLORS.gold : COLORS.textTertiary} />;
}

function SalahIcon({ focused, COLORS }) {
  return <HugeiconsIcon icon={PrayerRug01Icon} size={24} color={focused ? COLORS.gold : COLORS.textTertiary} />;
}

function QuranIcon({ focused, COLORS }) {
  return <HugeiconsIcon icon={Quran01Icon} size={24} color={focused ? COLORS.gold : COLORS.textTertiary} />;
}

function HabitsIcon({ focused, COLORS }) {
  return <HugeiconsIcon icon={Task01Icon} size={24} color={focused ? COLORS.gold : COLORS.textTertiary} />;
}

function LearnIcon({ focused, COLORS }) {
  return <HugeiconsIcon icon={YoutubeIcon} size={24} color={focused ? COLORS.gold : COLORS.textTertiary} />;
}

function MoreIcon({ focused, COLORS }) {
  return <HugeiconsIcon icon={Menu01Icon} size={24} color={focused ? COLORS.gold : COLORS.textTertiary} />;
}

function CustomTabBar({ state, descriptors, navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { COLORS } = useAppTheme();

  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: COLORS.card,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      paddingBottom: Platform.OS === 'ios' ? 24 : 12,
      paddingTop: isTablet ? 12 : 8,
      height: Platform.OS === 'ios' ? 88 : 72,
      alignItems: 'flex-start',
    }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const IconComponent = options.tabBarIcon;
        const label = options.tabBarLabel;

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.7}
          >
            <View style={{
              flexDirection: isTablet ? 'row' : 'column',
              alignItems: 'center',
              backgroundColor: isFocused ? 'rgba(201,168,76,0.18)' : 'transparent',
              paddingHorizontal: isTablet ? 20 : 16,
              paddingVertical: isTablet ? 10 : 6,
              borderRadius: isTablet ? 24 : 20,
              gap: isTablet ? 8 : 4,
              marginTop: isTablet ? 0 : 2,
            }}>
              {IconComponent && <IconComponent focused={isFocused} />}
              <Text style={{
                fontFamily: isFocused ? 'Inter_600SemiBold' : 'Inter_400Regular',
                fontSize: isTablet ? 13 : 10,
                color: isFocused ? COLORS.gold : COLORS.textTertiary,
                opacity: isFocused ? 1 : 0.8,
              }}>
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { COLORS } = useAppTheme();
  const { t } = useTranslation();
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: t('nav.home'),
          tabBarIcon: ({ focused }) => <HomeIcon focused={focused} COLORS={COLORS} />,
        }}
      />
      <Tabs.Screen
        name="salah"
        options={{
          tabBarLabel: t('nav.salah'),
          tabBarIcon: ({ focused }) => <SalahIcon focused={focused} COLORS={COLORS} />,
        }}
      />
      <Tabs.Screen
        name="quran"
        options={{
          tabBarLabel: t('nav.quran'),
          tabBarIcon: ({ focused }) => <QuranIcon focused={focused} COLORS={COLORS} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          tabBarLabel: t('nav.habits'),
          tabBarIcon: ({ focused }) => <HabitsIcon focused={focused} COLORS={COLORS} />,
        }}
      />
      <Tabs.Screen
        name="learning"
        options={{
          tabBarLabel: t('nav.learning'),
          tabBarIcon: ({ focused }) => <LearnIcon focused={focused} COLORS={COLORS} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          tabBarLabel: t('nav.more'),
          tabBarIcon: ({ focused }) => <MoreIcon focused={focused} COLORS={COLORS} />,
        }}
      />
    </Tabs>
  );
}
