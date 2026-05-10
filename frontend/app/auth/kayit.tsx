import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { kayitOl, Hedef, AktiviteSeviyesi } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

const HEDEFLER: { deger: Hedef; etiket: string; aciklamaTR: string; aciklamaEN: string }[] = [
  { deger: 'cut',            etiket: 'Cut',            aciklamaTR: 'Kilo Ver (-500 kcal)',    aciklamaEN: 'Lose Weight (-500 kcal)' },
  { deger: 'aggressive_cut', etiket: 'Aggressive Cut', aciklamaTR: 'Sert Diyet (-750 kcal)',  aciklamaEN: 'Aggressive Diet (-750 kcal)' },
  { deger: 'koru',           etiket: 'Maintain',       aciklamaTR: 'Kiloyu Koru',             aciklamaEN: 'Maintain Weight' },
  { deger: 'bulk',           etiket: 'Bulk',           aciklamaTR: 'Kilo Al (+300 kcal)',     aciklamaEN: 'Gain Weight (+300 kcal)' },
  { deger: 'dirty_bulk',     etiket: 'Dirty Bulk',     aciklamaTR: 'Hızlı Kilo Al (+600 kcal)', aciklamaEN: 'Fast Gain (+600 kcal)' },
];

const AKTIVITELER: { deger: AktiviteSeviyesi; etiketTR: string; etiketEN: string }[] = [
  { deger: 'sedanter',     etiketTR: 'Sedanter (Hareketsiz)',      etiketEN: 'Sedentary' },
  { deger: 'hafif_aktif',  etiketTR: 'Hafif Aktif (Hf. 1-3 gün)', etiketEN: 'Lightly Active (1-3 days/wk)' },
  { deger: 'orta_aktif',   etiketTR: 'Orta Aktif (Hf. 3-5 gün)',  etiketEN: 'Moderately Active (3-5 days/wk)' },
  { deger: 'cok_aktif',    etiketTR: 'Çok Aktif (Hf. 6-7 gün)',   etiketEN: 'Very Active (6-7 days/wk)' },
  { deger: 'ekstra_aktif', etiketTR: 'Ekstra Aktif (Çok yoğun)',  etiketEN: 'Extra Active (Very intense)' },
];

