# 💸 Comptes Clars

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-7.0-purple?logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-cyan?logo=tailwindcss)
![Llicència](https://img.shields.io/badge/license-MIT-green)

**Comptes Clars** és una aplicació web moderna ("Single Page Application") dissenyada per gestionar despeses compartides en grup de manera eficient, privada i en temps real.

A diferència d'altres aplicacions comercials, aquesta eina no requereix registre d'usuari, respecta la privacitat de les dades i utilitza un algorisme de liquidació de deutes optimitzat.

🔗 **Demo:** [Afegeix aquí el teu enllaç de Vercel]

## ✨ Característiques Principals

* **⚡ Sincronització en Temps Real:** Totes les despeses i canvis s'actualitzen instantàniament a tots els dispositius connectats (via Firestore WebSockets).
* **🧭 Navegació Intel·ligent:** Sistema de rutes dinàmiques (`/trip/:id`) que permet compartir un viatge simplement enviant l'enllaç per WhatsApp.
* **🔒 Seguretat i Privacitat:** Autenticació anònima i regles de seguretat estrictes a la base de dades. Les dades només són accessibles amb el codi del viatge.
* **⚖️ Algorisme de Deutes:** Càlcul automàtic de balanços i simplificació de pagaments per minimitzar el nombre de transaccions necessàries.
* **💾 Persistència Local:** L'aplicació recorda automàticament l'últim viatge visitat.

## 🛠️ Stack Tecnològic

* **Core:** React 19 + Vite (Build ultra-ràpid).
* **Estils:** Tailwind CSS + Lucide React (Iconografia).
* **Backend (BaaS):** Firebase (Firestore Database + Authentication).
* **Routing:** React Router DOM.
* **Desplegament:** Optimitzat per a Vercel.

## 🚀 Guia d'Instal·lació (Local)

Segueix aquests passos per executar el projecte al teu entorn local:

### 1. Clonar el repositori
```bash
git clone [https://github.com/tonitapias/comptes-clars.git](https://github.com/tonitapias/comptes-clars.git)
cd comptes-clars

```

### 2. Instal·lar dependències

```bash
npm install

```

### 3. Configuració de l'Entorn (CRÍTIC)

Aquest projecte utilitza variables d'entorn per seguretat. Crea un fitxer anomenat `.env.local` a l'arrel del projecte i afegeix-hi les teves claus de Firebase:

```env
VITE_FIREBASE_API_KEY=la_teva_api_key
VITE_FIREBASE_AUTH_DOMAIN=el_teu_projecte.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=el_teu_project_id
VITE_FIREBASE_STORAGE_BUCKET=el_teu_projecte.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=el_teu_sender_id
VITE_FIREBASE_APP_ID=la_teva_app_id

```

> **Nota:** Pots obtenir aquestes claus creant un projecte gratuït a [Firebase Console](https://console.firebase.google.com/).

### 4. Executar en desenvolupament

```bash
npm run dev

```

Obre `http://localhost:5173` al teu navegador.

## 🛡️ Configuració de Seguretat (Firebase)

Per evitar que la base de dades caduqui o sigui vulnerable, és imprescindible configurar les **Firestore Rules** a la consola de Firebase amb el següent codi:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permet accés només si l'usuari coneix l'ID exacte del document (viatge)
    match /artifacts/comptes-clars-v1/public/data/trips/{tripId} {
      allow read, write: if true;
    }
  }
}

```

## 📦 Desplegament a Producció

La manera més senzilla de publicar l'app és utilitzant **Vercel**:

1. Puja el codi al teu GitHub.
2. Importa el repositori des de Vercel.
3. A la configuració del projecte a Vercel (**Settings > Environment Variables**), afegeix manualment les claus que tens al fitxer `.env.local`.
4. Fes clic a **Deploy**.

## 🤝 Contribució

Les contribucions són benvingudes! Si vols millorar el codi:

1. Fes un *Fork* del projecte.
2. Crea una branca nova (`git checkout -b feature/nova-millora`).
3. Fes *Commit* dels teus canvis.
4. Obre un *Pull Request*.

## 📄 Llicència

Distribuït sota la llicència MIT. Vegeu `LICENSE` per a més informació.

```

```