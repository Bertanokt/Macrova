import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n, { DilKodu } from '../constants/i18n';

interface DilStore {
  dil: DilKodu;
  t: (key: string, opts?: object) => string;
  dilYukle: () => Promise<void>;
  dilAyarla: (dil: DilKodu) => Promise<void>;
}

const makeTFunc = (dil: DilKodu) => (key: string, opts?: object) => {
  i18n.locale = dil;
  return i18n.t(key, opts);
};

export const useDilStore = create<DilStore>((set) => ({
  dil: i18n.locale as DilKodu,
  t: makeTFunc(i18n.locale as DilKodu),

  dilYukle: async () => {
    const kayitli = (await AsyncStorage.getItem('dil_secim')) as DilKodu | null;
    if (kayitli) {
      i18n.locale = kayitli;
      set({ dil: kayitli, t: makeTFunc(kayitli) });
    }
  },

  dilAyarla: async (dil: DilKodu) => {
    await AsyncStorage.setItem('dil_secim', dil);
    i18n.locale = dil;
    set({ dil, t: makeTFunc(dil) });
  },
}));
