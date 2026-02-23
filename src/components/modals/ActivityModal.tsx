import { useMemo } from 'react';
import { Clock, PlusCircle, Edit, Trash, UserPlus, CheckCircle2, Settings, Zap } from 'lucide-react';
import Modal from '../Modal';
import { LogEntry, TripUser } from '../../types';
import { useTripState } from '../../context/TripContext';
import Avatar from '../Avatar';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityModal({ isOpen, onClose }: ActivityModalProps) {
  const { tripData } = useTripState();
  const logs = tripData?.logs || [];
  const users = tripData?.users || [];

  const userMap = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, TripUser>);
  }, [users]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [logs]);

  // Configuració d'Alt Contrast i Neó
  const getActionConfig = (action: LogEntry['action']) => {
    switch (action) {
      case 'create': return { icon: PlusCircle, color: 'text-emerald-100', bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/50', border: 'border-emerald-400' };
      case 'update': return { icon: Edit, color: 'text-amber-100', bg: 'bg-amber-500', shadow: 'shadow-amber-500/50', border: 'border-amber-400' };
      case 'delete': return { icon: Trash, color: 'text-rose-100', bg: 'bg-rose-500', shadow: 'shadow-rose-500/50', border: 'border-rose-400' };
      case 'join': return { icon: UserPlus, color: 'text-blue-100', bg: 'bg-blue-500', shadow: 'shadow-blue-500/50', border: 'border-blue-400' };
      case 'settle': return { icon: CheckCircle2, color: 'text-indigo-100', bg: 'bg-indigo-500', shadow: 'shadow-indigo-500/50', border: 'border-indigo-400' };
      case 'settings': return { icon: Settings, color: 'text-slate-100', bg: 'bg-slate-500', shadow: 'shadow-slate-500/50', border: 'border-slate-400' };
      default: return { icon: Clock, color: 'text-slate-100', bg: 'bg-slate-400', shadow: 'shadow-slate-400/50', border: 'border-slate-300' };
    }
  };

  const formatLogDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const time = d.toLocaleString('ca-ES', { hour: '2-digit', minute: '2-digit' });
    const date = d.toLocaleString('ca-ES', { day: '2-digit', month: '2-digit' });
    return { time, date, isToday };
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registre del Sistema">
      <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-6 pl-2 relative min-h-[300px]">
        <div className="absolute left-[52px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-indigo-500/30 to-transparent z-0" />
        <div className="absolute left-[52px] top-0 bottom-0 w-[2px] bg-indigo-500/20 blur-[2px] z-0" />

        {sortedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in opacity-50">
            <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 relative z-10 border border-slate-800">
                    <Zap size={32} className="text-slate-600" />
                </div>
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sense activitat recent</p>
          </div>
        ) : (
          <div className="space-y-6 relative z-10 pt-4">
              {sortedLogs.map((log, index) => {
                const user = userMap[log.userId];
                const config = getActionConfig(log.action);
                const { time, date, isToday } = formatLogDate(log.timestamp);
                const Icon = config.icon;
                
                const currentName = user?.name || log.userName;

                // [MILLORA RISC ZERO]: Si el text del missatge històric conté el nom antic de l'usuari,
                // el substituïm "al vol" pel nom nou sense tocar la base de dades.
                let displayMessage = log.message;
                if (user?.name && log.userName && displayMessage.includes(log.userName)) {
                    displayMessage = displayMessage.replace(log.userName, user.name);
                }

                return (
                  <div key={log.id} className="flex items-start gap-5 animate-fade-in-up group" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex flex-col items-end w-8 pt-1.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">{time}</span>
                        {!isToday && <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600">{date}</span>}
                    </div>

                    <div className="relative shrink-0">
                        <div className={`absolute inset-0 rounded-full blur-md opacity-40 group-hover:opacity-80 transition-opacity duration-500 ${config.bg}`} />
                        <div className={`
                            relative w-8 h-8 rounded-full flex items-center justify-center 
                            ${config.bg} ${config.color} border-2 ${config.border}
                            shadow-lg transform transition-transform duration-300 group-hover:scale-110
                        `}>
                            <Icon size={14} strokeWidth={3} />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-indigo-500/30 dark:hover:border-indigo-400/30 group-hover:translate-x-1">
                        <div className="flex items-center gap-2.5 mb-1.5">
                             <Avatar name={currentName} photoUrl={user?.photoUrl} size="sm" className="ring-2 ring-white dark:ring-slate-800" />
                             <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate tracking-tight">
                                {currentName}
                             </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                             {/* ARA FEM SERVIR displayMessage EN COMPTES DE log.message */}
                             {displayMessage}
                        </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </Modal>
  );
}