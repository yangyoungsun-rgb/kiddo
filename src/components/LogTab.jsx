import React from 'react';
import { Save } from 'lucide-react';
import BodySleepSection from './log/BodySleepSection';
import MounjaroSection from './log/MounjaroSection';
import MealSection from './log/MealSection';
import ExerciseSection from './log/ExerciseSection';
import SalesSection from './log/SalesSection';

export default function LogTab({ 
  todayLog, setTodayLog, isAnalyzing, analyzeMealPhoto, 
  syncGoogleFitSteps, isSyncingSteps, handleUpdateMeal, handleUpdateExercise, 
  mealFileInputRef, handleSave 
}) {
  return (
    <div className="space-y-5 animate-in fade-in duration-300 pb-24">
      <BodySleepSection todayLog={todayLog} setTodayLog={setTodayLog} />
      
      <MounjaroSection todayLog={todayLog} setTodayLog={setTodayLog} />
      
      <MealSection 
        todayLog={todayLog} 
        setTodayLog={setTodayLog} 
        isAnalyzing={isAnalyzing} 
        analyzeMealPhoto={analyzeMealPhoto} 
        mealFileInputRef={mealFileInputRef} 
        handleUpdateMeal={handleUpdateMeal} 
      />
      
      <ExerciseSection 
        todayLog={todayLog} 
        setTodayLog={setTodayLog} 
        syncGoogleFitSteps={syncGoogleFitSteps} 
        isSyncingSteps={isSyncingSteps} 
        handleUpdateExercise={handleUpdateExercise} 
      />
      
      <SalesSection todayLog={todayLog} setTodayLog={setTodayLog} />

      <div className="fixed bottom-20 left-0 w-full px-6 z-40 max-w-lg mx-auto right-0">
        <button 
          onClick={handleSave}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-4 rounded-2xl shadow-xl flex justify-center items-center gap-2 transition-transform active:scale-95"
        >
          <Save size={20} />
          <span>오늘 기록 저장하기</span>
        </button>
      </div>
    </div>
  );
}