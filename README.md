# 💸 Comptes Clars

**Comptes Clars** és una aplicació web progressiva (PWA) per gestionar i dividir despeses de viatges i grups de manera justa i sense complicacions. Permet fer un seguiment de qui ha pagat què i calcula automàticament els deutes per liquidar els comptes amb el mínim nombre de transaccions possible.

![Estat del projecte](https://img.shields.io/badge/Estat-En%20Producci%C3%B3-green)
![Llicència](https://img.shields.io/badge/Llic%C3%A8ncia-MIT-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%2B%20Auth-FFCA28?logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)

## ✨ Funcionalitats Principals

* **👥 Gestió de Grups i Viatges:** Crea grups il·limitats i comparteix-los amb un codi curt o un enllaç/QR d'invitació.
* **💰 Registre de Despeses Flexible:**
  * **Repartiment Igualitari:** Divideix entre tots o només entre persones específiques.
  * **Repartiment Exacte:** Assigna un import concret a cada persona.
  * **Per Parts o Percentatges:** Ideal quan algú ha de pagar més (o menys) que la resta — p. ex. algú compta per 2, o el 40%.
* **💱 Múltiples Monedes:** Suport per a EUR, USD, GBP, JPY i MXN, amb format numèric localitzat per moneda.
* **📊 Càlcul de Balanços en Temps Real:** Visualitza a l'instant qui deu diners i a qui, amb precisió de cèntims (tot l'import es representa com a enters, mai en coma flotant).
* **🔄 Algoritme de Liquidació Intel·ligent:** Calcula el nombre mínim de transferències necessàries perquè tothom quedi en pau.
* **💳 Liquidació de Deutes:** Marca un deute com a pagat (efectiu, Bizum, transferència o targeta) i mantén l'historial de totes les liquidacions, amb opció d'anul·lar-les.
* **📝 Registre d'Activitat:** Cada acció del grup (despesa afegida, editada o esborrada, algú que s'hi uneix, un deute liquidat...) queda enregistrada amb qui i quan.
* **📄 Exportació de Dades:** Genera un informe PDF del viatge, o descarrega'n una còpia de seguretat completa en JSON.
* **📱 PWA Instal·lable:** Funciona com una app nativa al mòbil, amb suport *offline* (les dades es desen localment i se sincronitzen quan torna la connexió).
* **🔐 Autenticació:** Entra amb Google o amb correu i contrasenya. Pots afegir participants que encara no tenen compte (queden com a "convidats"); més endavant poden reclamar el seu perfil vinculant-hi el seu propi compte.
* **✨ Detalls d'Experiència:** Feedback hàptic, animacions natives i algun *Easter Egg* interactiu amagat per l'app.

## 🏗️ Arquitectura, Rendiment i Seguretat

* **Estat Aïllat:** Contextos de React separats (dades del viatge vs. despeses) per evitar re-renders innecessaris de la UI.
* **Transaccions Atòmiques:** Ús de `writeBatch` de Firestore perquè una escriptura (despesa + registre d'activitat, per exemple) no pugui quedar a mig fer.
* **Lectures Optimitzades:** Subcol·leccions per a despeses, pagaments i registre d'activitat (en lloc d'arrays creixents al document del viatge) i paginació dels *listeners* en temps real.
* **Type Safety:** Validació d'entrada amb Zod i *branded types* (`MoneyCents`) perquè un import en cèntims no es pugui confondre mai amb un número qualsevol.
* **Regles de seguretat de Firestore** escopades per pertinença al viatge, amb una suite de tests d'integració pròpia contra l'emulador real (`npm run test:rules`) que s'executa a cada canvi via CI.
* **Firebase App Check** (reCAPTCHA Enterprise) en producció, per protegir Firestore de tràfic que no vingui de l'app real.
* **Monitorització d'errors** en producció amb Sentry.

