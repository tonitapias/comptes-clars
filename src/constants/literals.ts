// src/constants/literals.ts
export const LITERALS = {
  ACTIONS: {
    UPDATE_SETTINGS_SUCCESS: "Configuració actualitzada",
    UPDATE_NAME_SUCCESS: "Nom canviat",
    UPDATE_ERROR: "Error actualitzant",
    SETTLE_SUCCESS: "Registrat: ",
    SETTLE_ERROR: "Error liquidant",
    DELETE_EXPENSE_SUCCESS: "Despesa eliminada",
    DELETE_EXPENSE_ERROR: "Error eliminant",
    LEAVE_TRIP_ERROR: "Error al sortir del grup",
    JOIN_TRIP_SUCCESS: "T'has unit al grup!",
    JOIN_TRIP_ERROR: "Error al unir-se",
    DELETE_TRIP_SUCCESS: "Viatge eliminat correctament",
    DELETE_TRIP_ERROR: "Error eliminant el viatge",
    CONNECTION_ERROR: "Error de connexió",
    UNEXPECTED_ERROR: "Error inesperat",
  },
  ERRORS: { // --- NOVA SECCIÓ (FASE 2) ---
    INVALID_TRIP_ID: "ID de viatge invàlid",
    FETCH_TRIPS_FAILED: "No s'han pogut carregar els viatges. Comprova la teva connexió.",
    FETCH_EXPENSES_FAILED: "No s'han pogut carregar les despeses del viatge.",
    JOIN_INVALID_CODE: "El codi no és vàlid o el projecte no existeix.",
    JOIN_TRIP_DELETED: "Aquest projecte ha estat eliminat per l'administrador.",
    PERMISSION_DENIED: "No tens permisos suficients per fer aquesta acció.",
    JOIN_FAILED: "No s'ha pogut unir al viatge. Comprova el codi.",
    TRIP_NOT_FOUND: "El viatge no existeix",
    NOT_AUTHENTICATED: "No estàs autenticat",
    LEAVE_TRIP_FAILED: "No s'ha pogut sortir del grup. Torna-ho a provar.",
    NETWORK: "Sense connexió a Internet. Revisa la teva xarxa.",
    NOT_FOUND: "No s'ha trobat la dada sol·licitada.",
    AUTH_INVALID: "Les credencials no són vàlides.",
    UNEXPECTED: "S'ha produït un error inesperat"
  },
  MODALS: {
    SETTLE: {
      TITLE: "Liquidar Deute",
      TOTAL_LABEL: "Total a Transferir",
      METHOD_LABEL: "Mètode de Pagament",
      BTN_CONFIRM: "Confirmar",
    },
    CONFIRM: { 
      DEFAULT_TITLE: "Estàs segur?",
      BTN_CANCEL: "Cancel·lar",
      BTN_DELETE: "Eliminar",
      DELETE_EXPENSE_TITLE: "Esborrar despesa?",
      DELETE_EXPENSE_MSG: "Aquesta acció no es pot desfer. La despesa desapareixerà dels càlculs immediatament.",
    },
    PAYMENT_METHODS: {
      MANUAL: "Efectiu",
      BIZUM: "Bizum",
      TRANSFER: "Banc",
      CARD: "Altres",
    },
    PAYMENT_TITLES: {
      BIZUM: "Pagament via Bizum",
      MANUAL: "Pagament en Efectiu",
      TRANSFER: "Transferència Bancària",
      CARD: "Pagament (Altres)",
      DEFAULT: "Liquidació de deute",
    }
  },
  COMMON: {
    UNKNOWN_USER: "?",
    LOADING_SESSION: "Carregant la teva sessió...", 
  }
} as const;