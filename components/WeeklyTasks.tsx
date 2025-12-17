import React from 'react';
import { Task } from '../types';

interface WeeklyTasksProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const WeeklyTasks: React.FC<WeeklyTasksProps> = ({ tasks, onToggle, onEdit, onDelete }) => {
  return (
    <div className="mb-20">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-slate-800 text-lg">Các công việc trong tuần</h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
          {tasks.filter(t => !t.completed).length} việc còn lại
        </span>
      </div>
      
      <div className="space-y-3">
        {tasks.length === 0 ? (
           <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
               Không có công việc nào
           </div>
        ) : (
            tasks.map((task) => (
            <div 
                key={task.id} 
                className={`flex items-start p-3 bg-white rounded-xl shadow-sm border-l-4 transition-all group ${
                task.completed ? 'border-l-slate-300 opacity-60' : 
                task.priority === 'high' ? 'border-l-red-500' :
                task.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                }`}
            >
                <div className="flex-1">
                <div className="flex items-center mb-1">
                    <span className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-slate-800'}`}>
                    {task.title}
                    </span>
                    {task.priority === 'high' && !task.completed && (
                        <span className="ml-2 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">GẤP</span>
                    )}
                </div>
                <div className="text-xs text-slate-500 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    {task.date}
                </div>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                    <button 
                        onClick={() => onEdit(task)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <button 
                        onClick={() => onToggle(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-1 ${
                            task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </button>
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

export default WeeklyTasks;