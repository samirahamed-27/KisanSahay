import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './translations/en.json';
import hi from './translations/hi.json';
import pa from './translations/pa.json';
import bn from './translations/bn.json';
import mr from './translations/mr.json';
import te from './translations/te.json';
import ta from './translations/ta.json';
import gu from './translations/gu.json';
import kn from './translations/kn.json';
import ml from './translations/ml.json';
import or from './translations/or.json';
import as from './translations/as.json';
import ur from './translations/ur.json';
import mai from './translations/mai.json';
import bho from './translations/bho.json';
import languagesList from './languages.json';

export interface LanguageItem {
  code: string;
  name: string;
  native: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageItem[] = languagesList;

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  pa: { translation: pa },
  bn: { translation: bn },
  mr: { translation: mr },
  te: { translation: te },
  ta: { translation: ta },
  gu: { translation: gu },
  kn: { translation: kn },
  ml: { translation: ml },
  or: { translation: or },
  as: { translation: as },
  ur: { translation: ur },
  mai: { translation: mai },
  bho: { translation: bho },
};

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: 'hi', // Default to Hindi for Indian farmers
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
