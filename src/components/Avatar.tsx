import React from 'react';
import { getAvatarColor } from '../utils/ui';

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Avatar({ name, photoUrl, className = '', size = 'md' }: AvatarProps) {
  // Mapeig de mides estàndard
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-2xl'
  };

  // Obtenim el color basat en el nom per mantenir consistència
  const colorClasses = getAvatarColor(name);

  return (
    <div className={`
      relative rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm box-border shrink-0
      ${sizeClasses[size]}
      ${!photoUrl ? colorClasses : 'bg-slate-200 dark:bg-slate-700'}
      ${className}
    `}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Si la imatge falla, amaguem l'element img per mostrar el fallback (lletra)
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <span className="font-bold select-none uppercase leading-none">
          {name ? name.charAt(0) : '?'}
        </span>
      )}
    </div>
  );
}