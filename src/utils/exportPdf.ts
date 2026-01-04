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
  const indigoColor = [79, 70, 229] as [number, number, number]; // Indigo 600

  // 1. HEADER DISSENY
  doc.setFillColor(...indigoColor);
  doc.rect(0, 0, 210, 40, 'F'); // Barra superior

  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text(tripName, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(`Informe generat el: ${new Date().toLocaleDateString('ca-ES')}`, 14, 28);

  // 2. RESUM GENERAL
  const totalCents = expenses.filter(e => e.category !== 'transfer').reduce((acc, curr) => acc + curr.amount, 0);
  
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text("Resum Econòmic", 14, 55);
  
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Despesa Total:`, 14, 62);
  
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text(`${(totalCents / 100).toFixed(2)} ${currencySymbol}`, 14, 69);

  // 3. TAULA DE BALANÇOS
  const balanceData = balances.map(b => [
    b.user,
    (b.balance / 100).toFixed(2) + ' ' + currencySymbol,
    b.balance >= 0 ? 'Recupera' : 'Ha de pagar'
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Usuari', 'Balanç', 'Estat']],
    body: balanceData,
    theme: 'grid',
    headStyles: { fillColor: indigoColor, textColor: 255, fontStyle: 'bold' },
    columnStyles: {
        1: { fontStyle: 'bold', halign: 'right' },
        2: { halign: 'center' }
    }
  });

  // 4. TAULA DE DESPESES DETALLADA
  const expenseData = expenses.map(e => [
    new Date(e.date).toLocaleDateString('ca-ES'),
    e.title,
    e.payer,
    (e.amount / 100).toFixed(2) + ' ' + currencySymbol,
    e.category === 'transfer' 
        ? 'Transferència' 
        : (e.splitType === 'exact' ? 'Exacte' : (e.splitType === 'shares' ? 'Parts' : `${e.involved.length} pers.`))
  ]);

  let finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.text("Detall de Despeses", 14, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Data', 'Concepte', 'Pagat per', 'Import', 'Tipus']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [100, 116, 139] },
    styles: { fontSize: 9 },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
  });

  // 5. LIQUIDACIONS (Pla de pagament)
  if (settlements.length > 0) {
      const settlementData = settlements.map(s => [
        s.from,
        '→ PAGA A →',
        s.to,
        (s.amount / 100).toFixed(2) + ' ' + currencySymbol
      ]);

      finalY = (doc as any).lastAutoTable.finalY + 15;
      
      // Salt de pàgina si no cap
      if (finalY > 240) {
          doc.addPage();
          finalY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
      doc.text("Pla de Liquidació (Qui paga a qui?)", 14, finalY);

      autoTable(doc, {
        startY: finalY + 5,
        body: settlementData,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 4 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: [225, 29, 72] }, // Vermell
            1: { halign: 'center', fontSize: 8, textColor: [150, 150, 150] },
            2: { fontStyle: 'bold', textColor: [16, 185, 129] }, // Verd
            3: { halign: 'right', fontStyle: 'bold' }
        }
      });
  }

  // DESCARREGAR
  const safeFileName = tripName
    .replace(/[^a-z0-9à-úÀ-Ú\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();

  doc.save(`comptes_clars_${safeFileName || 'viatge'}.pdf`);
};