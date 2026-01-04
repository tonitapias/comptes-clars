# 💸 Comptes Clars

**Comptes Clars** és una aplicació web progressiva (PWA) moderna dissenyada per gestionar i dividir despeses de viatges i grups de manera justa i sense complicacions. Permet fer un seguiment de qui ha pagat què i calcula automàticament els deutes per liquidar els comptes de la manera més eficient possible.

![Estat del projecte](https://img.shields.io/badge/Estat-En%20Producció-green)
![Llicència](https://img.shields.io/badge/Llicència-MIT-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Supported-FFCA28?logo=firebase&logoColor=black)

## ✨ Funcionalitats Principals

* **👥 Gestió de Grups i Viatges:** Crea grups il·limitats, comparteix-los mitjançant codi i gestiona participants.
* **💰 Registre de Despeses Flexible:**
  * **Repartiment Igualitari:** Divideix entre tots o persones específiques.
  * **Repartiment Exacte:** Assigna imports concrets a cada persona.
  * **Per Parts/Pesos:** Ideal per a famílies o parelles (ex: algú compta per 2).
* **💱 Múltiples Monedes:** Suport complet per a EUR, USD, GBP, JPY i MXN.
* **📊 Càlcul de Balanços en Temps Real:** Visualitza a l'instant qui deu diners i a qui, amb precisió de cèntims.
* **🔄 Algoritme de Liquidació:** Optimitza els pagaments per reduir el nombre de transaccions necessàries per quedar en pau.
* **📄 Exportació PDF:** Genera informes detallats i professionals del viatge amb un sol clic.
* **📱 PWA Instal·lable:** Funciona com una aplicació nativa al mòbil, amb suport *offline* i icona pròpia.
* **🔐 Autenticació Híbrida:** Mode "Convidat" per començar ràpidament i vinculació amb Google per guardar les dades al núvol.
* **⚡ Arquitectura Robusta:** Gestió de dades atòmica per evitar errors de sincronització (ex: reanomenar usuaris massivament sense perdre dades).

## 🛠️ Tecnologies Utilitzades

El projecte utilitza un stack modern basat en React 19 i una arquitectura per capes:

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
* **Estils:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend (Serverless):** [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Authentication](https://firebase.google.com/docs/auth)
* **Gestió d'Estat:** Custom Hooks + Service Layer Pattern.
* **Icones:** [Lucide React](https://lucide.dev/)
* **PDF:** [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)

## 📱 Estructura del Projecte

L'aplicació segueix una arquitectura neta separant la lògica de negoci de la interfície:

```bash
src/
├── components/      # Components de UI (Botons, Cards, Modals...)
│   ├── modals/      # Modals específics (ExpenseModal, GroupModal...)
│   └── trip/        # Vistes parcials del viatge (ExpensesList, Balances...)
├── config/          # Inicialització de Firebase
├── hooks/           # Custom Hooks (useTripData, useTripCalculations...)
├── pages/           # Pàgines principals (LandingPage, TripPage)
├── services/        # Capa de Serveis (Lògica d'escriptura a Firebase)
├── types/           # Definicions de tipus TypeScript
├── utils/           # Funcions d'utilitat, constants i exportació PDF
└── App.tsx          # Enrutament i Layout principal

```

## 🚀 Instal·lació i Desenvolupament

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

1. Crea un projecte a [Firebase Console](https://console.firebase.google.com/).
2. Habilita **Firestore Database** i **Authentication** (Google i Anonymous).
3. Crea un fitxer `.env` a l'arrel del projecte amb les teves credencials:

```env
VITE_FIREBASE_API_KEY=la_teva_api_key
VITE_FIREBASE_AUTH_DOMAIN=el_teu_projecte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=el_teu_projecte_id
VITE_FIREBASE_STORAGE_BUCKET=el_teu_projecte.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=el_teu_sender_id
VITE_FIREBASE_APP_ID=el_teu_app_id

```

### 4. Executar en local

```bash
npm run dev

```

## 📦 Desplegament

El projecte està configurat per desplegar-se fàcilment a **Vercel** o **Netlify**.

### Vercel (Recomanat)

El fitxer `vercel.json` ja està inclòs per gestionar les rutes de la SPA i les capçaleres de seguretat (COOP/COEP) necessàries per a l'autenticació de Google.

1. Instal·la Vercel CLI: `npm i -g vercel`
2. Executa el desplegament:
```bash
vercel --prod

```



## 🤝 Contribució

Les contribucions són benvingudes! Si tens una idea per millorar l'app:

1. Fes un Fork del projecte.
2. Crea una branca (`git checkout -b feature/NovaFuncio`).
3. Fes Commit (`git commit -m 'Afegida nova funció'`).
4. Fes Push (`git push origin feature/NovaFuncio`).
5. Obre un Pull Request.

## 📄 Llicència

Aquest projecte està sota la llicència MIT. Consulta el fitxer `LICENSE` per a més detalls.

---

<div align="center">
<p>
Fet amb ❤️ per <a href="https://www.google.com/search?q=https://github.com/tonitapias" target="_blank"><b>Toni Tapias</b></a>
</p>
<p>
Calculadora de Despeses © 2025
</p>
</div>

```

```