import React from 'react';
import { Activity, Plus, X } from 'lucide-react';
import { PRESETS } from '../../constants/presets';

export default function ExerciseSection({ todayLog, setTodayLog, syncGoogleFitSteps, isSyncingSteps, handleUpdateExercise }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <span className="text-xl">🏃</span> 운동 기록
          </h3>
          <button 
            onClick={syncGoogleFitSteps}
            disabled={isSyncingSteps}
            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isSyncingSteps ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100'}`}
          >
            <Activity size={14} />
            {isSyncingSteps ? '동기화 중...' : 'Fit 걸음수 가져오기'}
          </button>
      </div>

      <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👟</span>
            <span className="text-slate-700 font-bold">오늘 걸음수</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" value={todayLog.steps ?? ''}
              onChange={(e) => setTodayLog({...todayLog, steps: e.target.value})}
              placeholder="0"
              className="w-24 text-right bg-white border border-blue-200 rounded-lg p-2 font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-500 font-medium">보</span>
          </div>
      </div>
      
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {PRESETS.exercises.map((exe, idx) => (
          <button 
            key={idx}
            onClick={() => setTodayLog({...todayLog, exercise: [...todayLog.exercise, { id: Date.now()+idx, name: exe.name, calories_burned: exe.calories_burned }]})}
            className="shrink-0 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-bold whitespace-nowrap hover:bg-blue-100 transition-colors"
          >
            + {exe.name}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        {todayLog.exercise.map((exe) => (
            <div key={exe.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <input 
              type="text" value={exe.name} 
              onChange={(e) => handleUpdateExercise(exe.id, 'name', e.target.value)}
              className="text-slate-700 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none flex-1 mr-2 transition-colors"
            />
            <div className="flex items-center gap-2 shrink-0">
              <input 
                type="number" value={exe.calories_burned} 
                onChange={(e) => handleUpdateExercise(exe.id, 'calories_burned', e.target.value)}
                className="text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none w-14 text-right transition-colors"
              />
              <span className="text-slate-500 text-sm">kcal 소모</span>
              <button 
                onClick={() => setTodayLog({...todayLog, exercise: todayLog.exercise.filter(e => e.id !== exe.id)})}
                className="p-1 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm ml-1"
              ><X size={16}/></button>
            </div>
          </div>
        ))}
        {todayLog.exercise.length === 0 && <p className="text-center text-slate-400 py-2 text-sm">기록된 운동/활동이 없습니다.</p>}
      </div>

      <div className="flex gap-2">
        <input type="text" id="customExeName" placeholder="직접 활동 입력" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <input type="number" id="customExeCal" placeholder="kcal" className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-right" />
        <button 
          onClick={() => {
            const nameInput = document.getElementById('customExeName');
            const calInput = document.getElementById('customExeCal');
            if(nameInput.value) {
              setTodayLog({...todayLog, exercise: [...todayLog.exercise, { id: Date.now(), name: nameInput.value, calories_burned: Number(calInput.value) || 0 }]});
              nameInput.value = ''; calInput.value = '';
            }
          }}
          className="bg-slate-800 text-white px-4 rounded-lg font-bold flex items-center justify-center hover:bg-slate-700"
        ><Plus size={20}/></button>
      </div>
    </div>
  );
}