# Comptes Clars 💸

**Comptes Clars** és una aplicació web moderna dissenyada per gestionar i dividir despeses de viatges o esdeveniments en grup de manera senzilla i transparent.

L'aplicació calcula automàticament qui deu diners a qui, permetent liquidar deutes de la manera més eficient possible. Funciona com una **PWA (Progressive Web App)**, la qual cosa significa que es pot instal·lar al mòbil i utilitzar com una aplicació nativa.

## 🚀 Característiques Principals

- **Creació de Grups:** Crea viatges i comparteix el codi únic perquè els amics s'hi uneixin.
- **Gestió de Despeses:** Afegeix despeses especificant qui ha pagat i qui hi participa (per categories).
- **Càlcul de Balanços:** Algoritme automàtic per minimitzar el nombre de transferències necessàries per quadrar comptes.
- **Núvol i Sincronització:** Tot es guarda a **Firebase (Firestore)** en temps real.
- **Sistema d'Usuaris:**
  - Login segur amb **Google**.
  - Secció **"Els meus viatges"** per recuperar grups antics.
  - Opció per abandonar/treure viatges de la llista personal.
- **Exportació:** Genera un informe en **PDF** amb el resum de despeses.
- **100% Instal·lable (PWA):** Disseny *mobile-first*, funciona sense connexió (memòria cau) i es pot afegir a la pantalla d'inici.

## 🛠️ Tecnologies Utilitzades

- **Frontend:** React, TypeScript, Vite.
- **Estils:** Tailwind CSS.
- **Base de Dades:** Firebase Firestore.
- **Autenticació:** Firebase Auth (Google Provider).
- **Icones:** Lucide React.
- **PWA:** Vite Plugin PWA.
- **Desplegament:** Vercel.

## ⚙️ Instal·lació i Configuració Local

### 1. Requisits Previs
- Tenir instal·lat [Node.js](https://nodejs.org/).
- Tenir un projecte creat a [Firebase Console](https://console.firebase.google.com/).

### 2. Clonar i Instal·lar
```bash
git clone [https://github.com/el-teu-usuari/comptes-clars.git](https://github.com/el-teu-usuari/comptes-clars.git)
cd comptes-clars
npm install

```

### 3. Configuració de Variables d'Entorn

Crea un fitxer `.env.local` a l'arrel del projecte amb les teves claus de Firebase:

```env
VITE_FIREBASE_API_KEY=la_teva_api_key
VITE_FIREBASE_AUTH_DOMAIN=el-teu-projecte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=el-teu-projecte-id
VITE_FIREBASE_STORAGE_BUCKET=el-teu-projecte.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=el-teu-sender-id
VITE_FIREBASE_APP_ID=la-teva-app-id

```

### 4. Executar en local

```bash
npm run dev

```

Obre el navegador a `http://localhost:5173`.

## ☁️ Configuració de Firebase

Perquè l'aplicació funcioni correctament, has de configurar dos serveis a la consola de Firebase:

### Authentication

1. Activa el mètode d'inici de sessió **Google**.
2. Afegeix el teu domini de producció (ex: `comptes-clars.vercel.app`) a **Authorized Domains** (Settings -> Authentication).

### Firestore Database

1. Crea una base de dades.
2. A la pestanya **Rules**, configura aquestes regles de seguretat:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}

```

## 📱 Generar la PWA (Icones)

Perquè l'aplicació sigui instal·lable, assegura't que la carpeta `public/` conté les icones necessàries:

* `pwa-192x192.png`
* `pwa-512x512.png`
* `favicon.ico`
* `apple-touch-icon.png` (Opcional, per iOS)

## 🌍 Desplegament a Vercel

1. Importa el projecte des de GitHub a Vercel.
2. A la configuració del projecte a Vercel, ves a **Environment Variables**.
3. Afegeix totes les variables del fitxer `.env.local` (una per una).
4. **Important:** Assegura't que `VITE_FIREBASE_PROJECT_ID` coincideix exactament amb l'ID del teu projecte a Firebase.
5. Fes el desplegament!

## 📄 Llicència

Aquest projecte és de codi obert.

---

Fet amb ❤️ per Toni Tapias.

```

```