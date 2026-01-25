
import React from 'react';
import { MenuItem } from '../types';

interface MenuGridProps {
  items: MenuItem[];
}

const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.action}
          className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-slate-100 active:scale-95 transition-transform duration-150 hover:bg-slate-50 hover:shadow-md hover:border-slate-200"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${item.color} bg-opacity-10 text-xl`}>
            {/* The icon color usually matches the bg-opacity base color */}
            <span className={item.color.replace('bg-', 'text-').replace('100', '600')}>{item.icon}</span>
          </div>
          <span className="text-sm font-medium text-slate-700 text-center leading-tight">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default MenuGrid;
