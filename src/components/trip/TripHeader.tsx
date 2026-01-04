import React from 'react';
import { LogOut, Edit2, Calendar, Download, Settings, Share2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../Card';
import { formatCurrency } from '../../utils/formatters';
import { Currency } from '../../types';

interface TripHeaderProps {
  tripId: string;
  name: string;
  createdAt: string;
  userCount: number;
  displayedTotal: number;
  totalGroupSpending: number;
  currency: Currency;
  isFiltered: boolean;
  onOpenSettings: () => void;
  onOpenGroup: () => void;
  onExportPDF: () => void;
  onCopyCode: () => void;
}

export default function TripHeader({
  tripId, name, createdAt, userCount, displayedTotal, totalGroupSpending, currency,
  isFiltered, onOpenSettings, onOpenGroup, onExportPDF, onCopyCode
}: TripHeaderProps) {
  const navigate = useNavigate();

  return (
    <>
      <header className="bg-gradient-to-br from-indigo-800 to-indigo-600 text-white pt-8 pb-20 px-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl mx-auto flex justify-between items-start relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm hover:bg-white/30 transition-colors" onClick={() => { localStorage.removeItem('cc-last-trip-id'); navigate('/'); }}>
                <LogOut className="text-indigo-100" size={16} />
              </button>
              <span className="text-indigo-200 text-xs font-bold tracking-wider uppercase">En línia • {tripId}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer hover:opacity-90" onClick={onOpenSettings}>
              {name} <Edit2 size={16} className="inline opacity-50"/>
            </h1>
            {createdAt && <p className="text-indigo-200 text-xs mt-1 flex items-center gap-1 opacity-80"><Calendar size={12} /> {new Date(createdAt).toLocaleDateString('ca-ES', { dateStyle: 'long' })}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={onExportPDF} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-md text-indigo-100" title="Exportar PDF"><Download size={20} /></button>
            <button onClick={onOpenSettings} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-md text-indigo-100"><Settings size={20} /></button>
            <button onClick={onCopyCode} className="bg-white/20 hover:bg-white/30 p-2.5 rounded-xl transition-colors backdrop-blur-md text-indigo-100"><Share2 size={20} /></button>
            <button onClick={onOpenGroup} className="bg-white text-indigo-600 hover:bg-indigo-50 py-2 px-3 rounded-xl transition-colors shadow-lg font-bold text-sm flex items-center gap-2"><Users size={16} /> {userCount}</button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 -mt-14 relative z-20 mb-6">
        <Card className="bg-white shadow-xl shadow-indigo-100/50 border-0">
          <div className="p-6 flex justify-between items-center">
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{isFiltered ? 'Total Filtrat' : 'Total Grup'}</p>
                <h2 className="text-3xl font-extrabold text-slate-800">{formatCurrency(displayedTotal, currency)}</h2>
            </div>
            <div className="text-right pl-4 border-l border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Per persona</p>
                <p className="text-xl font-bold text-indigo-600">{userCount > 0 ? formatCurrency(totalGroupSpending / userCount, currency) : formatCurrency(0, currency)}</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}