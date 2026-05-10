import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { kiloEkle, kiloGecmisGetir, profilGetir } from '../../services/api';
import { KiloGrafik } from '../../components/KiloGrafik';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

export default function KiloEkrani() {
  const { renkler } = useTemaStore();
  const { t } = useDilStore();
  const [kilo, setKilo] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kayitYukleniyor, setKayitYukleniyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [gecmis, setGecmis] = useState<any[]>([]);
  const [profil, setProfil] = useState<any>(null);

  const veriYukle = async () => {
    try {
      const [g, p] = await Promise.all([kiloGecmisGetir(), profilGetir()]);
      setGecmis(g.data); setProfil(p.data);
    } catch {}
    finally { setYukleniyor(false); setYenileniyor(false); }
  };

  useFocusEffect(useCallback(() => { veriYukle(); }, []));

  const kiloKaydet = async () => {
    const sayi = parseFloat(kilo.replace(',', '.'));
    if (!sayi || sayi < 20 || sayi > 300) {
      Alert.alert(t('hataOlustu'), t('gecerliKiloGir')); return;
    }
    setKayitYukleniyor(true);
    try {
      await kiloEkle(sayi); setKilo(''); await veriYukle();
      Alert.alert('✓', t('kiloKaydedildi'));
    } catch (e: any) {
      Alert.alert(t('hataOlustu'), e.response?.data?.detail ?? '');
    } finally { setKayitYukleniyor(false); }
  };

  const guncelKilo = gecmis.length > 0 ? gecmis[gecmis.length - 1].kilo_kg : profil?.kilo_kg;
  const ilkKilo   = gecmis.length > 0 ? gecmis[0].kilo_kg : null;
  const fark      = guncelKilo && ilkKilo ? (guncelKilo - ilkKilo).toFixed(1) : null;

  if (yukleniyor) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: renkler.arkaplan }}>
        <ActivityIndicator size="large" color={renkler.ana} />
      </View>
    );
  }

  const s = makeStyles(renkler);

  return (
    <ScrollView style={s.kap} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={yenileniyor}
        onRefresh={() => { setYenileniyor(true); veriYukle(); }} tintColor={renkler.ana} />}>

      <View style={s.header}>
        <Text style={s.baslik}>{t('kiloTakibi')} ⚖️</Text>
      </View>

      {/* İstatistikler */}
      <View style={s.statKaplar}>
        {[
          { etiket: t('mevcutKilo'), deger: guncelKilo ? `${guncelKilo}` : '—', birim: 'kg', renk: renkler.ana },
          { etiket: t('degisim'), deger: fark ? `${parseFloat(fark) > 0 ? '+' : ''}${fark}` : '—', birim: fark ? 'kg' : '', renk: fark ? (parseFloat(fark) < 0 ? renkler.ana : renkler.kirmizi) : renkler.yazi },
          { etiket: t('kayitSayisi'), deger: String(gecmis.length), birim: '', renk: renkler.yazi },
        ].map((item) => (
          <View key={item.etiket} style={s.statKart}>
            <Text style={s.statEtiket}>{item.etiket}</Text>
            <Text style={[s.statDeger, { color: item.renk }]}>{item.deger}</Text>
            {item.birim ? <Text style={s.statBirim}>{item.birim}</Text> : null}
          </View>
        ))}
      </View>

      {/* Grafik */}
      <View style={s.grafikKap}>
        <KiloGrafik veriler={gecmis} />
      </View>

      {/* Giriş kartı */}
      <View style={s.girisKart}>
        <Text style={s.girisBaslik}>{t('bugunkunKiloGir')}</Text>
        <Text style={s.girisAlt}>{t('ayniGuneGuncellenir')}</Text>
        <View style={s.girisRow}>
          <TextInput style={s.girisInput} value={kilo} onChangeText={setKilo}
            placeholder="70.5" placeholderTextColor={renkler.yaziAcik}
            keyboardType="decimal-pad" />
          <Text style={s.girisBirim}>kg</Text>
          <TouchableOpacity style={[s.kaydetButon, kayitYukleniyor && { opacity: 0.7 }]}
            onPress={kiloKaydet} disabled={kayitYukleniyor}>
            {kayitYukleniyor
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.kaydetYazi}>{t('kaydet')}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Son kayıtlar */}
      {gecmis.length > 0 && (
        <View style={s.gecmisKap}>
          <Text style={s.gecmisBaslik}>{t('kiloGecmisi')}</Text>
          {[...gecmis].reverse().slice(0, 7).map((k, i) => (
            <View key={k.id ?? i} style={[s.gecmisSatir, { borderBottomColor: renkler.sinir }]}>
              <Text style={s.gecmisTarih}>
                {new Date(k.tarih).toLocaleDateString(t('dil') === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long' })}
              </Text>
              <Text style={s.gecmisKilo}>{k.kilo_kg} kg</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:         { flex: 1, backgroundColor: r.arkaplan },
    header:      { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
    baslik:      { fontSize: 26, fontWeight: '800', color: r.yazi },
    statKaplar:  { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
    statKart:    { flex: 1, backgroundColor: r.kart, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    statEtiket:  { fontSize: 11, color: r.yaziAcik, marginBottom: 4, textAlign: 'center' },
    statDeger:   { fontSize: 20, fontWeight: '800' },
    statBirim:   { fontSize: 11, color: r.yaziAcik, marginTop: 2 },
    grafikKap:   { marginHorizontal: 20, marginBottom: 16 },
    girisKart:   { marginHorizontal: 16, backgroundColor: r.kart, borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    girisBaslik: { fontSize: 16, fontWeight: '700', color: r.yazi, marginBottom: 4 },
    girisAlt:    { fontSize: 12, color: r.yaziAcik, marginBottom: 16 },
    girisRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
    girisInput:  { flex: 1, borderWidth: 1.5, borderColor: r.ana, borderRadius: 12, padding: 14, fontSize: 20, fontWeight: '700', color: r.yazi, backgroundColor: r.arkaplan, textAlign: 'center' },
    girisBirim:  { fontSize: 16, color: r.yaziAcik, fontWeight: '500' },
    kaydetButon: { backgroundColor: r.ana, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
    kaydetYazi:  { color: '#fff', fontSize: 15, fontWeight: '700' },
    gecmisKap:   { marginHorizontal: 16, backgroundColor: r.kart, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    gecmisBaslik:{ fontSize: 15, fontWeight: '700', color: r.yazi, marginBottom: 12 },
    gecmisSatir: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
    gecmisTarih: { fontSize: 14, color: r.yaziAcik },
    gecmisKilo:  { fontSize: 14, fontWeight: '700', color: r.yazi },
  });
