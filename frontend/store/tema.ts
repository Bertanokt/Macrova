import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AcikTema, KoyuTema, Tema } from '../constants/tema';

export type TemaSecim = 'light' | 'dark' | 'system';

interface TemaStore {
  temaSecim: TemaSecim;
  renkler: Tema;
  temaYukle: (sistemKoyu: boolean) => Promise<void>;
  temaAyarla: (secim: TemaSecim, sistemKoyu: boolean) => Promise<void>;
}

export const useTemaStore = create<TemaStore>((set) => ({
  temaSecim: 'system',
  renkler: AcikTema,

  temaYukle: async (sistemKoyu: boolean) => {
    const kayitli = (await AsyncStorage.getItem('tema_secim')) as TemaSecim | null;
    const secim: TemaSecim = kayitli ?? 'system';
    const koyu = secim === 'dark' || (secim === 'system' && sistemKoyu);
    set({ temaSecim: secim, renkler: koyu ? KoyuTema : AcikTema });
  },

  temaAyarla: async (secim: TemaSecim, sistemKoyu: boolean) => {
    await AsyncStorage.setItem('tema_secim', secim);
    const koyu = secim === 'dark' || (secim === 'system' && sistemKoyu);
    set({ temaSecim: secim, renkler: koyu ? KoyuTema : AcikTema });
  },
}));
