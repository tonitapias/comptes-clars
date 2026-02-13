import React from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { CategoryStat } from '../types';

interface DonutChartProps {
  data: CategoryStat[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  // Si no hi ha dades, mostrem un cercle buit (opcional) o null
  if (!data || data.length === 0) return null;

  // --- CONFIGURACIÓ VISUAL ---
  const size = 100;
  const strokeWidth = 12; // Una mica més fi per a elegància (era 15)
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Gap entre segments (en unitats de circumferència)
  // Si només hi ha 1 segment, no posem gap.
  const gapSize = data.length > 1 ? 4 : 0; 
  
  let offset = 0; // Comencem des de dalt (-90deg al SVG)

  const colorMap: Record<string, string> = {
    'bg-orange-500': '#f97316', 
    'bg-blue-500': '#3b82f6', 
    'bg-indigo-500': '#6366f1',
    'bg-purple-500': '#a855f7', 
    'bg-sky-500': '#0ea5e9', 
    'bg-pink-500': '#ec4899',
    'bg-rose-500': '#f43f5e', 
    'bg-teal-500': '#14b8a6', 
    'bg-emerald-500': '#10b981', 
    'bg-slate-500': '#64748b', 
    'bg-slate-400': '#94a3b8',
    'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308',
    'bg-amber-500': '#f59e0b',
    'bg-lime-500': '#84cc16',
    'bg-green-500': '#22c55e',
    'bg-cyan-500': '#06b6d4',
    'bg-violet-500': '#8b5cf6',
    'bg-fuchsia-500': '#d946ef',
    'bg-gray-500': '#6b7280',
    'bg-zinc-500': '#71717a',
    'bg-neutral-500': '#737373',
    'bg-stone-500': '#78716c'
  };

  return (
    <div className="relative w-32 h-32 mx-auto group">
      {/* SVG amb rotació per començar a les 12 en punt */}
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        
        {/* 1. Anell de fons (Track) - Dóna estructura visual */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-100 dark:text-slate-800"
        />

        {/* 2. Segments de Dades */}
        {data.map((item) => {
          // Calculem la longitud del segment restant el gap
          const rawLength = (item.percentage / 100) * circumference;
          // Assegurem que el dashArray no sigui negatiu si el segment és molt petit
          const dashLength = Math.max(0, rawLength - gapSize);
          
          const currentOffset = offset;
          
          // Avancem l'offset pel següent segment (usant la longitud real sense restar gap per mantenir la posició correcta)
          offset += rawLength;
          
          const strokeColor = colorMap[item.barColor] || '#cbd5e1';

          return (
            <circle 
              key={item.id} 
              cx={size / 2} 
              cy={size / 2} 
              r={radius} 
              fill="transparent" 
              stroke={strokeColor} 
              strokeWidth={strokeWidth} 
              strokeDasharray={`${dashLength} ${circumference}`} 
              strokeDashoffset={-currentOffset} 
              strokeLinecap="round" 
              className="transition-all duration-500 ease-out hover:opacity-80 origin-center"
            />
          );
        })}
      </svg>
      
      {/* 3. Icona Central */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <PieChartIcon 
          className="text-slate-300 dark:text-slate-600 transition-colors duration-300" 
          size={24} 
        />
      </div>
    </div>
  );
};

export default DonutChart;