import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HomeTab({ stats, currentMealsCal, currentExeCal, todayLog }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-teal-50">
          <p className="text-xs text-slate-500 font-bold mb-1">현재 체중</p>
          <p className="text-3xl font-black text-slate-800">
            {stats.recentWeight || '--'}<span className="text-base font-medium text-slate-500 ml-1">kg</span>
          </p>
          <p className="text-xs text-teal-600 mt-2 font-bold bg-teal-50 inline-block px-2 py-1 rounded-full">
            목표까지 {(stats.recentWeight ? (stats.recentWeight - 70).toFixed(1) : '--')}kg
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-teal-50">
          <p className="text-xs text-slate-500 font-bold mb-1">오늘 섭취</p>
          <p className="text-2xl font-black text-slate-800">
            {currentMealsCal}<span className="text-sm font-medium text-slate-400"> /1800</span>
          </p>
          <div className="w-full h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-full rounded-full ${currentMealsCal > 1800 ? 'bg-red-500' : 'bg-teal-500'}`} 
              style={{ width: `${Math.min((currentMealsCal / 1800) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-orange-500 mt-3 font-bold flex items-center gap-1">
            🔥 소모: {currentExeCal}kcal
          </p>
        </div>
        
        <div className="col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-teal-50 flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">오늘 매출 & 걸음수</p>
            <p className="text-2xl font-black text-slate-800 flex items-end gap-3">
              <span>{todayLog.sales ? Number(todayLog.sales).toLocaleString() : '0'}<span className="text-sm font-medium text-slate-500 ml-1">원</span></span>
              {todayLog.steps && <span className="text-lg text-blue-600 font-bold">👟 {Number(todayLog.steps).toLocaleString()}<span className="text-xs text-slate-400 ml-1">보</span></span>}
            </p>
          </div>
          <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-2xl shadow-inner">
            💰
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <span className="text-2xl">💉</span> 마운자로 주사
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              다음 투약: {stats.nextDate ? `${stats.nextDate.getMonth()+1}월 ${stats.nextDate.getDate()}일` : '기록 필요'}
            </p>
          </div>
          <div className="bg-teal-600 text-white text-base font-black px-4 py-2 rounded-xl shadow-md">
            {stats.dDayText}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-50">
        <h3 className="font-bold text-slate-800 mb-4 text-lg">주간 체중 트렌드</h3>
        <div style={{ width: '100%', height: '220px', minHeight: '200px' }}>
          {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#0d9488" strokeWidth={3} dot={{ r: 4, fill: '#0d9488', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">기록된 체중 데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}