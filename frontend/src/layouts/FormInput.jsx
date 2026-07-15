import React from 'react';

export const FormInput = ({ label, id, type = 'text', value, onChange, placeholder, error, disabled, icon: Icon, rightElement, name }) => (
  <div className="space-y-2">
    {label && (
      <label htmlFor={id} className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Icon size={18} className="text-slate-400" />
        </div>
      )}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 text-base rounded-lg border bg-slate-50 dark:bg-slate-800/50 
          ${error ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500/20'} 
          focus:outline-none focus:ring-2 focus:border-cyan-500 dark:focus:border-cyan-500
          text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
          disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
      />
      {rightElement && (
        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
    {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
  </div>
);