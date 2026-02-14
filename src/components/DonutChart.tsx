import React, { useState } from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { CategoryStat } from '../types';

interface DonutChartProps {
  data: CategoryStat[];
  onSegmentClick?: (categoryId: string) => void;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, onSegmentClick }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!data || data.length === 0) return null;

  // --- CONFIGURACIÓ VISUAL ---
  const size = 160; // Més gran per facilitar la interacció
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gapSize = data.length > 1 ? 4 : 0; 
  
  let offset = 0; 
  
  // Dades del segment actiu (Hover)
  const hoveredStat = data.find(d => d.id === hoveredId);

  // Mapeig de colors segur
  const colorMap: Record<string, string> = {
    'bg-orange-500': '#f97316', 'bg-blue-500': '#3b82f6', 'bg-indigo-500': '#6366f1',
    'bg-purple-500': '#a855f7', 'bg-sky-500': '#0ea5e9', 'bg-pink-500': '#ec4899',
    'bg-rose-500': '#f43f5e', 'bg-teal-500': '#14b8a6', 'bg-emerald-500': '#10b981', 
    'bg-slate-500': '#64748b', 'bg-slate-400': '#94a3b8', 'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308', 'bg-amber-500': '#f59e0b', 'bg-lime-500': '#84cc16',
    'bg-green-500': '#22c55e', 'bg-cyan-500': '#06b6d4', 'bg-violet-500': '#8b5cf6',
    'bg-fuchsia-500': '#d946ef', 'bg-gray-500': '#6b7280', 'bg-zinc-500': '#71717a',
    'bg-neutral-500': '#737373', 'bg-stone-500': '#78716c'
  };

  return (
    <div className="relative w-40 h-40 mx-auto group select-none">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 drop-shadow-sm">
        {/* Track de fons */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-slate-800/50" />

        {/* Segments */}
        {data.map((item) => {
          const rawLength = (item.percentage / 100) * circumference;
          const dashLength = Math.max(0, rawLength - gapSize);
          const currentOffset = offset;
          offset += rawLength;
          
          const strokeColor = colorMap[item.barColor] || '#cbd5e1';
          const isHovered = item.id === hoveredId;

          return (
            <circle 
              key={item.id} 
              cx={size / 2} 
              cy={size / 2} 
              r={radius} 
              fill="transparent" 
              stroke={strokeColor} 
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth} // Efecte "Pop"
              strokeDasharray={`${dashLength} ${circumference}`} 
              strokeDashoffset={-currentOffset} 
              strokeLinecap="round" 
              className={`transition-all duration-300 ease-out origin-center cursor-pointer ${isHovered ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onSegmentClick?.(item.id)}
              role="button"
              aria-label={`Filtrar per ${item.label}`}
            />
          );
        })}
      </svg>
      
      {/* Centre Dinàmic */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-all duration-200">
        {hoveredStat ? (
            <div className="animate-scale-in text-center px-2">
                 <span className="block text-2xl font-black text-content-body leading-none mb-0.5">
                    {Math.round(hoveredStat.percentage)}<span className="text-sm align-top">%</span>
                 </span>
                 <span className="block text-[10px] font-bold text-content-muted uppercase tracking-wider truncate max-w-[80px]">
                    {hoveredStat.label}
                 </span>
            </div>
        ) : (
            <>
                <PieChartIcon className="text-content-subtle mb-1 opacity-50" size={24} />
                <span className="text-xs font-bold text-content-muted uppercase tracking-wider">Total</span>
            </>
        )}
      </div>
    </div>
  );
};

export default DonutChart;