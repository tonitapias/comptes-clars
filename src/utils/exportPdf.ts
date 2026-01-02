import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Settlement, Balance } from '../types';

export const generatePDF = (
  tripName: string, 
  expenses: Expense[], 
  balances: Balance[], 
  settlements: Settlement[],
  currencySymbol: string
) => {
  const doc = new jsPDF();

  // 1. CAPÇALERA
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Color Indigo
  doc.text(tripName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Informe generat el: ${new Date().toLocaleDateString('ca-ES')}`, 14, 28);

  // 2. RESUM GENERAL
  const totalCents = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Despesa Total: ${(totalCents / 100).toFixed(2)} ${currencySymbol}`, 14, 40);

  // 3. TAULA DE BALANÇOS
  const balanceData = balances.map(b => [
    b.user,
    (b.balance / 100).toFixed(2) + ' ' + currencySymbol,
    b.balance >= 0 ? 'Recupera' : 'Ha de pagar'
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Usuari', 'Balanç', 'Estat']],
    body: balanceData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }
  });

  // 4. TAULA DE DESPESES (DETALL)
  const expenseData = expenses.map(e => [
    new Date(e.date).toLocaleDateString('ca-ES'),
    e.title,
    e.payer,
    (e.amount / 100).toFixed(2) + ' ' + currencySymbol,
    e.category === 'transfer' ? 'Transferència' : `${e.involved.length} pers.`
  ]);

  doc.text("Detall de Despeses", 14, (doc as any).lastAutoTable.finalY + 15);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['Data', 'Concepte', 'Pagat per', 'Import', 'Tipus']],
    body: expenseData,
    theme: 'grid',
    headStyles: { fillColor: [100, 116, 139] }, // Gris pissarra
    styles: { fontSize: 8 }
  });

  // 5. LIQUIDACIONS (OPCIONAL)
  if (settlements.length > 0) {
      const settlementData = settlements.map(s => [
        s.from,
        '→ PAGA A →',
        s.to,
        (s.amount / 100).toFixed(2) + ' ' + currencySymbol
      ]);

      // Comprovem si hi ha espai a la pàgina, si no, saltem
      let finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY > 250) {
          doc.addPage();
          finalY = 20;
      }

      doc.text("Pla de Liquidació (Pagaments)", 14, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        body: settlementData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 }
      });
  }

  // DESCARREGAR
  doc.save(`comptes_clars_${tripName.replace(/\s+/g, '_')}.pdf`);
};