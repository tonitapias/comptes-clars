# 💸 Comptes Clars

**Comptes Clars** és una aplicació web moderna i robusta per gestionar despeses compartides en grups. Ideal per a viatges, companys de pis, regals conjunts o sopars d'amics.

L'aplicació permet crear grups, afegir despeses en temps real, veure qui deu a qui i liquidar els deutes de la manera més eficient possible.

![Comptes Clars Screenshot](https://via.placeholder.com/800x400?text=Comptes+Clars+Preview)

## ✨ Característiques Principals

* **🎯 Precisió Comptable Absoluta:** Sistema intern basat en enters (cèntims) per eliminar completament els errors d'arrodoniment de coma flotant.
* **👥 Gestió de Grups:** Creació de grups il·limitats per a qualsevol context (viatge, pis, esdeveniment...).
* **⚡ Temps Real i Concurrent:** Sincronització instantània amb Firebase. Ús d'`arrayUnion` per garantir la integritat de les dades quan múltiples usuaris editen alhora.
* **📄 Exportació a PDF:** Generació d'informes professionals amb el resum de despeses, balanços i pla de liquidació.
* **🧠 Algorisme de Liquidació:** Càlcul automàtic de "qui paga a qui" per minimitzar el nombre de transaccions necessàries.
* **💸 Liquidació Detallada:** Registre de pagaments especificant el mètode (Bizum, Efectiu, Transferència, PayPal).
* **📊 Estadístiques Visuals:** Gràfics de distribució de despeses per categories.
* **📱 Disseny Responsive:** Interfície adaptada a mòbils i escriptori amb una experiència d'usuari (UX) fluida.

## 🛠️ Stack Tecnològic

* **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Llenguatge:** [TypeScript](https://www.typescriptlang.org/)
* **Estils:** [Tailwind CSS](https://tailwindcss.com/)
* **Base de Dades:** [Firebase Firestore](https://firebase.google.com/)
* **Generació PDF:** `jspdf` + `jspdf-autotable`
* **Icones:** `lucide-react`

## 🚀 Instal·lació i Posada en Marxa

Segueix aquests passos per executar el projecte en local:

### 1. Clonar el repositori
```bash
git clone [https://github.com/el-teu-usuari/comptes-clars.git](https://github.com/el-teu-usuari/comptes-clars.git)
cd comptes-clars

```

### 2. Instal·lar dependències

```bash
npm install

```

### 3. Configuració de Firebase

Crea un fitxer `.env` o modifica `src/config/firebase.ts` amb les teves credencials de Firebase:

```typescript
const firebaseConfig = {
  apiKey: "LA_TEVA_API_KEY",
  authDomain: "EL_TEU_PROJECTE.firebaseapp.com",
  projectId: "EL_TEU_PROJECTE",
  storageBucket: "EL_TEU_PROJECTE.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

```

### 4. Executar en local

```bash
npm run dev

```

Obre `http://localhost:5173` al teu navegador.

## 🧮 Com funciona el sistema de cèntims?

Per evitar problemes com `10€ / 3 = 3.3333...`, l'aplicació guarda tots els imports com a **Enters (Cèntims)** a la base de dades:

* Visualització: `10,00 €`
* Base de Dades: `1000`

En dividir despeses, s'utilitza un algorisme de repartiment de residu:

* *Exemple:* 1000 cèntims entre 3 persones.
* Persona 1: 334 cèntims.
* Persona 2: 333 cèntims.
* Persona 3: 333 cèntims.
* **Total:** 1000 (Exacte).

## 📂 Estructura del Projecte

```text
src/
├── components/      # Components reutilitzables (Card, Button, Modals...)
├── config/          # Configuració de Firebase
├── hooks/           # Lògica personalitzada (useTripCalculations)
├── pages/           # Vistes principals (LandingPage, TripPage)
├── types/           # Definicions de tipus TypeScript
├── utils/           # Utilitats (exportPdf, constants)
└── main.tsx         # Punt d'entrada

```

## 🤝 Contribució

Les contribucions són benvingudes! Si trobes un error o vols proposar una millora:

1. Fes un Fork del projecte.
2. Crea una branca (`git checkout -b feature/nova-millora`).
3. Fes Commit (`git commit -m 'Feat: Afegir nova millora'`).
4. Fes Push (`git push origin feature/nova-millora`).
5. Obre un Pull Request.

---

Creat amb ❤️ per gestionar els teus comptes sense mals de cap.

```

```