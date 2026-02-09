import React, { useMemo } from 'react';
import { Clock, PlusCircle, Edit, Trash, UserPlus, CheckCircle, Settings } from 'lucide-react';
import Modal from '../Modal';
import { LogEntry } from '../../types';
import { useTrip } from '../../context/TripContext'; //

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityModal({ isOpen, onClose }: ActivityModalProps) {
  const { tripData } = useTrip(); //
  const logs = tripData?.logs || []; //
  const users = tripData?.users || []; //

  // Optimització 1: Mapa d'usuaris per recuperar fotos i dades en temps real
  const userMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, typeof users[0]>);
  }, [users]);

  // Optimització 2: Ordenació memoritzada per evitar càlculs innecessaris
  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ); //
  }, [logs]);

  // Helper per a les icones d'activitat
  const getIcon = (action: LogEntry['action']) => {
    switch (action) {
      case 'create': return <PlusCircle size={14} className="text-emerald-500" />;
      case 'update': return <Edit size={14} className="text-amber-500" />;
      case 'delete': return <Trash size={14} className="text-rose-500" />;
      case 'join': return <UserPlus size={14} className="text-blue-500" />;
      case 'settle': return <CheckCircle size={14} className="text-indigo-500" />;
      case 'settings': return <Settings size={14} className="text-slate-500" />;
      default: return <Clock size={14} className="text-slate-400" />;
    }
  };

  // Formatador de data amigable
  const formatLogDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Historial d'Activitat">
      <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
        {sortedLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Clock size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Encara no hi ha activitat registrada.</p>
          </div>
        ) : (
          sortedLogs.map(log => {
            const user = userMap[log.userId]; //
            return (
              <div key={log.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800">
                {/* Avatar de l'usuari amb icona d'acció superposada */}
                <div className="shrink-0 relative">
                  <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shadow-sm">
                    {user?.photoUrl ? (
                      <img src={user.photoUrl} alt={log.userName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">{(log.userName || '?').charAt(0)}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm border border-slate-100 dark:border-slate-800">
                    {getIcon(log.action)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                    <span className="font-bold">{log.userName}</span> {log.message}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1 block">
                    {formatLogDate(log.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}