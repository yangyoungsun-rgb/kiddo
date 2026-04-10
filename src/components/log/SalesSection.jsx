import React from 'react';

export default function SalesSection({ todayLog, setTodayLog }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="text-xl">💰</span> 영업 매출 기록
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-slate-600 font-medium">오늘 매출액 (원)</span>
        <input 
          type="number" 
          value={todayLog.sales ?? ''} 
          onChange={e => setTodayLog({...todayLog, sales: e.target.value})}
          placeholder="0"
          className="w-32 text-right bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500" 
        />
      </div>
    </div>
  );
}
