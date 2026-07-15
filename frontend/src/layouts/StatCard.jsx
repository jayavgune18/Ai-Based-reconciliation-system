import React from 'react';

export const StatCard = ({ icon: Icon, label, value, colorClass }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1">
        {Icon && <Icon size={16} />}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold ${colorClass || 'text-slate-900 dark:text-white'}`}>{value}</p>
    </div>
  );
};