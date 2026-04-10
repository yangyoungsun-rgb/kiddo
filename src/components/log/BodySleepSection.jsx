import React from 'react';

export default function BodySleepSection({ todayLog, setTodayLog }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-800 mb-4 border-b border-slate-50 pb-2 flex items-center gap-2">
        <span className="text-xl">⚖️</span> 신체 및 수면
      </h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-medium">체중 (kg)</span>
          <input 
            type="number" 
            value={todayLog.weight ?? ''} 
            onChange={e => setTodayLog({...todayLog, weight: e.target.value})}
            placeholder="0.0"
            className="w-24 text-right bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 font-medium">수면 시간 (시간)</span>
          <div className="flex items-center gap-3">
            <input 
              type="number" 
              value={todayLog.sleep.hours ?? ''}
              onChange={e => setTodayLog({...todayLog, sleep: {...todayLog.sleep, hours: e.target.value}})}
              placeholder="0.0"
              className="w-20 text-right bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
            />
            <select 
              value={todayLog.sleep.condition ?? 'good'}
              onChange={e => setTodayLog({...todayLog, sleep: {...todayLog.sleep, condition: e.target.value}})}
              className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xl"
            >
              <option value="good">😊</option>
              <option value="normal">😐</option>
              <option value="bad">🥱</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
