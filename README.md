Aquí tens el codi brut (Raw) preparat perquè el puguis copiar i enganxar directament al teu fitxer `README.md` sense problemes de format.

**Recorda utilitzar el botó de "Copy code" (o "Copiar codi")** que apareix a la cantonada superior dreta d'aquest bloc fosc per assegurar-te que no es perd cap símbol:

```markdown
# 💸 Comptes Clars

**Comptes Clars** és una aplicació web progressiva (PWA) moderna dissenyada per gestionar i dividir despeses de viatges i grups de manera justa i sense complicacions. Permet fer un seguiment de qui ha pagat què i calcula automàticament els deutes per liquidar els comptes de la manera més eficient possible.

![Estat del projecte](https://img.shields.io/badge/Estat-En%20Producci%C3%B3-green)
![Llicència](https://img.shields.io/badge/Llic%C3%A8ncia-MIT-blue)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Supported-FFCA28?logo=firebase&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)

## ✨ Funcionalitats Principals

* **👥 Gestió de Grups i Viatges:** Crea grups il·limitats, comparteix-los fàcilment mitjançant codi i gestiona participants.
* **💰 Registre de Despeses Flexible:**
  * **Repartiment Igualitari:** Divideix entre tots o només entre persones específiques.
  * **Repartiment Exacte:** Assigna imports concrets a cada persona.
  * **Per Parts/Pesos:** Ideal per a famílies o parelles (ex: algú compta per 2).
* **💱 Múltiples Monedes:** Suport complet per a EUR, USD, GBP, JPY i MXN.
* **📊 Càlcul de Balanços en Temps Real:** Visualitza a l'instant qui deu diners i a qui, amb precisió de cèntims (*MoneyCents* pattern).
* **🔄 Algoritme de Liquidació Intel·ligent:** Optimitza els pagaments en segon pla per reduir dràsticament el nombre de transaccions necessàries per quedar en pau.
* **📄 Exportació PDF:** Genera informes detallats i professionals del viatge amb un sol clic.
* **📱 PWA Instal·lable:** Funciona com una aplicació nativa al mòbil, amb suport *offline* (sincronització asíncrona) i icona pròpia.
* **🔐 Autenticació Híbrida:** Mode "Convidat" per començar a l'instant i vinculació posterior amb Google per guardar les dades al núvol amb seguretat.
* **✨ Experiència d'Usuari Premium:** Interfície polida amb feedback hàptic, animacions 3D natives i petits *Easter Eggs* interactius.

## 🏗️ Arquitectura i Rendiment

L'aplicació ha estat dissenyada amb el rendiment i l'escalabilitat al centre:
* **Estat Aïllat:** Divisió de Contextos de React (Meta vs Expenses) per evitar re-renders innecessaris de la UI.
* **Transaccions Atòmiques:** Ús de `writeBatch` de Firestore per garantir que les dades financeres no es corrompin mai.
* **Lectures Optimitzades:** Paginació i limitació de *listeners* en temps real per protegir la memòria del dispositiu i reduir costos de base de dades.
* **Type Safety:** Validació estricta amb Zod i *Branded Types* per separar lògica financera de simples números.

## 🛠️ Tecnologies Utilitzades

* **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
* **Estils i UI:** [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Icones)
* **Backend (Serverless):** [Firebase Firestore](https://firebase.google.com/docs/firestore) & [Authentication](https://firebase.google.com/docs/auth)
* **Validació i Tipatge:** [Zod](https://zod.dev/)
* **Generació PDF:** [jsPDF](https://github.com/parallax/jsPDF) & [jspdf-autotable](https://github.com/simonbengtsson/jspdf-autotable)

## 📱 Estructura del Projecte

```text
src/
├── components/      # Components de UI pur (Botons, Avatars, Toasts...)
│   ├── modals/      # Finestres modals (Crear despesa, Ajustos...)
│   └── trip/        # Vistes específiques (Llistes de despeses, Balanços, Easter Eggs...)
├── config/          # Inicialització de Firebase i Regles de Negoci
├── context/         # Providers d'estat global optimitzats
├── hooks/           # Custom Hooks (Lògica de càlculs, mutacions, offline state...)
├── pages/           # Vistes arrel (LandingPage, TripPage)
├── services/        # Capa de Serveis (API de Firestore, Transaccions)
├── types/           # Definicions de TypeScript i Branded Types
├── utils/           # Formatadors, exports PDF i gestió d'errors
└── App.tsx          # Enrutament i Layout principal

```

## 🚀 Instal·lació i Desenvolupament en Local

Segueix aquests passos per executar el projecte a la teva màquina:

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
2. Habilita **Firestore Database** i **Authentication** (Mètodes: Google i Anònim).
3. Crea un fitxer `.env` a l'arrel del projecte amb les teves credencials web:

```env
VITE_FIREBASE_API_KEY=la_teva_api_key
VITE_FIREBASE_AUTH_DOMAIN=el_teu_projecte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=el_teu_projecte_id
VITE_FIREBASE_STORAGE_BUCKET=el_teu_projecte.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=el_teu_sender_id
VITE_FIREBASE_APP_ID=el_teu_app_id

```

### 4. Executar l'entorn de desenvolupament

```bash
npm run dev

```

## 📦 Desplegament

El projecte està preparat per a entorns de producció com **Vercel** o **Netlify**.

### Vercel (Recomanat)

El fitxer `vercel.json` ja està configurat per gestionar l'enrutament de la SPA i injectar les **capçaleres de seguretat (COOP/COEP)** necessàries perquè l'autenticació amb Google funcioni correctament en dispositius mòbils.

1. Instal·la la CLI de Vercel: `npm i -g vercel`
2. Executa el desplegament:

```bash
vercel --prod

```

## 🤝 Contribució

Les contribucions són totalment benvingudes! Si vols millorar l'app o solucionar un bug:

1. Fes un *Fork* del projecte.
2. Crea una branca per a la teva funcionalitat (`git checkout -b feature/NovaFuncio`).
3. Fes *Commit* dels teus canvis (`git commit -m 'feat: Afegeix nova funció'`).
4. Puja-ho al teu repositori (`git push origin feature/NovaFuncio`).
5. Obre un *Pull Request* i ho revisarem.

## 📄 Llicència

Aquest projecte es distribueix sota la llicència **MIT**. Consulta el fitxer `LICENSE` per a més detalls.

---

<div align="center">
<p>
Fet amb ❤️ per <a href="https://www.google.com/search?q=https://github.com/tonitapias" target="_blank"><b>Toni Tapias</b></a>
</p>
<p>
Comptes Clars © 2025
</p>
</div>

```

```