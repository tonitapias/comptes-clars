import React from 'react';
import { PieChart as PieChartIcon } from 'lucide-react';
import { CategoryStat } from '../types';

interface DonutChartProps {
  data: CategoryStat[];
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;
  const size = 100;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

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
    <div className="relative w-32 h-32 mx-auto">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {data.map((item) => {
          const dashArray = (item.percentage / 100) * circumference;
          const currentOffset = offset;
          offset += dashArray;
          
          const strokeColor = colorMap[item.barColor] || '#cbd5e1';

          return (
            <circle key={item.id} cx={size / 2} cy={size / 2} r={radius} fill="transparent" 
              stroke={strokeColor} 
              strokeWidth={strokeWidth} 
              strokeDasharray={`${dashArray} ${circumference}`} 
              strokeDashoffset={-currentOffset} 
              className="transition-all duration-1000 ease-out" 
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* AFEGIT: dark:text-slate-700 per enfosquir-la una mica si el fons és fosc, o deixar-la clara. 
            En aquest cas, com que està dins d'un cercle buit, el fons serà el del card (slate-900). 
            Per tant, la icona hauria de ser una mica visible. Slate-700 és molt fosc. 
            Millor dark:text-slate-600. */}
        <PieChartIcon className="text-slate-300 dark:text-slate-700" size={24} />
      </div>
    </div>
  );
};

export default DonutChart;