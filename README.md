# 💸 Comptes Clars

**Comptes Clars** és una aplicació web progressiva (PWA) moderna dissenyada per gestionar i dividir despeses de viatges i grups de manera justa i sense complicacions. Permet fer un seguiment de qui ha pagat què i calcula automàticament els deutes per liquidar els comptes de la manera més eficient possible.

![Estat del projecte](https://img.shields.io/badge/Estat-En%20Desenvolupament-green)
![Llicència](https://img.shields.io/badge/Llicència-MIT-blue)

## ✨ Funcionalitats Principals

* **👥 Gestió de Grups i Viatges:** Crea grups, afegeix participants i gestiona múltiples viatges.
* **💰 Registre de Despeses:** Afegeix despeses especificant qui ha pagat i qui hi participa.
* **💱 Múltiples Monedes:** Suport per a EUR, USD, GBP, JPY i MXN amb format localitzat.
* **📊 Càlcul de Balanços:** Visualitza en temps real qui deu diners i a qui.
* **🔄 Algoritme de Liquidació:** Optimitza els pagaments per reduir el nombre de transaccions necessàries per quedar en pau.
* **📄 Exportació PDF:** Genera informes detallats del viatge amb un sol clic.
* **📱 PWA Instal·lable:** Funciona com una aplicació nativa al mòbil, amb icona pròpia i sense barra de navegació.
* **🔐 Autenticació Híbrida:** Mode "Convidat" (anònim) per començar ràpidament i opció de vincular amb Google per guardar les dades.
* **☁️ Sincronització en Temps Real:** Totes les dades es guarden a Firebase Firestore i s'actualitzen a l'instant per a tots els usuaris.

## 🛠️ Tecnologies Utilitzades

El projecte està construït amb un stack modern basat en React i Firebase:

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
* **Estils:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend & Base de Dades:** [Firebase](https://firebase.google.com/) (Firestore, Auth)
* **Icones:** [Lucide React](https://lucide.dev/)
* **Generació PDF:** [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)
* **PWA:** [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

## 🚀 Instal·lació i Configuració

Segueix aquests passos per executar el projecte en local:

### 1. Clonar el repositori

```bash
git clone [https://github.com/tonitapias/comptes-clars.git](https://github.com/tonitapias/comptes-clars.git)
cd comptes-clars

```

### 2. Instal·lar dependències

```bash
npm install

```

### 3. Configurar Firebase

Crea un projecte a [Firebase Console](https://console.firebase.google.com/), habilita **Firestore Database** i **Authentication** (Google i Anonymous).

Crea un fitxer `.env` a l'arrel del projecte amb les teves credencials de Firebase:

```env
VITE_FIREBASE_API_KEY=la_teva_api_key
VITE_FIREBASE_AUTH_DOMAIN=el_teu_projecte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=el_teu_projecte_id
VITE_FIREBASE_STORAGE_BUCKET=el_teu_projecte.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=el_teu_sender_id
VITE_FIREBASE_APP_ID=el_teu_app_id

```

### 4. Executar en mode desenvolupament

```bash
npm run dev

```

L'aplicació estarà disponible a `http://localhost:5173`.

## 📜 Scripts Disponibles

* `npm run dev`: Inicia el servidor de desenvolupament amb HMR.
* `npm run build`: Compila l'aplicació per a producció.
* `npm run lint`: Executa ESLint per trobar problemes al codi.
* `npm run preview`: Previsualitza la build de producció localment.

## 📱 Estructura del Projecte

```
src/
├── components/      # Components reutilitzables (Botons, Cards, Modals...)
├── config/          # Configuració de Firebase
├── hooks/           # Custom Hooks (ex: useTripCalculations)
├── pages/           # Pàgines principals (LandingPage, TripPage)
├── types/           # Definicions de tipus TypeScript
├── utils/           # Funcions d'utilitat i constants
└── App.tsx          # Punt d'entrada i rutes

```

## 🤝 Contribució

Les contribucions són benvingudes! Si trobes un error o tens una idea per a una nova funcionalitat:

1. Fes un Fork del projecte.
2. Crea una branca per a la teva funció (`git checkout -b feature/NovaFuncio`).
3. Fes Commit dels teus canvis (`git commit -m 'Afegida nova funció'`).
4. Fes Push a la branca (`git push origin feature/NovaFuncio`).
5. Obre un Pull Request.

## 📄 Llicència

Aquest projecte està sota la llicència MIT. Consulta el fitxer `LICENSE` per a més detalls.

---

<div align="center">
<p>
Fet amb ❤️ per <a href="https://www.google.com/search?q=https://github.com/tonitapias" target="_blank"><b>Toni Tapias</b></a>
</p>
<p>
Calculadora de Despeses © 2025 • <a href="LICENSE">Llicència MIT</a>
</p>
<p>
<a href="https://www.google.com/search?q=https://github.com/tonitapias/comptes-clars/issues">Reportar un error</a> •
<a href="https://www.google.com/search?q=https://github.com/tonitapias/comptes-clars/pulls">Demanar funcionalitat</a>
</p>
</div>

```

```