import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Settlement, Balance, TripUser } from '../types';

const getName = (idOrName: string, users: TripUser[]) => {
  const u = users.find(u => u.id === idOrName);
  return u ? u.name : idOrName; 
};

export const generatePDF = (
  tripName: string, 
  expenses: Expense[], 
  balances: Balance[], 
  settlements: Settlement[],
  users: TripUser[], 
  currencySymbol: string
) => {
  const doc = new jsPDF();
  const indigoColor = [79, 70, 229] as [number, number, number];

  // 1. CAPÇALERA
  doc.setFillColor(...indigoColor);
  doc.rect(0, 0, 210, 40, 'F'); 

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(tripName.toUpperCase(), 14, 22);
  
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 200);
  doc.text(`Informe de despeses - Generat el ${new Date().toLocaleDateString('ca-ES')}`, 14, 32);

  let finalY = 50;

  // 2. RESUM GENERAL
  const totalSpending = expenses
    .filter(e => e.category !== 'transfer')
    .reduce((acc, curr) => acc + curr.amount, 0);

  doc.setFontSize(14);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text("Resum del Viatge", 14, finalY);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Despesa Total del Grup: ${(totalSpending / 100).toFixed(2).replace('.', ',')} ${currencySymbol}`, 14, finalY + 7);
  doc.text(`Membres actius: ${users.filter(u => !u.isDeleted).length}`, 14, finalY + 13);

  finalY += 25;

  // 3. TAULA DE BALANÇOS
  doc.setFontSize(14);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text("Estat de Comptes", 14, finalY);

  const balanceData = balances.map(b => {
    const isPositive = b.amount > 0;
    const amountStr = (b.amount / 100).toFixed(2).replace('.', ',') + ' ' + currencySymbol;
    return [
      getName(b.userId, users),
      isPositive ? `+ ${amountStr}` : amountStr,
      isPositive ? 'COBRA' : (b.amount < 0 ? 'DEU' : 'AL DIA')
    ];
  });

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Membre', 'Balanç', 'Estat']],
    body: balanceData,
    theme: 'grid',
    headStyles: { fillColor: indigoColor },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' } }
  });

  finalY = (doc as any).lastAutoTable.finalY + 15;

  // 4. TAULA DE DESPESES
  doc.setFontSize(14);
  doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
  doc.text("Detall de Despeses", 14, finalY);

  const expenseData = expenses.map(e => [
    new Date(e.date).toLocaleDateString('ca-ES'),
    e.title,
    getName(e.payer, users),
    (e.amount / 100).toFixed(2).replace('.', ',') + ' ' + currencySymbol,
    e.category === 'transfer' ? 'PAGAMENT' : e.category.toUpperCase()
  ]);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Data', 'Concepte', 'Pagat per', 'Import', 'Categoria']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [100, 116, 139] },
    styles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
  });

  // 5. TAULA DE LIQUIDACIONS (Pla de pagaments)
  if (settlements.length > 0) {
      finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY > 240) { doc.addPage(); finalY = 20; }

      doc.setFontSize(14);
      doc.setTextColor(indigoColor[0], indigoColor[1], indigoColor[2]);
      doc.text("Pla de Liquidació (Com tancar deutes)", 14, finalY);

      const settlementData = settlements.map(s => [
        getName(s.from, users),
        'paga a',
        getName(s.to, users),
        (s.amount / 100).toFixed(2).replace('.', ',') + ' ' + currencySymbol
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        body: settlementData,
        theme: 'plain',
        styles: { fontSize: 10, fontStyle: 'bold' },
        columnStyles: { 3: { halign: 'right', textColor: indigoColor } }
      });
  }

  doc.save(`Comptes_Clars_${tripName.replace(/\s+/g, '_')}.pdf`);
};