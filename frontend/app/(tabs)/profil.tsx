import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, useColorScheme,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { profilGetir, makroHedefGetir } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { useTemaStore, TemaSecim } from '../../store/tema';
import { useDilStore } from '../../store/dil';
import type { DilKodu } from '../../constants/i18n';

const HEDEF_ETIKET: Record<string, string> = {
  cut: 'Cut', aggressive_cut: 'Aggressive Cut',
  koru: 'Koru / Maintain', bulk: 'Bulk', dirty_bulk: 'Dirty Bulk',
};
const AKTIVITE_ETIKET: Record<string, string> = {
  sedanter: 'Sedanter', hafif_aktif: 'Hafif Aktif',
  orta_aktif: 'Orta Aktif', cok_aktif: 'Çok Aktif', ekstra_aktif: 'Ekstra Aktif',
};

export default function ProfilEkrani() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { cikisYap } = useAuthStore();
  const { renkler, temaSecim, temaAyarla } = useTemaStore();
  const { t, dil, dilAyarla } = useDilStore();
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [profil, setProfil] = useState<any>(null);
  const [hedefler, setHedefler] = useState<any>(null);

  const veriYukle = async () => {
    try {
      const [p, h] = await Promise.all([profilGetir(), makroHedefGetir()]);
      setProfil(p.data); setHedefler(h.data);
    } catch {}
    finally { setYukleniyor(false); setYenileniyor(false); }
  };

  useFocusEffect(useCallback(() => { veriYukle(); }, []));

  const cikisYapHandler = () => {
    Alert.alert(t('cikisYap'), t('cikisOnay'), [
      { text: t('iptal'), style: 'cancel' },
      { text: t('cikisYap'), style: 'destructive',
        onPress: async () => { await cikisYap(); router.replace('/auth/giris'); } },
    ]);
  };

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

      {/* Avatar */}
      <View style={s.header}>
        <View style={s.avatarDaire}>
          <Text style={s.avatarHarf}>
            {`${profil?.isim?.[0] ?? ''}${profil?.soyisim?.[0] ?? ''}`.toUpperCase()}
          </Text>
        </View>
        <Text style={s.tamIsim}>{profil?.isim} {profil?.soyisim}</Text>
        <Text style={s.email}>{profil?.email}</Text>
      </View>

      {/* Hesap */}
      <Text style={s.grupBaslik}>{t('hesapBilgileri')}</Text>
      <View style={s.grup}>
        <Satir etiket="👤  " deger={`${profil?.isim} ${profil?.soyisim}`} r={renkler} />
        <Satir etiket="📏  " deger={`${profil?.boy_cm} cm`} r={renkler} />
        <Satir etiket="⚖️  " deger={`${profil?.kilo_kg} kg`} r={renkler} />
        <Satir etiket="🎂  " deger={`${profil?.yas} yaş`} r={renkler} />
        <Satir etiket="🎯  " deger={HEDEF_ETIKET[profil?.hedef] ?? profil?.hedef} r={renkler} son />
      </View>

      {/* Makrolar */}
      {hedefler && (
        <>
          <Text style={s.grupBaslik}>{t('gunlukMakrolar')}</Text>
          <View style={s.grup}>
            <Satir etiket={t('kalori')} deger={`${Math.round(hedefler.kalori_hedef)} kcal`} r={renkler} renkli />
            <Satir etiket={t('protein')} deger={`${Math.round(hedefler.protein_hedef)} g`} r={renkler} />
            <Satir etiket={t('karbonhidrat')} deger={`${Math.round(hedefler.karbonhidrat_hedef)} g`} r={renkler} />
            <Satir etiket={t('yag')} deger={`${Math.round(hedefler.yag_hedef)} g`} r={renkler} son />
          </View>
          <Text style={s.hesaplamaYazi}>
            {hedefler.hesaplama_tipi === 'adaptif' ? `🔄 ${t('adaptifTdee')}` : `📊 ${t('standartHesap')}`}
          </Text>
        </>
      )}

      {/* Dil */}
      <Text style={s.grupBaslik}>{t('dil')}</Text>
      <View style={s.grup}>
        {([['tr', t('turkce')], ['en', t('ingilizce')]] as [DilKodu, string][]).map(([kod, ad], i, arr) => (
          <TouchableOpacity key={kod}
            style={[s.secimSatir, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: renkler.sinir }]}
            onPress={() => dilAyarla(kod)}>
            <Text style={[s.secimYazi, { color: renkler.yazi }]}>{ad}</Text>
            {dil === kod && <Text style={{ color: renkler.ana, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Görünüm */}
      <Text style={s.grupBaslik}>{t('gorunum')}</Text>
      <View style={s.grup}>
        {([
          ['light', '☀️  ' + t('acikMod')],
          ['dark',  '🌙  ' + t('koyuMod')],
          ['system','📱  ' + t('sistem')],
        ] as [TemaSecim, string][]).map(([secim, ad], i, arr) => (
          <TouchableOpacity key={secim}
            style={[s.secimSatir, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: renkler.sinir }]}
            onPress={() => temaAyarla(secim, colorScheme === 'dark')}>
            <Text style={[s.secimYazi, { color: renkler.yazi }]}>{ad}</Text>
            {temaSecim === secim && <Text style={{ color: renkler.ana, fontSize: 18 }}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Yasal */}
      <Text style={s.grupBaslik}>{t('yasal')}</Text>
      <View style={s.grup}>
        <TouchableOpacity
          style={[s.secimSatir, { borderBottomWidth: 1, borderBottomColor: renkler.sinir }]}
          onPress={() => router.push('/legal?slug=gizlilik')}>
          <Text style={[s.secimYazi, { color: renkler.yazi }]}>🔒  {t('gizlilikPolitikasi')}</Text>
          <Text style={{ color: renkler.yaziAcik, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.secimSatir}
          onPress={() => router.push('/legal?slug=kosullar')}>
          <Text style={[s.secimYazi, { color: renkler.yazi }]}>📄  {t('kullanımKosullari')}</Text>
          <Text style={{ color: renkler.yaziAcik, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Çıkış */}
      <TouchableOpacity style={s.cikisButon} onPress={cikisYapHandler}>
        <Text style={s.cikisYazi}>{t('cikisYap')}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Satir({ etiket, deger, r, son, renkli }: {
  etiket: string; deger: string;
  r: ReturnType<typeof useTemaStore.getState>['renkler'];
  son?: boolean; renkli?: boolean;
}) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
      !son && { borderBottomWidth: 1, borderBottomColor: r.sinir }]}>
      <Text style={{ fontSize: 14, color: r.yaziAcik }}>{etiket}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: renkli ? r.ana : r.yazi }}>{deger}</Text>
    </View>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:           { flex: 1, backgroundColor: r.arkaplan },
    header:        { alignItems: 'center', paddingTop: 64, paddingBottom: 24, backgroundColor: r.kart, marginBottom: 8 },
    avatarDaire:   { width: 88, height: 88, borderRadius: 44, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    avatarHarf:    { fontSize: 30, fontWeight: '800', color: '#fff' },
    tamIsim:       { fontSize: 22, fontWeight: '800', color: r.yazi },
    email:         { fontSize: 13, color: r.yaziAcik, marginTop: 3 },
    grupBaslik:    { fontSize: 12, fontWeight: '700', color: r.yaziAcik, marginHorizontal: 20, marginTop: 20, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    grup:          { marginHorizontal: 16, backgroundColor: r.kart, borderRadius: 14, paddingHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    secimSatir:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
    secimYazi:     { fontSize: 15 },
    hesaplamaYazi: { fontSize: 11, color: r.yaziAcik, marginHorizontal: 20, marginTop: 6, textAlign: 'right' },
    cikisButon:    { marginHorizontal: 16, marginTop: 24, backgroundColor: '#FEE2E2', borderRadius: 14, padding: 16, alignItems: 'center' },
    cikisYazi:     { color: r.kirmizi, fontSize: 16, fontWeight: '700' },
  });
