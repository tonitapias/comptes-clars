import React from 'react';
import { LucideIcon } from 'lucide-react'; // Assegura't que tens aquest tipus o fes servir any/React.ElementType

interface BentoCardProps {
    icon: React.ElementType;
    title: string;
    desc: string;
    color: string;
}

export default function BentoCard({ icon: Icon, title, desc, color }: BentoCardProps) {
    return (
      <div className="group relative overflow-hidden bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl border border-white/50 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className={`absolute top-0 right-0 p-20 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${color}`}></div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${color} text-white`}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{desc}</p>
      </div>
    );
}