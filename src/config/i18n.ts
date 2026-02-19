import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { LITERALS } from '../constants/literals'; // [RISC ZERO]: Aprofitem el teu objecte existent!

// Convertim el teu objecte LITERALS en el diccionari per defecte de l'app
const resources = {
  ca: {
    translation: LITERALS 
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ca', // Idioma per defecte actual
    fallbackLng: 'ca',
    interpolation: {
      escapeValue: false // React ja protegeix contra XSS de sèrie
    }
  });

export default i18n;