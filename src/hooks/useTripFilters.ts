import { useState } from 'react';
import { CategoryId } from '../types';

export type ActiveTab = 'expenses' | 'balances' | 'settle';

export function useTripFilters() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<CategoryId | 'all'>('all');

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
  };

  return {
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    filterCategory, setFilterCategory,
    resetFilters
  };
}