export default function KayitEkrani() {
  const router = useRouter();
  const { tokenAyarla } = useAuthStore();
  const { renkler } = useTemaStore();
  const { t, dil } = useDilStore();

  const [adim, setAdim] = useState(1);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Adım 1
  const [isim, setIsim] = useState('');
  const [soyisim, setSoyisim] = useState('');
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');

  // Adım 2
  const [yas, setYas] = useState('');
  const [cinsiyet, setCinsiyet] = useState<'erkek' | 'kadin'>('erkek');
  const [boy, setBoy] = useState('');
  const [kilo, setKilo] = useState('');

  // Adım 3
  const [hedef, setHedef] = useState<Hedef>('koru');
  const [aktivite, setAktivite] = useState<AktiviteSeviyesi>('orta_aktif');

  const sonrakiAdim = () => {
    if (adim === 1) {
      if (!isim || !soyisim || !email || !sifre) {
        Alert.alert(t('hataOlustu'), t('tumAlanlariDoldurun')); return;
      }
      if (sifre.length < 6) {
        Alert.alert(t('hataOlustu'), t('sifreMinKarakter')); return;
      }
    }
    if (adim === 2) {
      if (!yas || !boy || !kilo) {
        Alert.alert(t('hataOlustu'), t('tumAlanlariDoldurun')); return;
      }
    }
    setAdim(adim + 1);
  };

  const kayitOlHandler = async () => {
    setYukleniyor(true);
    try {
      const yanit = await kayitOl({
        email: email.trim(), sifre, isim, soyisim,
        yas: parseInt(yas), cinsiyet,
        boy_cm: parseFloat(boy), kilo_kg: parseFloat(kilo),
        hedef, aktivite_seviyesi: aktivite,
      });
      await tokenAyarla(yanit.data.access_token, yanit.data.kullanici_id, yanit.data.refresh_token);
      router.replace('/(tabs)');
    } catch (hata: any) {
      const mesaj = hata.response?.data?.detail || t('kayitBasarisiz');
      Alert.alert(t('kayitHatasi'), mesaj);
    } finally { setYukleniyor(false); }
  };

  const ADIM_BASLIK = [t('hesapBilgileri2'), t('fizikselBilgiler'), t('hedefVeAktivite')];
  const s = makeStyles(renkler);

  return (
    <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.icerik} keyboardShouldPersistTaps="handled">

        {/* Başlık */}
        <View style={s.baslikAlani}>
          <TouchableOpacity onPress={() => adim > 1 ? setAdim(adim - 1) : router.back()}>
            <Text style={s.geri}>← {t('geri')}</Text>
          </TouchableOpacity>
          <Text style={s.baslik}>{t('hesapOlustur')}</Text>
        </View>

        {/* İlerleme çubuğu */}
        <View style={s.ilerlemeKap}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={[s.ilerlemeSegment, i <= adim && s.ilerlemeAktif]} />
          ))}
        </View>
        <Text style={s.adimYazi}>{t('adimOf', { n: adim })}</Text>

        {/* ADIM 1: Hesap bilgileri */}
        {adim === 1 && (
          <View style={s.form}>
            <Text style={s.formBaslik}>{ADIM_BASLIK[0]}</Text>
            <InputAlani label={t('isim')} value={isim} onChange={setIsim} placeholder={dil === 'tr' ? 'Adınız' : 'First name'} />
            <InputAlani label={t('soyisim')} value={soyisim} onChange={setSoyisim} placeholder={dil === 'tr' ? 'Soyadınız' : 'Last name'} />
            <InputAlani label={t('eposta')} value={email} onChange={setEmail} placeholder="ornek@email.com" keyboard="email-address" />
            <InputAlani label={t('sifre')} value={sifre} onChange={setSifre} placeholder={dil === 'tr' ? 'En az 6 karakter' : 'At least 6 characters'} gizli />
          </View>
        )}

        {/* ADIM 2: Fiziksel bilgiler */}
        {adim === 2 && (
          <View style={s.form}>
            <Text style={s.formBaslik}>{ADIM_BASLIK[1]}</Text>
            <Text style={s.etiket}>{t('cinsiyet')}</Text>
            <View style={s.cinsiyetKap}>
              {(['erkek', 'kadin'] as const).map((c) => (
                <TouchableOpacity key={c}
                  style={[s.cinsiyetButon, cinsiyet === c && s.cinsiyetAktif]}
                  onPress={() => setCinsiyet(c)}>
                  <Text style={[s.cinsiyetYazi, cinsiyet === c && s.cinsiyetYaziAktif]}>
                    {c === 'erkek' ? `👨 ${t('erkek')}` : `👩 ${t('kadin')}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <InputAlani label={t('yas')} value={yas} onChange={setYas} placeholder="25" keyboard="numeric" />
            <InputAlani label={t('boy')} value={boy} onChange={setBoy} placeholder="175" keyboard="numeric" />
            <InputAlani label={t('kilo')} value={kilo} onChange={setKilo} placeholder="70" keyboard="numeric" />
          </View>
        )}

        {/* ADIM 3: Hedef ve aktivite */}
        {adim === 3 && (
          <View style={s.form}>
            <Text style={s.formBaslik}>{ADIM_BASLIK[2]}</Text>
            <Text style={s.etiket}>{t('hedefiniz')}</Text>
            {HEDEFLER.map((h) => (
              <TouchableOpacity key={h.deger}
                style={[s.secimButon, hedef === h.deger && s.secimAktif]}
                onPress={() => setHedef(h.deger)}>
                <View>
                  <Text style={[s.secimYazi, hedef === h.deger && s.secimYaziAktif]}>{h.etiket}</Text>
                  <Text style={s.secimAciklama}>{dil === 'tr' ? h.aciklamaTR : h.aciklamaEN}</Text>
                </View>
                {hedef === h.deger && <Text style={s.tik}>✓</Text>}
              </TouchableOpacity>
            ))}

            <Text style={[s.etiket, { marginTop: 20 }]}>{t('aktiviteSeviyeniz')}</Text>
            {AKTIVITELER.map((a) => (
              <TouchableOpacity key={a.deger}
                style={[s.secimButon, aktivite === a.deger && s.secimAktif]}
                onPress={() => setAktivite(a.deger)}>
                <Text style={[s.secimYazi, aktivite === a.deger && s.secimYaziAktif]}>
                  {dil === 'tr' ? a.etiketTR : a.etiketEN}
                </Text>
                {aktivite === a.deger && <Text style={s.tik}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Buton */}
        <TouchableOpacity style={[s.buton, yukleniyor && s.butonDevre]}
          onPress={adim < 3 ? sonrakiAdim : kayitOlHandler} disabled={yukleniyor}>
          {yukleniyor
            ? <ActivityIndicator color={renkler.beyaz} />
            : <Text style={s.butonYazi}>
                {adim < 3 ? `${t('devamEt')} →` : t('hesapOlustur')}
              </Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputAlani({ label, value, onChange, placeholder, keyboard, gizli }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; keyboard?: any; gizli?: boolean;
}) {
  const { renkler } = useTemaStore();
  const s = makeStyles(renkler);
  return (
    <>
      <Text style={s.etiket}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange}
        placeholder={placeholder} placeholderTextColor={renkler.yaziAcik}
        keyboardType={keyboard || 'default'} secureTextEntry={gizli}
        autoCapitalize={gizli || keyboard === 'email-address' ? 'none' : 'words'} />
    </>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:            { flex: 1, backgroundColor: r.arkaplan },
    icerik:         { flexGrow: 1, padding: 20, paddingBottom: 40 },
    baslikAlani:    { marginBottom: 20, marginTop: 12 },
    geri:           { fontSize: 15, color: r.ana, marginBottom: 12 },
    baslik:         { fontSize: 26, fontWeight: '800', color: r.yazi },
    ilerlemeKap:    { flexDirection: 'row', gap: 8, marginBottom: 8 },
    ilerlemeSegment:{ flex: 1, height: 4, borderRadius: 2, backgroundColor: r.sinir },
    ilerlemeAktif:  { backgroundColor: r.ana },
    adimYazi:       { fontSize: 12, color: r.yaziAcik, marginBottom: 20 },
    form:           { backgroundColor: r.kart, borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
    formBaslik:     { fontSize: 16, fontWeight: '700', color: r.yazi, marginBottom: 16 },
    etiket:         { fontSize: 13, fontWeight: '600', color: r.yazi, marginBottom: 8, marginTop: 4 },
    input:          { borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 14, fontSize: 15, color: r.yazi, marginBottom: 12, backgroundColor: r.arkaplan },
    cinsiyetKap:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
    cinsiyetButon:  { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: r.sinir, alignItems: 'center', backgroundColor: r.arkaplan },
    cinsiyetAktif:  { borderColor: r.ana, backgroundColor: r.ana + '18' },
    cinsiyetYazi:   { fontSize: 14, color: r.yaziAcik, fontWeight: '500' },
    cinsiyetYaziAktif: { color: r.ana, fontWeight: '700' },
    secimButon:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: r.sinir, marginBottom: 8, backgroundColor: r.arkaplan },
    secimAktif:     { borderColor: r.ana, backgroundColor: r.ana + '18' },
    secimYazi:      { fontSize: 14, color: r.yazi, fontWeight: '500' },
    secimYaziAktif: { color: r.ana, fontWeight: '700' },
    secimAciklama:  { fontSize: 11, color: r.yaziAcik, marginTop: 2 },
    tik:            { fontSize: 16, color: r.ana, fontWeight: '700' },
    buton:          { backgroundColor: r.ana, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    butonDevre:     { opacity: 0.7 },
    butonYazi:      { color: r.beyaz, fontSize: 16, fontWeight: '700' },
  });
