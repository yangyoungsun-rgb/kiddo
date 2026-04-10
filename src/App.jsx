import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Home, FileText, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

// Firebase & GenAI SDK
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { GoogleGenAI, Type } from '@google/genai';

// 분리한 파일들 Import
import { auth, db, appId } from './firebase';
import { getTodayString } from './utils/dateUtils';
import HomeTab from './components/HomeTab';
import LogTab from './components/LogTab';
import GalleryTab from './components/GalleryTab';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [currentDate, setCurrentDate] = useState(getTodayString());
  const [logs, setLogs] = useState([]);
  const [isOffline, setIsOffline] = useState(false); 
  
  const [googleToken, setGoogleToken] = useState(null);
  const [isSyncingSteps, setIsSyncingSteps] = useState(false);
  
  const [todayLog, setTodayLog] = useState({
    weight: '',
    sleep: { hours: '', condition: 'good' },
    mounjaro: { injected: false, dose: '2.5mg', site: '좌측 복부', memo: '' },
    meals: [],
    exercise: [],
    steps: '', 
    photos: [],
    sales: ''
  });

  const [toastMessage, setToastMessage] = useState('');
  const fileInputRef = useRef(null);
  const mealFileInputRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleGoogleLogin = async () => {
    if (!auth) return;
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) setGoogleToken(credential.accessToken);
      showToast('구글 계정(Fit 권한 포함)으로 연동되었습니다! 🔄');
    } catch (error) {
      showToast('로그인을 취소했거나 팝업이 차단되었습니다.');
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setGoogleToken(null);
      await signInAnonymously(auth);
      showToast('로그아웃 되었습니다. 기기 전용 모드로 전환됩니다.');
    } catch (error) {
      showToast('로그아웃 처리 중 문제가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'daily_logs');
    const q = query(logsRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIsOffline(false); 
      const fetchedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedLogs.sort((a, b) => new Date(b.id) - new Date(a.id));
      setLogs(fetchedLogs);
    }, (error) => {
      if (error.code === 'unavailable') setIsOffline(true);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const logForDate = logs.find(l => l.id === currentDate);
    if (logForDate) {
      setTodayLog({
        weight: logForDate.weight ?? '',
        sleep: { hours: logForDate.sleep?.hours ?? '', condition: logForDate.sleep?.condition ?? 'good' },
        mounjaro: { injected: logForDate.mounjaro?.injected ?? false, dose: logForDate.mounjaro?.dose ?? '2.5mg', site: logForDate.mounjaro?.site ?? '좌측 복부', memo: logForDate.mounjaro?.memo ?? '' },
        meals: logForDate.meals ?? [],
        exercise: logForDate.exercise ?? [],
        steps: logForDate.steps ?? '',
        photos: logForDate.photos ?? [],
        sales: logForDate.sales ?? '' 
      });
    } else {
      setTodayLog({
        weight: '', sleep: { hours: '', condition: 'good' },
        mounjaro: { injected: false, dose: '2.5mg', site: '좌측 복부', memo: '' },
        meals: [], exercise: [], steps: '', photos: [], sales: ''
      });
    }
  }, [currentDate, logs]);

  const handleSave = async () => {
    const newLogData = { date: currentDate, ...todayLog, updated_at: new Date().toISOString() };
    const saveLocally = () => {
      setLogs(prev => {
        const existingIdx = prev.findIndex(l => l.id === currentDate);
        if (existingIdx >= 0) {
          const newLogs = [...prev];
          newLogs[existingIdx] = { id: currentDate, ...newLogs[existingIdx], ...newLogData };
          return newLogs;
        } else {
          return [{ id: currentDate, ...newLogData }, ...prev].sort((a, b) => new Date(b.id) - new Date(a.id));
        }
      });
    };

    if (!user || !db || isOffline) {
      saveLocally();
      showToast('네트워크 미연결: 로컬 메모리에 임시 저장되었습니다! 💾');
      setActiveTab('home');
      return;
    }

    try {
      const logRef = doc(db, 'artifacts', appId, 'users', user.uid, 'daily_logs', currentDate);
      await setDoc(logRef, newLogData, { merge: true });
      showToast('기록이 안전하게 저장되었습니다! 💾');
      setActiveTab('home');
    } catch (error) {
      showToast('저장 중 오류가 발생했습니다.');
    }
  };

  const syncGoogleFitSteps = async () => {
    setIsSyncingSteps(true);
    let token = googleToken;

    if (!token) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
        const result = await signInWithPopup(auth, provider);
        token = GoogleAuthProvider.credentialFromResult(result)?.accessToken;
        setGoogleToken(token);
      } catch (err) {
        showToast('구글 로그인 및 Fit 접근 권한이 필요합니다.');
        setIsSyncingSteps(false);
        return;
      }
    }

    try {
      const startOfDay = new Date(currentDate); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate); endOfDay.setHours(23, 59, 59, 999);

      const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: 86400000 }, 
          startTimeMillis: startOfDay.getTime(), endTimeMillis: endOfDay.getTime()
        })
      });

      if (!response.ok) {
        if (response.status === 401) { setGoogleToken(null); throw new Error("TOKEN_EXPIRED"); }
        if (response.status === 403) throw new Error("FORBIDDEN_API");
        throw new Error("API_ERROR");
      }

      const data = await response.json();
      const steps = data.bucket?.[0]?.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;

      setTodayLog(prev => ({ ...prev, steps: steps }));
      showToast(`걸음수 연동 성공! 총 ${steps.toLocaleString()}보 🏃‍♂️`);
    } catch (err) {
      if (err.message === "TOKEN_EXPIRED") showToast('권한이 만료되었습니다. 다시 시도해주세요.');
      else if (err.message === "FORBIDDEN_API") showToast('⚠️ Google Cloud Console에서 Fitness API를 활성화해야 합니다.');
      else showToast('걸음수를 가져오지 못했습니다. 권한 설정 및 네트워크를 확인해주세요.');
    } finally {
      setIsSyncingSteps(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showToast('사진 압축 및 저장 중... ⏳');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        let scaleSize = 1;
        if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
        canvas.width = img.width * scaleSize;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const base64String = canvas.toDataURL('image/jpeg', 0.6);
        const newPhoto = { url: base64String, type: '기본', uploaded_at: new Date().toISOString() };
        const updatedPhotos = [...todayLog.photos, newPhoto];
        setTodayLog(prev => ({ ...prev, photos: updatedPhotos }));

        if (user && db && !isOffline) {
          try {
            const logRef = doc(db, 'artifacts', appId, 'users', user.uid, 'daily_logs', currentDate);
            await setDoc(logRef, { date: currentDate, photos: updatedPhotos, updated_at: new Date().toISOString() }, { merge: true });
            showToast('눈바디 사진이 성공적으로 저장되었습니다! 📷');
          } catch (err) { showToast('사진 저장 중 오류가 발생했습니다.'); }
        } else {
           showToast('오프라인: 로컬에 임시 추가되었습니다. (저장 버튼 필요)');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const analyzeMealPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    showToast('AI가 음식 사진을 분석하고 있습니다... 🔍');

    try {
      const { base64String, base64Data } = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            let scaleSize = 1;
            if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
            canvas.width = img.width * scaleSize;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const b64 = canvas.toDataURL('image/jpeg', 0.6);
            resolve({ base64String: b64, base64Data: b64.split(',')[1] });
          };
          img.onerror = () => reject(new Error("이미지 로드 실패"));
          img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("파일 읽기 실패"));
        reader.readAsDataURL(file);
      });

      // 로컬 VS Code 에서는 아래 문자열 대신 `import` `.` `meta` `.env.VITE_GEMINI_API_KEY` 형태로 교체하세요!
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 

      const ai = new GoogleGenAI({ apiKey: apiKey });

      let response;
      let success = false;
      const retries = 3;
      let lastError = null;

      for (let i = 0; i < retries; i++) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: [
              "이 음식 사진을 분석해서 1인분 기준 가장 가능성 높은 음식의 이름과 대략적인 칼로리를 JSON 형태로 알려줘. 다른 설명은 절대 하지 마. 예: {\"name\": \"김치찌개\", \"calories\": 450}",
              { inlineData: { data: base64Data, mimeType: "image/jpeg" } }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: { name: { type: Type.STRING }, calories: { type: Type.INTEGER } }
              }
            }
          });
          success = true;
          break; 
        } catch (apiError) {
          lastError = apiError;
          if (apiError.status === 404 || apiError.status === 403) break; 
          if (i === retries - 1) break; 
          await new Promise(res => setTimeout(res, 1500 * (i + 1))); 
        }
      }

      if (!success) throw lastError || new Error("EMPTY_RESPONSE");

      const textResp = response.text;
      if (!textResp) throw new Error("EMPTY_RESPONSE");
      
      const cleanedText = textResp.replace(/```json/g, '').replace(/```/g, '').trim();
      const { name, calories } = JSON.parse(cleanedText);
      
      setTodayLog(prev => ({
        ...prev,
        meals: [...prev.meals, { 
          id: Date.now(), type: 'AI분석', name: name || '알 수 없는 음식', calories: calories || 0, photo: base64String
        }]
      }));
      
      showToast(`분석 완료! ${name} (${calories}kcal) 🍽️`);

    } catch (err) {
      if (err.status === 429 || (err.message && err.message.includes("429"))) {
        showToast('⚠️ 호출 한도를 초과했습니다. 잠시 후 시도해주세요.');
      } else if (err.status === 404 || (err.message && err.message.includes("404"))) {
        showToast('⚠️ 권한 오류: 해당 모델(gemini-3)을 사용할 수 없는 환경입니다.');
      } else {
        showToast('분석에 실패했습니다. 사진을 다시 올려주세요. 🥲');
      }
    } finally {
      setIsAnalyzing(false);
      if (mealFileInputRef.current) mealFileInputRef.current.value = '';
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const changeDate = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d.toISOString().split('T')[0]);
  };

  const stats = useMemo(() => {
    let dDayText = "기록 없음";
    let nextDate = null;
    let recentWeight = 0;
    
    const weightLog = logs.find(l => l.weight);
    if (weightLog) recentWeight = weightLog.weight;

    const recentMounjaro = logs.find(l => l.mounjaro?.injected);
    if (recentMounjaro) {
      const lastDate = new Date(recentMounjaro.date);
      nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 7);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = nextDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 0) dDayText = `D-${diffDays}`;
      else if (diffDays === 0) dDayText = `D-Day`;
      else dDayText = `D+${Math.abs(diffDays)} (지남)`;
    }

    const chartData = [...logs]
      .filter(l => l.weight)
      .slice(0, 7)
      .reverse()
      .map(l => ({
        date: l.date.slice(5).replace('-', '/'),
        weight: parseFloat(l.weight)
      }));

    return { recentWeight, nextDate, dDayText, chartData };
  }, [logs]);

  const currentMealsCal = todayLog.meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const currentExeCal = todayLog.exercise.reduce((sum, e) => sum + (Number(e.calories_burned) || 0), 0);
  const isLinkedAccount = user?.providerData?.some(p => p.providerId === 'google.com');

  const handleUpdateMeal = (id, field, value) => {
    setTodayLog(prev => ({
      ...prev, meals: prev.meals.map(meal => meal.id === id ? { ...meal, [field]: value } : meal)
    }));
  };

  const handleUpdateExercise = (id, field, value) => {
    setTodayLog(prev => ({
      ...prev, exercise: prev.exercise.map(exe => exe.id === id ? { ...exe, [field]: value } : exe)
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24 flex justify-center">
      <div className="w-full max-w-lg bg-slate-50 min-h-screen relative shadow-2xl border-x border-slate-100">
        
        {toastMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-5">
            <div className="bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 text-sm whitespace-nowrap">
              {toastMessage}
            </div>
          </div>
        )}

        <header className="bg-teal-600 text-white rounded-b-3xl shadow-md relative overflow-hidden mb-6">
          <div className="absolute inset-0 bg-teal-900/40 z-0"></div>
          
          <div className="relative z-10 px-6 pt-10 pb-6 flex items-center justify-between">
             <div>
                <h1 className="text-2xl font-black tracking-tight">약수동 꼬맹이 다이어트</h1>
                <p className="text-teal-100 text-sm mt-1 font-medium">
                  {isLinkedAccount ? '📱 모든 기기에서 연동 중' : '나만의 건강 기록 관리 (기기 전용)'}
                </p>
             </div>
             <div className="flex flex-col items-center gap-2">
               <img 
                  src={isLinkedAccount && user?.photoURL ? user.photoURL : "Kiddo_title.jpg"} 
                  alt="Profile" 
                  onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=Kiddo&background=0d9488&color=fff' }}
                  className="w-14 h-14 rounded-full border-2 border-teal-200 object-cover object-[25%_center] shadow-lg"
               />
               {!isLinkedAccount ? (
                 <button onClick={handleGoogleLogin} className="text-[10px] bg-white text-teal-700 px-3 py-1 rounded-full font-bold shadow-sm hover:bg-teal-50 transition-colors">
                   구글 연동
                 </button>
               ) : (
                 <button onClick={handleLogout} className="text-[10px] bg-teal-800 text-teal-100 px-3 py-1 rounded-full font-bold shadow-sm hover:bg-teal-900 transition-colors">
                   로그아웃
                 </button>
               )}
             </div>
          </div>

          {activeTab !== 'gallery' && (
            <div className="relative z-10 px-6 py-4 bg-white/10 backdrop-blur-sm border-t border-white/20 flex justify-between items-center text-white">
              <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={24}/></button>
              <div className="text-center">
                <span className="font-bold text-lg">{currentDate}</span>
                {currentDate === getTodayString() && <span className="ml-2 text-xs bg-teal-500 px-2 py-0.5 rounded-full font-bold">오늘</span>}
              </div>
              <button onClick={() => changeDate(1)} className="p-1 hover:bg-white/20 rounded-full transition-colors" disabled={currentDate === getTodayString()}><ChevronRight size={24} className={currentDate === getTodayString() ? 'opacity-30' : ''}/></button>
            </div>
          )}
        </header>

        <main className="px-6 relative z-10">
          {activeTab === 'home' && <HomeTab stats={stats} currentMealsCal={currentMealsCal} currentExeCal={currentExeCal} todayLog={todayLog} />}
          {activeTab === 'log' && <LogTab todayLog={todayLog} setTodayLog={setTodayLog} isAnalyzing={isAnalyzing} analyzeMealPhoto={analyzeMealPhoto} syncGoogleFitSteps={syncGoogleFitSteps} isSyncingSteps={isSyncingSteps} handleUpdateMeal={handleUpdateMeal} handleUpdateExercise={handleUpdateExercise} mealFileInputRef={mealFileInputRef} handleSave={handleSave} />}
          {activeTab === 'gallery' && <GalleryTab logs={logs} currentDate={currentDate} fileInputRef={fileInputRef} handleImageUpload={handleImageUpload} />}
        </main>

        <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 px-6 pb-safe pt-2 z-50 max-w-lg mx-auto right-0 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-3xl">
          <div className="flex justify-around items-center h-16">
            <button 
              onClick={() => setActiveTab('home')}
              className={`flex flex-col items-center gap-1 w-16 transition-all duration-300 ${activeTab === 'home' ? 'text-teal-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Home size={24} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">홈</span>
            </button>
            <button 
              onClick={() => setActiveTab('log')}
              className={`flex flex-col items-center gap-1 w-16 transition-all duration-300 ${activeTab === 'log' ? 'text-teal-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <FileText size={24} strokeWidth={activeTab === 'log' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">기록</span>
            </button>
            <button 
              onClick={() => setActiveTab('gallery')}
              className={`flex flex-col items-center gap-1 w-16 transition-all duration-300 ${activeTab === 'gallery' ? 'text-teal-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ImageIcon size={24} strokeWidth={activeTab === 'gallery' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">눈바디</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
