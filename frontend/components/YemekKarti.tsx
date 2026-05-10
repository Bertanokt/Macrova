import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTemaStore } from '../store/tema';
import { useDilStore } from '../store/dil';

interface Yemek {
  id: string;
  isim: string;
  isim_en?: string;
  kalori_100g: number;
  protein_100g: number;
  karbonhidrat_100g: number;
  yag_100g: number;
  kategori?: string;
}

interface Props {
  yemek: Yemek;
  onEkle: (yemek: Yemek) => void;
}

export function YemekKarti({ yemek, onEkle }: Props) {
  const { renkler } = useTemaStore();
  const { dil } = useDilStore();
  const s = makeStyles(renkler);

  const gosterilecekIsim = dil === 'en' ? (yemek.isim_en ?? yemek.isim) : yemek.isim;

  return (
    <View style={s.kap}>
      <View style={s.bilgi}>
        <Text style={s.isim} numberOfLines={1}>{gosterilecekIsim}</Text>
        <View style={s.makrolar}>
          <Text style={s.makro}>
            <Text style={s.makroKalori}>{Math.round(yemek.kalori_100g)}</Text>
            <Text style={s.makroBirim}> kcal</Text>
          </Text>
          <Text style={s.ayrac}>·</Text>
          <Text style={s.makro}>P: {Math.round(yemek.protein_100g)}g</Text>
          <Text style={s.ayrac}>·</Text>
          <Text style={s.makro}>K: {Math.round(yemek.karbonhidrat_100g)}g</Text>
          <Text style={s.ayrac}>·</Text>
          <Text style={s.makro}>Y: {Math.round(yemek.yag_100g)}g</Text>
        </View>
        {yemek.kategori && <Text style={s.kategori}>{yemek.kategori}</Text>}
      </View>
      <TouchableOpacity style={s.buton} onPress={() => onEkle(yemek)}>
        <Text style={s.butonYazi}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:         { flexDirection: 'row', alignItems: 'center', backgroundColor: r.kart, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    bilgi:       { flex: 1, marginRight: 12 },
    isim:        { fontSize: 15, fontWeight: '600', color: r.yazi, marginBottom: 4 },
    makrolar:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    makro:       { fontSize: 12, color: r.yaziAcik },
    makroKalori: { fontSize: 12, fontWeight: '600', color: r.ana },
    makroBirim:  { fontSize: 12, color: r.yaziAcik },
    ayrac:       { fontSize: 12, color: r.sinir, marginHorizontal: 4 },
    kategori:    { fontSize: 11, color: r.ana, marginTop: 4 },
    buton:       { width: 36, height: 36, borderRadius: 18, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center' },
    butonYazi:   { fontSize: 22, color: r.beyaz, fontWeight: '300', lineHeight: 26 },
  });
