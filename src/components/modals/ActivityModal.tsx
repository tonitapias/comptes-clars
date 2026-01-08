import React from 'react';
import { Clock, PlusCircle, Edit, Trash, UserPlus, CheckCircle, Settings } from 'lucide-react';
import Modal from '../Modal';
import { LogEntry } from '../../types';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
}

export default function ActivityModal({ isOpen, onClose, logs }: ActivityModalProps) {
  // Ordenem logs del més nou al més antic
  const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (action: LogEntry['action']) => {
    switch (action) {
      case 'create': return <PlusCircle size={16} className="text-emerald-500" />;
      case 'update': return <Edit size={16} className="text-amber-500" />;
      case 'delete': return <Trash size={16} className="text-rose-500" />;
      case 'join': return <UserPlus size={16} className="text-blue-500" />;
      case 'settle': return <CheckCircle size={16} className="text-indigo-500" />;
      case 'settings': return <Settings size={16} className="text-slate-500" />;
      default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historial d'Activitat">
      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {sortedLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Encara no hi ha activitat registrada.</p>
          </div>
        ) : (
          sortedLogs.map(log => (
            <div key={log.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
              <div className="mt-0.5">{getIcon(log.action)}</div>
              <div className="flex-1">
                <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-tight mb-1">
                  <span className="font-bold">{log.userName}</span> {log.message.replace(log.userName, '').replace(/^Ha /, '').toLowerCase()}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">{formatDate(log.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}