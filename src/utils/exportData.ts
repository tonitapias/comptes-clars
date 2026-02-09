// src/utils/exportData.ts
import { TripData } from '../types';

/**
 * Descarrega l'objecte TripData com un fitxer JSON al dispositiu de l'usuari.
 */
export const downloadBackup = (tripData: TripData) => {
  try {
    // Convertim les dades a string JSON amb format (indentació de 2 espais)
    const jsonString = JSON.stringify(tripData, null, 2);
    
    // Creem un Blob (objecte binari) amb tipus JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Creem una URL temporal per al Blob
    const url = URL.createObjectURL(blob);
    
    // Creem un element <a> invisible per forçar la descàrrega
    const link = document.createElement('a');
    link.href = url;
    
    // Generem un nom de fitxer amb la data actual: backup-NomViatge-YYYY-MM-DD.json
    const dateStr = new Date().toISOString().split('T')[0];
    const safeName = tripData.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.download = `backup-${safeName}-${dateStr}.json`;
    
    // Afegim al DOM, cliquem i eliminem
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Alliberem memòria
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error generant el backup:', error);
    alert('Hi ha hagut un error en generar la còpia de seguretat.');
  }
};