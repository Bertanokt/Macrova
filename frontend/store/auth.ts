import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// ── SecureStore wrapper (Expo Go + web uyumlu) ────────────────────────────
const safeStore = {
  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      await AsyncStorage.setItem(key, value); // web/emülatör fallback
    }
  },
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      await AsyncStorage.removeItem(key);
    }
  },
};

// ── Store tipi ─────────────────────────────────────────────────────────────
interface AuthStore {
  token:         string | null;
  kullaniciId:   string | null;
  yuklendi:      boolean;
  tokenAyarla:   (token: string, kullaniciId: string, refreshToken?: string) => Promise<void>;
  tokenGuncelle: (yeniToken: string, yeniRefresh?: string) => Promise<void>;
  cikisYap:      () => Promise<void>;
  tokenYukle:    () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token:       null,
  kullaniciId: null,
  yuklendi:    false,

  // Giriş/kayıt sonrası — access + refresh token güvenli depola
  tokenAyarla: async (token, kullaniciId, refreshToken) => {
    await safeStore.set('token', token);
    await safeStore.set('kullaniciId', kullaniciId);
    if (refreshToken) await safeStore.set('refresh_token', refreshToken);
    set({ token, kullaniciId });
  },

  // Token yenileme sonrası state güncelle
  tokenGuncelle: async (yeniToken, yeniRefresh) => {
    await safeStore.set('token', yeniToken);
    if (yeniRefresh) await safeStore.set('refresh_token', yeniRefresh);
    set({ token: yeniToken });
  },

  // Çıkış — tüm token'ları temizle
  cikisYap: async () => {
    await safeStore.remove('token');
    await safeStore.remove('refresh_token');
    await safeStore.remove('kullaniciId');
    set({ token: null, kullaniciId: null });
  },

  // Uygulama başlangıcında token'ı yükle
  tokenYukle: async () => {
    try {
      const token       = await safeStore.get('token');
      const kullaniciId = await safeStore.get('kullaniciId');
      set({ token, kullaniciId, yuklendi: true });
    } catch {
      set({ yuklendi: true });
    }
  },
}));

// Refresh token'a interceptor'dan erişim için
export const getRefreshToken = (): Promise<string | null> =>
  safeStore.get('refresh_token');
