import React from 'react';
import { Camera, Plus, X } from 'lucide-react';
import { PRESETS } from '../../constants/presets';

export default function MealSection({ todayLog, setTodayLog, isAnalyzing, analyzeMealPhoto, mealFileInputRef, handleUpdateMeal }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <span className="text-xl">🍽️</span> 식단 기록
        </h3>
        <button 
          onClick={() => mealFileInputRef.current?.click()}
          disabled={isAnalyzing}
          className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isAnalyzing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-teal-50 text-teal-600 hover:bg-teal-100'}`}
        >
          <Camera size={14} />
          {isAnalyzing ? '분석 중...' : '사진으로 추가'}
        </button>
        <input 
          type="file" accept="image/*" className="hidden" 
          ref={mealFileInputRef} onChange={analyzeMealPhoto} 
        />
      </div>
      
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
        {PRESETS.meals.map((meal, idx) => (
          <button 
            key={idx}
            onClick={() => setTodayLog({...todayLog, meals: [...todayLog.meals, { id: Date.now()+idx, type: '일반', name: meal.name, calories: meal.calories }]})}
            className="shrink-0 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-sm font-bold whitespace-nowrap hover:bg-orange-100 transition-colors"
          >
            + {meal.name}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-4">
        {todayLog.meals.map((meal) => (
          <div key={meal.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-3 flex-1 mr-2">
              {meal.photo ? (
                <img src={meal.photo} alt={meal.name} className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center text-slate-400 text-xs shrink-0">직접</div>
              )}
              <input 
                type="text" value={meal.name} 
                onChange={(e) => handleUpdateMeal(meal.id, 'name', e.target.value)}
                className="text-slate-700 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none w-full truncate transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input 
                type="number" value={meal.calories} 
                onChange={(e) => handleUpdateMeal(meal.id, 'calories', e.target.value)}
                className="text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none w-14 text-right transition-colors"
              />
              <span className="text-slate-500 text-sm">kcal</span>
              <button 
                onClick={() => setTodayLog({...todayLog, meals: todayLog.meals.filter(m => m.id !== meal.id)})}
                className="p-1 bg-white rounded-full text-slate-400 hover:text-red-500 shadow-sm ml-1"
              ><X size={16}/></button>
            </div>
          </div>
        ))}
        {todayLog.meals.length === 0 && <p className="text-center text-slate-400 py-2 text-sm">입력된 식단이 없습니다.</p>}
      </div>

      <div className="flex gap-2">
        <input type="text" id="customMealName" placeholder="직접 메뉴 입력" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        <input type="number" id="customMealCal" placeholder="kcal" className="w-20 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-right" />
        <button 
          onClick={() => {
            const nameInput = document.getElementById('customMealName');
            const calInput = document.getElementById('customMealCal');
            if(nameInput.value) {
              setTodayLog({...todayLog, meals: [...todayLog.meals, { id: Date.now(), type: '직접입력', name: nameInput.value, calories: Number(calInput.value) || 0 }]});
              nameInput.value = ''; calInput.value = '';
            }
          }}
          className="bg-slate-800 text-white px-4 rounded-lg font-bold flex items-center justify-center hover:bg-slate-700"
        ><Plus size={20}/></button>
      </div>
    </div>
  );
}
