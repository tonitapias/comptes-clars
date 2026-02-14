import React from 'react';
import { LucideIcon } from 'lucide-react';

interface BentoCardProps {
    icon: React.ElementType; // O LucideIcon si estàs segur del tipus
    title: string;
    desc: string;
    color: string; // Esperem classes com 'text-blue-500' o 'bg-blue-500'
}

export default function BentoCard({ icon: Icon, title, desc, color }: BentoCardProps) {
    // Extreiem el color base (ex: 'bg-blue-500' -> 'blue') per muntar classes dinàmiques
    // Nota: Això requereix que els colors estiguin safelistats o siguin estàndard. 
    // Per seguretat, assumim que 'color' és la classe de fons del badge (ex: 'bg-indigo-100 text-indigo-600')
    
    return (
      <div className="group relative overflow-hidden bg-surface-card p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-financial-sm hover:shadow-financial-md transition-all duration-300 hover:-translate-y-1">
        
        {/* Decoració de fons subtil (Gradient mesh) */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 transition-opacity group-hover:bg-primary/10"></div>
        
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5 ${color}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
        
        <h3 className="font-bold text-content-body text-lg mb-2">{title}</h3>
        <p className="text-sm text-content-muted leading-relaxed font-medium">
            {desc}
        </p>
      </div>
    );
}