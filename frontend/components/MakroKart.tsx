import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTemaStore } from '../store/tema';

interface Props {
  etiket: string;
  miktar: number;
  hedef: number;
  renk: string;
  birim?: string;
}

export function MakroKart({ etiket, miktar, hedef, renk, birim = 'g' }: Props) {
  const { renkler } = useTemaStore();
  const s = makeStyles(renkler);
  const yuzde = hedef > 0 ? Math.min(1, miktar / hedef) : 0;

  return (
    <View style={s.kap}>
      <View style={s.ust}>
        <View style={[s.nokta, { backgroundColor: renk }]} />
        <Text style={s.etiket}>{etiket}</Text>
      </View>
      <Text style={s.deger}>
        <Text style={[s.miktar, { color: renk }]}>{Math.round(miktar)}</Text>
        <Text style={s.birim}>/{Math.round(hedef)}{birim}</Text>
      </Text>
      <View style={s.cubukArka}>
        <View style={[s.cubukOn, { width: `${yuzde * 100}%` as any, backgroundColor: renk }]} />
      </View>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:      { flex: 1, backgroundColor: r.kart, borderRadius: 12, padding: 12, marginHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    ust:      { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    nokta:    { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    etiket:   { fontSize: 11, color: r.yaziAcik, fontWeight: '500' },
    deger:    { marginBottom: 8 },
    miktar:   { fontSize: 18, fontWeight: '700' },
    birim:    { fontSize: 11, color: r.yaziAcik },
    cubukArka:{ height: 4, backgroundColor: r.sinir, borderRadius: 2, overflow: 'hidden' },
    cubukOn:  { height: 4, borderRadius: 2 },
  });
