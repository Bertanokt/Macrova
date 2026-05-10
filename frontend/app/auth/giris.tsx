import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { girisYap } from '../../services/api';
import { useAuthStore } from '../../store/auth';
import { useTemaStore } from '../../store/tema';
import { useDilStore } from '../../store/dil';

export default function GirisEkrani() {
  const router = useRouter();
  const { tokenAyarla } = useAuthStore();
  const { renkler } = useTemaStore();
  const { t } = useDilStore();

  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const girisYapHandler = async () => {
    if (!email.trim() || !sifre.trim()) {
      Alert.alert(t('girisHatasi'), t('emailSifreGir')); return;
    }
    setYukleniyor(true);
    try {
      const yanit = await girisYap(email.trim(), sifre);
      await tokenAyarla(yanit.data.access_token, yanit.data.kullanici_id, yanit.data.refresh_token);
      router.replace('/(tabs)');
    } catch (hata: any) {
      const mesaj = hata.response?.data?.detail || t('girisBasarisiz');
      Alert.alert(t('girisHatasi'), mesaj);
    } finally { setYukleniyor(false); }
  };

  const s = makeStyles(renkler);

  return (
    <KeyboardAvoidingView style={s.kap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.icerik} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logo}>
          <View style={s.logoDaire}>
            <Text style={s.logoHarf}>M</Text>
          </View>
          <Text style={s.baslik}>Macrova</Text>
          <Text style={s.altyazi}>{t('beslenme')}</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.etiket}>{t('eposta')}</Text>
          <TextInput style={s.input} placeholder="ornek@email.com"
            placeholderTextColor={renkler.yaziAcik} value={email}
            onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" autoCorrect={false} />

          <Text style={s.etiket}>{t('sifre')}</Text>
          <TextInput style={s.input} placeholder="••••••"
            placeholderTextColor={renkler.yaziAcik} value={sifre}
            onChangeText={setSifre} secureTextEntry />

          <TouchableOpacity style={[s.buton, yukleniyor && s.butonDevre]}
            onPress={girisYapHandler} disabled={yukleniyor}>
            {yukleniyor
              ? <ActivityIndicator color={renkler.beyaz} />
              : <Text style={s.butonYazi}>{t('girisYap')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={s.kayitLink} onPress={() => router.push('/auth/kayit')}>
            <Text style={s.kayitYazi}>
              {t('hesabinYokMu')}{' '}
              <Text style={s.kayitVurgu}>{t('kayitOl')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (r: ReturnType<typeof useTemaStore.getState>['renkler']) =>
  StyleSheet.create({
    kap:       { flex: 1, backgroundColor: r.arkaplan },
    icerik:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logo:      { alignItems: 'center', marginBottom: 48 },
    logoDaire: { width: 80, height: 80, borderRadius: 40, backgroundColor: r.ana, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    logoHarf:  { fontSize: 36, fontWeight: '800', color: r.beyaz },
    baslik:    { fontSize: 32, fontWeight: '800', color: r.yazi, letterSpacing: -0.5 },
    altyazi:   { fontSize: 14, color: r.yaziAcik, marginTop: 6 },
    form:      { backgroundColor: r.kart, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
    etiket:    { fontSize: 13, fontWeight: '600', color: r.yazi, marginBottom: 8, marginTop: 4 },
    input:     { borderWidth: 1.5, borderColor: r.sinir, borderRadius: 12, padding: 14, fontSize: 15, color: r.yazi, marginBottom: 16, backgroundColor: r.arkaplan },
    buton:     { backgroundColor: r.ana, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: r.ana, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    butonDevre:{ opacity: 0.7 },
    butonYazi: { color: r.beyaz, fontSize: 16, fontWeight: '700' },
    kayitLink: { marginTop: 20, alignItems: 'center' },
    kayitYazi: { fontSize: 14, color: r.yaziAcik },
    kayitVurgu:{ color: r.ana, fontWeight: '600' },
  });
