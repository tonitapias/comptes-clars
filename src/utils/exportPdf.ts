// src/utils/exportPdf.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Settlement, Balance, TripUser, Payment } from '../types';
import { CATEGORIES } from './constants';

// Extensió de tipus per evitar 'as any'
interface jsPDFWithPlugin extends jsPDF {
  lastAutoTable?: {
    finalY: number;
  };
}

// --- HELPERS INTERNS ---

const formatMoney = (cents: number, symbol: string) => {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR', 
    minimumFractionDigits: 2
  }).format(cents / 100).replace('€', symbol);
};

const getName = (idOrName: string, users: TripUser[]) => {
  const u = users.find(u => u.id === idOrName);
  return u ? u.name : idOrName; 
};

// --- GENERADOR PRINCIPAL ---

export const generatePDF = (
  tripName: string, 
  expenses: Expense[], 
  payments: Payment[], // [NOU]: Afegim l'array de pagaments purs
  balances: Balance[], 
  settlements: Settlement[],
  users: TripUser[], 
  currencySymbol: string
) => {
  const doc = new jsPDF() as jsPDFWithPlugin;
  
  // Colors Corporatius (Indigo / Slate / Emerald / Rose)
  const COLORS = {
    primary: [79, 70, 229] as [number, number, number],
    secondary: [100, 116, 139] as [number, number, number],
    success: [16, 185, 129] as [number, number, number],
    danger: [239, 68, 68] as [number, number, number],
    text: [30, 41, 59] as [number, number, number],
  };

  // 1. CAPÇALERA PROFESSIONAL
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 45, 'F'); 

  // Títol
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text(tripName.substring(0, 30).toUpperCase(), 14, 25);
  
  // Subtítol i Data
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`Informe de Comptes Clars • Generat el ${new Date().toLocaleDateString('ca-ES')}`, 14, 35);

  let finalY = 60;

  // 2. RESUM EXECUTIU (KPIs)
  const validExpenses = expenses.filter(e => e.category !== 'transfer');
  const totalSpending = validExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const avgPerPerson = users.length > 0 ? totalSpending / users.length : 0;

  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text("Resum General", 14, finalY);
  
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Despeses:`, 14, finalY + 8);
  doc.text(`Mitjana per persona:`, 14, finalY + 14);
  doc.text(`Membres actius:`, 14, finalY + 20);

  doc.setFont('helvetica', 'bold');
  doc.text(formatMoney(totalSpending, currencySymbol), 60, finalY + 8);
  doc.text(formatMoney(avgPerPerson, currencySymbol), 60, finalY + 14);
  doc.text(`${users.filter(u => !u.isDeleted).length}`, 60, finalY + 20);

  // 3. DESGLOSSAMENT PER CATEGORIA
  const stats: Record<string, number> = {};
  validExpenses.forEach(e => {
    const cat = e.category || 'other';
    stats[cat] = (stats[cat] || 0) + e.amount;
  });

  const categoryData = Object.entries(stats)
    .sort(([,a], [,b]) => b - a)
    .map(([catId, amount]) => {
      const catInfo = CATEGORIES.find(c => c.id === catId);
      const label = catInfo ? catInfo.label : catId;
      const pct = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) + '%' : '0%';
      return [label, formatMoney(amount, currencySymbol), pct];
    });

  autoTable(doc, {
    startY: finalY - 6,
    margin: { left: 110 },
    head: [['Categoria', 'Import', '%']],
    body: categoryData,
    theme: 'grid',
    headStyles: { fillColor: COLORS.secondary, fontSize: 9 },
    styles: { fontSize: 9 },
    columnStyles: { 
      1: { halign: 'right' }, 
      2: { halign: 'right' } 
    },
    tableWidth: 85
  });

  finalY = Math.max(doc.lastAutoTable?.finalY || 0, finalY + 30) + 15;

  // 4. ESTAT DE COMPTES
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text("Balanç Final", 14, finalY);

  const balanceData = balances.map(b => {
    return [
      getName(b.userId, users),
      formatMoney(b.amount, currencySymbol),
      b.amount === 0 ? 'AL DIA' : (b.amount > 0 ? 'A REBRE' : 'A PAGAR')
    ];
  });

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Membre', 'Balanç', 'Estat']],
    body: balanceData,
    theme: 'striped',
    headStyles: { fillColor: COLORS.primary },
    columnStyles: { 
      1: { halign: 'right', fontStyle: 'bold' }, 
      2: { halign: 'center', fontStyle: 'bold' } 
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const rawValue = balances[data.row.index].amount;
        if (rawValue > 0) {
          data.cell.styles.textColor = COLORS.success;
        } else if (rawValue < 0) {
          data.cell.styles.textColor = COLORS.danger;
        }
      }
    }
  });

  finalY = (doc.lastAutoTable?.finalY || finalY) + 15;

  // 5. PLA DE LIQUIDACIÓ
  if (settlements.length > 0) {
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.primary);
    doc.text("Com saldar els deutes?", 14, finalY);
    
    if (finalY > 250) { doc.addPage(); finalY = 20; }

    const settlementData = settlements.map(s => [
      getName(s.from, users),
      '➜ PAGA A ➜',
      getName(s.to, users),
      formatMoney(s.amount, currencySymbol)
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      body: settlementData,
      theme: 'grid',
      styles: { fontSize: 11, valign: 'middle' },
      headStyles: { fillColor: [241, 245, 249], textColor: COLORS.text },
      head: [['Deutor', 'Acció', 'Creditor', 'Import a Transferir']],
      columnStyles: { 
        1: { halign: 'center', textColor: COLORS.secondary, fontSize: 8 }, 
        3: { halign: 'right', fontStyle: 'bold', textColor: COLORS.primary } 
      }
    });
    
    finalY = (doc.lastAutoTable?.finalY || finalY) + 15;
  }

  // 6. DETALL DE DESPESES (Amb liquidacions incloses)
  if (finalY > 240) { doc.addPage(); finalY = 20; }
  
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text("Registre Detallat de Moviments", 14, finalY);

  // [RISC ZERO]: Disfressem els pagaments de despesa per poder-los unificar al llistat
  const mappedPayments: Expense[] = payments.map(p => {
    const methodLabel = p.method === 'bizum' ? 'Bizum' : p.method === 'transfer' ? 'Transferència' : p.method === 'card' ? 'Targeta' : 'Efectiu';
    return {
        id: p.id,
        title: `Liquidació (${methodLabel})`,
        amount: p.amount,
        payer: p.from,
        involved: [p.to],
        category: 'transfer',
        date: p.date,
        splitType: 'equal'
    } as unknown as Expense;
  });

  // Juntem tot i ordenem per data
  const mergedExpenses = [...expenses, ...mappedPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const expenseData = mergedExpenses.map(e => {
      const isTransfer = e.category === 'transfer';
      const payerName = getName(e.payer, users);
      
      // [FIX MÀGIC]: Si és un pagament, posem "Pagador -> Receptor"
      let involvedText = payerName;
      if (isTransfer && e.involved && e.involved.length > 0) {
          const receiverName = getName(e.involved[0], users);
          involvedText = `${payerName} -> ${receiverName}`;
      }

      return [
        new Date(e.date).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' }),
        e.title,
        involvedText,
        formatMoney(e.amount, currencySymbol),
        isTransfer ? 'PAGAMENT' : (CATEGORIES.find(c => c.id === e.category)?.label || e.category)
      ];
  });

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Data', 'Concepte', 'Implicats', 'Import', 'Categoria']],
    body: expenseData,
    theme: 'plain',
    headStyles: { 
        fillColor: false, 
        textColor: COLORS.secondary, 
        lineWidth: 0,
        fontStyle: 'bold'
    },
    styles: { 
        fontSize: 9, 
        cellPadding: 3,
        lineColor: [241, 245, 249],
        lineWidth: { bottom: 0.1 }
    },
    columnStyles: { 
        0: { textColor: COLORS.secondary },
        3: { halign: 'right', fontStyle: 'bold' } 
    },
    didParseCell: (data) => {
        if (data.section === 'body') {
           const rawRow = data.row.raw as string[]; 
           if (rawRow[4] === 'PAGAMENT') {
               data.cell.styles.textColor = COLORS.secondary;
               data.cell.styles.fontStyle = 'italic';
           }
        }
    }
  });

  // 7. PEU DE PÀGINA
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
        `Pàgina ${i} de ${pageCount} - Comptes Clars App`, 
        105, 
        290, 
        { align: 'center' }
    );
  }

  const safeName = tripName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`informe_comptes_clars_${safeName}.pdf`);
};