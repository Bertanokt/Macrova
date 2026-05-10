import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

function TabIkon({ sembol, odak }: { sembol: string; odak: boolean }) {
  return <Text style={{ fontSize: 22, opacity: odak ? 1 : 0.45 }}>{sembol}</Text>;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { renkler } = useTemaStore();
  const { t } = useDilStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: renkler.ana,
        tabBarInactiveTintColor: renkler.yaziAcik,
        tabBarStyle: {
          backgroundColor: renkler.kart,
          borderTopColor: renkler.sinir,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 6,
          paddingTop: 6,
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 60,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => <TabIkon sembol="🏠" odak={focused} />,
        }} />
      <Tabs.Screen name="yemek-ekle"
        options={{
          title: t('yemekEkleButon'),
          tabBarIcon: ({ focused }) => <TabIkon sembol="🍽️" odak={focused} />,
        }} />
      <Tabs.Screen name="kilo"
        options={{
          title: t('kiloTakibi'),
          tabBarIcon: ({ focused }) => <TabIkon sembol="⚖️" odak={focused} />,
        }} />
      <Tabs.Screen name="antrenman"
        options={{
          title: t('antrenman'),
          tabBarIcon: ({ focused }) => <TabIkon sembol="🏋️" odak={focused} />,
        }} />
      <Tabs.Screen name="koc"
        options={{
          title: t('koc'),
          tabBarIcon: ({ focused }) => <TabIkon sembol="🤖" odak={focused} />,
        }} />
      <Tabs.Screen name="profil"
        options={{
          title: t('profil'),
          tabBarIcon: ({ focused }) => <TabIkon sembol="👤" odak={focused} />,
        }} />
    </Tabs>
  );
}
