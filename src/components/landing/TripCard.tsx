import React from 'react';
import { FolderGit2, Trash2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { User } from 'firebase/auth';
import { TripData } from '../../types';
import { getAvatarColor } from '../../utils/ui'; // Reutilitzem la utilitat de colors

interface TripCardProps {
    trip: TripData;
    currentUser: User;
    onNavigate: (id: string) => void;
    onLeave: (e: React.MouseEvent, tripId: string, internalId: string | undefined, name: string) => void;
}

export default function TripCard({ trip, currentUser, onNavigate, onLeave }: TripCardProps) {
    const currentUserInfo = trip.users?.find(u => u.linkedUid === currentUser.uid);
    const dateStr = trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : '---';
    
    return (
        <div 
            onClick={() => onNavigate(trip.id)} 
            className="group relative bg-surface-card hover:border-primary/30 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-financial-sm hover:shadow-financial-lg transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
        >
            <div className="relative z-10 flex flex-col h-full">
                {/* Capçalera Card */}
                <div className="flex justify-between items-start mb-3">
                    <div className="bg-primary-light dark:bg-primary-dark/20 text-primary p-2.5 rounded-xl">
                        <FolderGit2 size={20} strokeWidth={2.5} />
                    </div>
                    
                    {/* Botó Esborrar (Només visible en hover desktop o sempre en mòbil) */}
                    <button 
                        onClick={(e) => onLeave(e, trip.id, currentUserInfo?.id, trip.name)}
                        className="p-2 text-content-subtle hover:text-status-error hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors md:opacity-0 md:group-hover:opacity-100"
                        title="Arxivar viatge"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
                
                {/* Títol i Data */}
                <h3 className="text-lg font-black text-content-body truncate mb-1 pr-2">{trip.name}</h3>
                <p className="text-xs text-content-subtle font-bold uppercase tracking-wider mb-6">
                    Creat el {dateStr}
                </p>
                
                {/* Footer Card: Avatars i Status */}
                <div className="flex items-center justify-between mt-auto">
                    <div className="flex -space-x-2 pl-1">
                        {trip.users?.slice(0, 3).map((u, i) => (
                            <div key={i} className={`w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold shadow-sm ${getAvatarColor(u.name)}`}>
                                {u.photoUrl ? (
                                    <img src={u.photoUrl} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" alt={u.name} />
                                ) : (
                                    u.name?.charAt(0).toUpperCase() || '?'
                                )}
                            </div>
                        ))}
                        {(trip.users?.length || 0) > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-content-muted shadow-sm">
                                +{trip.users.length - 3}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {trip.isSettled && (
                            <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg">
                                <CheckCircle2 size={12} strokeWidth={3} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Saldat</span>
                            </div>
                        )}
                        {/* Fletxa d'acció */}
                        <div className="text-content-subtle group-hover:text-primary transition-colors">
                           <ChevronRight size={20} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}