import React from 'react';

export default function MounjaroSection({ todayLog, setTodayLog }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="text-xl">💉</span> 오늘 주사 맞음
        </h3>
        <button 
          onClick={() => setTodayLog({...todayLog, mounjaro: {...todayLog.mounjaro, injected: !todayLog.mounjaro.injected}})}
          className={`w-14 h-7 rounded-full relative transition-colors duration-300 ${todayLog.mounjaro.injected ? 'bg-teal-500' : 'bg-slate-200'}`}
        >
          <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${todayLog.mounjaro.injected ? 'left-8' : 'left-1'}`}></span>
        </button>
      </div>
      
      {todayLog.mounjaro.injected && (
        <div className="mt-5 space-y-3 pt-4 border-t border-slate-50 animate-in slide-in-from-top-2">
          <div className="flex gap-3">
            <select 
              value={todayLog.mounjaro.dose ?? '2.5mg'}
              onChange={e => setTodayLog({...todayLog, mounjaro: {...todayLog.mounjaro, dose: e.target.value}})}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="2.5mg">용량: 2.5mg</option>
              <option value="5.0mg">용량: 5.0mg</option>
              <option value="7.5mg">용량: 7.5mg</option>
            </select>
            <select 
              value={todayLog.mounjaro.site ?? '좌측 복부'}
              onChange={e => setTodayLog({...todayLog, mounjaro: {...todayLog.mounjaro, site: e.target.value}})}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option>좌측 복부</option>
              <option>우측 복부</option>
              <option>좌측 허벅지</option>
              <option>우측 허벅지</option>
            </select>
          </div>
          <textarea 
            placeholder="특이사항 메모 (예: 부작용, 식욕 변화 등)" 
            value={todayLog.mounjaro.memo ?? ''}
            onChange={e => setTodayLog({...todayLog, mounjaro: {...todayLog.mounjaro, memo: e.target.value}})}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-700 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-teal-500"
          ></textarea>
        </div>
      )}
    </div>
  );
}