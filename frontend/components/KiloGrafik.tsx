import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTemaStore } from '../store/tema';
import { useDilStore } from '../store/dil';

const genislik = Dimensions.get('window').width;

interface KiloKayit {
  tarih: string;
  kilo_kg: number;
}

interface Props {
  veriler: KiloKayit[];
}

export function KiloGrafik({ veriler }: Props) {
  const { renkler } = useTemaStore();
  const { t } = useDilStore();

  if (veriler.length < 2) {
    return (
      <View style={[styles.bosKap, { backgroundColor: renkler.kart }]}>
        <Text style={[styles.bosYazi, { color: renkler.yaziAcik }]}>
          {t('grafikMinKayit')}
        </Text>
      </View>
    );
  }

  const son14 = veriler.slice(-14);
  const etiketler = son14.map((v) => {
    const tarih = new Date(v.tarih);
    return `${tarih.getDate()}/${tarih.getMonth() + 1}`;
  });
  const gosterilen = etiketler.map((e, i) =>
    i % Math.ceil(son14.length / 5) === 0 ? e : ''
  );
  const kilolar = son14.map((v) => v.kilo_kg);

  return (
    <View style={[styles.kap, { backgroundColor: renkler.kart }]}>
      <LineChart
        data={{ labels: gosterilen, datasets: [{ data: kilolar }] }}
        width={genislik - 40}
        height={200}
        chartConfig={{
          backgroundColor: renkler.kart,
          backgroundGradientFrom: renkler.kart,
          backgroundGradientTo: renkler.kart,
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(46, 204, 113, ${opacity})`,
          labelColor: () => renkler.yaziAcik,
          propsForDots: { r: '4', strokeWidth: '2', stroke: renkler.ana },
        }}
        bezier
        style={styles.grafik}
        withInnerLines={false}
        withOuterLines={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  kap:     { borderRadius: 16, padding: 12, alignItems: 'center' },
  grafik:  { borderRadius: 12 },
  bosKap:  { borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center' },
  bosYazi: { fontSize: 14, textAlign: 'center' },
});
