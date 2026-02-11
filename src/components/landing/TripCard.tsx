import React from 'react';
import { FolderGit2, Trash2, ChevronRight, CheckCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { TripData } from '../../types';

interface TripCardProps {
    trip: TripData;
    currentUser: User;
    onNavigate: (id: string) => void;
    onLeave: (e: React.MouseEvent, tripId: string, internalId: string | undefined, name: string) => void;
}

export default function TripCard({ trip, currentUser, onNavigate, onLeave }: TripCardProps) {
    // Seguretat: Cerquem l'usuari intern dins del viatge per poder sortir-ne
    const currentUserInfo = trip.users?.find(u => u.linkedUid === currentUser.uid);
    
    return (
        <div 
            onClick={() => onNavigate(trip.id)} 
            className="group relative bg-white dark:bg-slate-900 hover:bg-white/80 dark:hover:bg-slate-800 p-6 rounded-3xl border border-white/60 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
        >
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl">
                            <FolderGit2 size={24} />
                        </div>
                    </div>
                    
                    <button 
                        onClick={(e) => onLeave(e, trip.id, currentUserInfo?.id, trip.name)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20"
                        title="Arxivar viatge (Soft Delete)"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
                
                <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-1 truncate pr-2">{trip.name}</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium mb-4">
                    Creat el {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : '---'}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                    {/* ZONA AVATARS */}
                    <div className="flex -space-x-2 mr-2">
                        {trip.users?.slice(0, 3).map((u, i) => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 overflow-hidden shadow-sm">
                                {u.photoUrl ? (
                                    <img src={u.photoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt={u.name} />
                                ) : (
                                    u.name?.charAt(0) || '?'
                                )}
                            </div>
                        ))}
                        {(trip.users?.length || 0) > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shadow-sm">
                                +{trip.users.length - 3}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* BADGE SALDAT - NO TAPA AVATARS */}
                        {trip.isSettled && (
                            <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                                <CheckCircle size={12} strokeWidth={3} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Saldat</span>
                            </div>
                        )}

                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <ChevronRight size={18} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}