## 🛠️ Tecnologies Utilitzades

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [React Router](https://reactrouter.com/)
* **Estils i UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (icones)
* **Backend:** [Firebase Firestore](https://firebase.google.com/docs/firestore), [Firebase Authentication](https://firebase.google.com/docs/auth) i [App Check](https://firebase.google.com/docs/app-check)
* **Validació i Tipatge:** [Zod](https://zod.dev/)
* **Generació de PDF:** [jsPDF](https://github.com/parallax/jsPDF) i [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)
* **Internacionalització:** [i18next](https://www.i18next.com/) / react-i18next (infraestructura preparada; ara mateix el contingut només està en català)
* **Monitorització:** [Sentry](https://sentry.io/)
* **Tests i qualitat:** [Vitest](https://vitest.dev/) (motor de càlcul), [@firebase/rules-unit-testing](https://firebase.google.com/docs/rules/unit-tests) (regles de Firestore), [ESLint 9](https://eslint.org/) + typescript-eslint

## 📱 Estructura del Projecte

```text
src/
├── components/       # Components de UI pur (Botons, Avatars, Toasts...)
│   ├── modals/       # Finestres modals (Crear despesa, Grup, Ajustos...)
│   └── trip/         # Vistes específiques (Llistes de despeses, Balanços, Easter Eggs...)
├── config/           # Inicialització de Firebase, rutes de Firestore i regles de negoci
├── context/          # Providers d'estat global (Auth, Trip)
├── hooks/            # Custom Hooks (càlculs, mutacions, migració de dades, estat offline...)
├── pages/            # Vistes arrel (LandingPage, TripPage)
├── services/         # Capa de serveis (crides a Firestore, transaccions)
├── types/            # Definicions de TypeScript i branded types
├── utils/            # Formatadors, validació, exportació i gestió d'errors
└── App.tsx           # Enrutament i layout principal

firestore-tests/       # Tests d'integració de firestore.rules (npm run test:rules)
functions/              # Cloud Functions (esquelet preparat per a lògica de servidor futura)
```

## 🚀 Instal·lació i Desenvolupament en Local

### 1. Clonar el repositori

```bash
git clone https://github.com/tonitapias/comptes-clars.git
cd comptes-clars
```

### 2. Instal·lar dependències

```bash
npm install
```

### 3. Configurar Firebase

1. Crea un projecte a [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Firestore Database** i **Authentication** (mètodes: Google i Correu/contrasenya).
3. Crea un fitxer **`.env.local`** a l'arrel del projecte (no `.env` — aquest sí que està al `.gitignore`) amb les teves credencials web:

```env
VITE_FIREBASE_API_KEY=la_teva_api_key
VITE_FIREBASE_AUTH_DOMAIN=el_teu_projecte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=el_teu_projecte_id
VITE_FIREBASE_STORAGE_BUCKET=el_teu_projecte.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=el_teu_sender_id
VITE_FIREBASE_APP_ID=el_teu_app_id

# Opcionals — l'app funciona sense, però amb menys cobertura
VITE_FIREBASE_MEASUREMENT_ID=el_teu_measurement_id   # Firebase Analytics
VITE_RECAPTCHA_SITE_KEY=la_teva_site_key             # App Check (reCAPTCHA Enterprise), només en producció
VITE_SENTRY_DSN=el_teu_dsn                           # Monitorització d'errors
```

4. **Desplega les regles de seguretat de Firestore.** Sense aquest pas, el projecte de Firebase que acabes de crear no tindrà cap regla real aplicada:

```bash
npm install -g firebase-tools   # si encara no la tens
firebase login
firebase use --add              # tria el teu projecte, alias "default"
firebase deploy --only firestore:rules
```

### 4. Executar l'entorn de desenvolupament

```bash
npm run dev
```

## ✅ Tests

```bash
npm run test          # Suite de tests unitaris (motor de càlcul de despeses)
npm run lint           # ESLint
npm run type-check     # Comprovació de tipus amb tsc
npm run test:rules     # Tests d'integració de firestore.rules contra l'emulador local
                        # (requereix Java 21+ instal·lat)
```

## 📦 Desplegament

El projecte està preparat per a **Vercel**. El fitxer `vercel.json` gestiona l'enrutament de la SPA i envia la capçalera `Cross-Origin-Opener-Policy: same-origin-allow-popups`, necessària perquè l'autenticació amb Google via finestra emergent funcioni correctament en mòbil.

```bash
npm i -g vercel
vercel --prod
```

Les regles de Firestore **no** es despleguen amb Vercel — són independents del *hosting* del frontend. Si les modifiques, cal tornar a fer `firebase deploy --only firestore:rules`.

## 🤝 Contribució

Les contribucions són benvingudes:

1. Fes un *Fork* del projecte.
2. Crea una branca per a la teva funcionalitat (`git checkout -b feature/NovaFuncio`).
3. Fes *commit* dels teus canvis (`git commit -m 'feat: Afegeix nova funció'`).
4. Puja-ho al teu repositori (`git push origin feature/NovaFuncio`).
5. Obre un *Pull Request*.

## 📄 Llicència

Aquest projecte es distribueix sota la llicència **MIT**. Consulta el fitxer [`LICENSE`](./LICENSE) per als detalls.

---

<div align="center">
<p>
Fet amb ❤️ per <a href="https://github.com/tonitapias" target="_blank"><b>Toni Tapias</b></a>
</p>
<p>
Comptes Clars © 2026
</p>
</div>
