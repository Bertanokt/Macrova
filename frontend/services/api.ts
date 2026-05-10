import axios from 'axios';
import Constants from 'expo-constants';
import { getRefreshToken, useAuthStore } from '../store/auth';

// ── Base URL ────────────────────────────────────────────────────────────────
const getBaseUrl = () => {
  if (__DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    if (host) return `http://${host}:8000`;
    return 'http://localhost:8000';
  }
  return 'https://macrova-nt5v.onrender.com';
};

const BASE_URL = getBaseUrl();

// ── Axios instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — access token ekle ────────────────────────────────
api.interceptors.request.use(async (config) => {
  try {
    const { token } = useAuthStore.getState();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  return config;
});

// ── Response interceptor — 401'de refresh token flow ──────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        const refreshToken = await getRefreshToken();
        if (!refreshToken) throw new Error('refresh_token yok');

        const { data } = await axios.post(`${BASE_URL}/auth/token-yenile`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefresh } = data;
        await useAuthStore.getState().tokenGuncelle(access_token, newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await useAuthStore.getState().cikisYap();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Tipler ─────────────────────────────────────────────────────────────────
export type Hedef            = 'cut' | 'aggressive_cut' | 'koru' | 'bulk' | 'dirty_bulk';
export type AktiviteSeviyesi = 'sedanter' | 'hafif_aktif' | 'orta_aktif' | 'cok_aktif' | 'ekstra_aktif';
export type Ogun             = 'kahvalti' | 'ogle' | 'aksam' | 'ara_ogun';

export interface KayitVerisi {
  email:             string;
  sifre:             string;
  isim:              string;
  soyisim:           string;
  yas:               number;
  cinsiyet:          'erkek' | 'kadin';
  boy_cm:            number;
  kilo_kg:           number;
  hedef:             Hedef;
  aktivite_seviyesi: AktiviteSeviyesi;
}

// ── Auth ────────────────────────────────────────────────────────────────────
export const kayitOl       = (veri: KayitVerisi) => api.post('/auth/kayit', veri);
export const girisYap      = (email: string, sifre: string) =>
  api.post('/auth/giris', { email, sifre });
export const cikisYapApi   = () => api.post('/auth/cikis').catch(() => {});
export const sifreDegistir = (eskiSifre: string, yeniSifre: string) =>
  api.put('/auth/sifre-degistir', { eski_sifre: eskiSifre, yeni_sifre: yeniSifre });
export const hesapSil      = (sifre: string) =>
  api.delete('/kullanici/hesap-sil', { data: { sifre } });

// ── Kullanıcı ───────────────────────────────────────────────────────────────
export const profilGetir     = () => api.get('/kullanici/profil');
export const profilGuncelle  = (veri: Partial<KayitVerisi>) => api.put('/kullanici/profil', veri);
export const kiloEkle        = (kilo_kg: number, tarih?: string) =>
  api.post('/kullanici/kilo', { kilo_kg, tarih });
export const kiloGecmisGetir = () => api.get('/kullanici/kilo-gecmis');
export const makroHedefGetir = () => api.get('/kullanici/makro-hedef');

// ── Yemek ───────────────────────────────────────────────────────────────────
export const yemekAra      = (q: string) => api.get('/yemek/ara', { params: { q } });
export const yemekEkle     = (veri: object) => api.post('/yemek/ekle', veri);
export const barkodAra     = (barkodNo: string) => api.get(`/yemek/barkod/${barkodNo}`);
export const yemekGuncelle = (yemekId: string, veri: object) =>
  api.put(`/yemek/${yemekId}`, veri);

// ── Takip ───────────────────────────────────────────────────────────────────
export const ogunEkle = (veri: {
  tarih?:      string;
  ogun:        Ogun;
  yemek_id:    string;
  miktar_gram: number;
}) => api.post('/takip/ogun-ekle', veri);

export const gunlukTakipGetir  = (tarih?: string) =>
  api.get('/takip/gunluk', tarih ? { params: { tarih } } : undefined);
export const haftalikTakipGetir = () => api.get('/takip/haftalik');
export const ogunSil           = (kayitId: string) => api.delete(`/takip/ogun/${kayitId}`);

// ── Su Takibi ───────────────────────────────────────────────────────────────
export const suEkle        = (miktar_ml: number, tarih?: string) =>
  api.post('/takip/su-ekle', { miktar_ml, tarih });
export const suGunlukGetir = (tarih?: string) =>
  api.get('/takip/su-gunluk', tarih ? { params: { tarih } } : undefined);

// ── Antrenman ────────────────────────────────────────────────────────────────
export const egzersizleriGetir  = (kas_grubu?: string, arama?: string) =>
  api.get('/antrenman/egzersizler', { params: { kas_grubu, arama } });
export const sablonlariGetir    = () => api.get('/antrenman/sablonlar');
export const sablonOlustur      = (veri: object) => api.post('/antrenman/sablon-olustur', veri);
export const antrenmanBaslat    = (veri: { sablon_id?: string; antrenman_adi?: string }) =>
  api.post('/antrenman/baslat', veri);
export const setEkle            = (veri: object) => api.post('/antrenman/set-ekle', veri);
export const setGuncelle        = (setId: string, veri: object) =>
  api.put(`/antrenman/set-guncelle/${setId}`, veri);
export const antrenmanBitir     = (logId: string, veri: object) =>
  api.post(`/antrenman/bitir/${logId}`, veri);
export const antrenmanGecmisi   = (limit = 10) =>
  api.get('/antrenman/gecmis', { params: { limit } });
export const antrenmanIstatistik = () => api.get('/antrenman/istatistik');
export const egzersizGecmisi    = (egzersizId: string) =>
  api.get(`/antrenman/egzersiz-gecmis/${egzersizId}`);

// ── AI Koç ───────────────────────────────────────────────────────────────────
export const aiAnalizCalistir   = () => api.post('/ai/analiz-calistir');
export const aiOnerileriGetir   = () => api.get('/ai/oneriler');
export const aiOneriOkundu      = (oneriId: string) => api.put(`/ai/oneri-okundu/${oneriId}`);
export const aiSohbet           = (mesaj: string, gecmis: object[]) =>
  api.post('/ai/sohbet', { mesaj, gecmis });

export default api;
