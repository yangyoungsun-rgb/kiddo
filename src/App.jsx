import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, FileText, Image as ImageIcon, Settings, Bell, 
  ChevronLeft, ChevronRight, Plus, X, Camera, Save, Activity
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Firebase SDK Imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, doc, setDoc } from 'firebase/firestore';

// 🚀 최신 Google GenAI SDK 임포트 (VS Code 로컬 환경 전용)
import { GoogleGenAI, Type } from '@google/genai';

// ----------------------------------------------------------------------
// Firebase 초기화 (환경 변수 기반)
// ----------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCUnSBNnrbeuuPn-qKgS2X4yqcV1DptV_8",
  authDomain: "yacksu-kiddo-diet.firebaseapp.com",
  projectId: "yacksu-kiddo-diet",
  storageBucket: "yacksu-kiddo-diet.firebasestorage.app",
  messagingSenderId: "644924497737",
  appId: "1:644924497737:web:8739fdd72fb10c09e98498",
  measurementId: "G-B28EN77TVM"
};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// 유틸리티 함수: 오늘 날짜 YYYY-MM-DD 포맷
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 기본 프리셋 데이터
const PRESETS = {
  meals: [
    { name: '갓골정식', calories: 450 },
    { name: '빵빵빵', calories: 300 },
    { name: '음주', calories: 300 },
    { name: '분식', calories: 250 }
  ],
  exercises: [
    { name: '골프 (18홀 라운딩)', duration_min: 240, calories_burned: 900 },
    { name: '골프 연습 (1시간)', duration_min: 60, calories_burned: 300 },
    { name: '런닝 머신 (30분)', duration_min: 30, calories_burned: 400 },
    { name: '오빠랑 (30분)', duration_min: 15, calories_burned: 250 }
  ]
};

// ----------------------------------------------------------------------
// 메인 App 컴포넌트
// ----------------------------------------------------------------------
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [currentDate, setCurrentDate] = useState(getTodayString());
  const [logs, setLogs] = useState([]);
  const [isOffline, setIsOffline] = useState(false); 
  
  // Google Fit API 통신을 위한 액세스 토큰 상태
  const [googleToken, setGoogleToken] = useState(null);
  const [isSyncingSteps, setIsSyncingSteps] = useState(false);
  
  // 현재 입력 중인 당일 데이터 상태 (걸음수 steps 포함)
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

  // 구글 로그인 처리 (Fit 권한 포함)
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
      console.error("Google login error:", error);
      if (error.message && (error.message.includes('Cross-Origin-Opener-Policy') || error.message.includes('COOP'))) {
        showToast('⚠️ 미리보기 환경에서는 팝업이 차단됩니다. 크롬 브라우저 새 창에서 localhost로 접속해주세요!');
      } else if (error.code === 'auth/unauthorized-domain') {
        showToast('⚠️ 오류: Firebase 콘솔에 현재 주소를 추가해주세요.');
      } else {
        showToast('로그인을 취소했거나 팝업이 차단되었습니다.');
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setGoogleToken(null);
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (tokenError) {
          await signInAnonymously(auth);
        }
      } else {
        await signInAnonymously(auth);
      }
      showToast('로그아웃 되었습니다. 기기 전용 모드로 전환됩니다.');
    } catch (error) {
      console.error("Logout error:", error);
      showToast('로그아웃 처리 중 문제가 발생했습니다.');
    }
  };

  // 1. Firebase 인증 처리
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (customTokenError) {
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore 실시간 데이터 구독
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
      console.error("Firestore snapshot error:", error);
      if (error.code === 'unavailable') setIsOffline(true);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. 당일 데이터 동기화
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
        weight: '',
        sleep: { hours: '', condition: 'good' },
        mounjaro: { injected: false, dose: '2.5mg', site: '좌측 복부', memo: '' },
        meals: [],
        exercise: [],
        steps: '',
        photos: [],
        sales: ''
      });
    }
  }, [currentDate, logs]);

  // 저장 기능
  const handleSave = async () => {
    const newLogData = {
      date: currentDate,
      ...todayLog,
      updated_at: new Date().toISOString()
    };

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

  // ----------------------------------------------------------------------
  // 👟 Google Fit 걸음수 동기화 로직
  // ----------------------------------------------------------------------
  const syncGoogleFitSteps = async () => {
    setIsSyncingSteps(true);
    let token = googleToken;

    if (!token) {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        token = credential?.accessToken;
        setGoogleToken(token);
      } catch (err) {
        if (err.message && (err.message.includes('Cross-Origin-Opener-Policy') || err.message.includes('COOP'))) {
            showToast('⚠️ 미리보기 환경에서는 팝업이 차단됩니다. 크롬 브라우저 새 창에서 실행해주세요!');
        } else {
            showToast('구글 로그인 및 Fit 접근 권한이 필요합니다.');
        }
        setIsSyncingSteps(false);
        return;
      }
    }

    try {
      const startOfDay = new Date(currentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(currentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
          bucketByTime: { durationMillis: 86400000 }, 
          startTimeMillis: startOfDay.getTime(),
          endTimeMillis: endOfDay.getTime()
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
           setGoogleToken(null);
           throw new Error("TOKEN_EXPIRED");
        }
        if (response.status === 403) {
           throw new Error("FORBIDDEN_API");
        }
        throw new Error("API_ERROR");
      }

      const data = await response.json();
      const bucket = data.bucket?.[0];
      const dataset = bucket?.dataset?.[0];
      const point = dataset?.point?.[0];
      const steps = point?.value?.[0]?.intVal || 0;

      setTodayLog(prev => ({ ...prev, steps: steps }));
      showToast(`걸음수 연동 성공! 총 ${steps.toLocaleString()}보 🏃‍♂️`);

    } catch (err) {
      console.error("Google Fit API Error:", err);
      if (err.message === "TOKEN_EXPIRED") {
        showToast('권한이 만료되었습니다. 다시 시도해주세요.');
      } else if (err.message === "FORBIDDEN_API") {
        showToast('⚠️ Google Cloud Console에서 Fitness API를 활성화해야 합니다.');
      } else {
        showToast('걸음수를 가져오지 못했습니다. 권한 설정 및 네트워크를 확인해주세요.');
      }
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
        
        const base64String = canvas.toDataURL('image/png');
        const newPhoto = {
          url: base64String,
          type: '기본',
          uploaded_at: new Date().toISOString()
        };

        const updatedPhotos = [...todayLog.photos, newPhoto];
        setTodayLog(prev => ({ ...prev, photos: updatedPhotos }));

        if (user && db && !isOffline) {
          try {
            const logRef = doc(db, 'artifacts', appId, 'users', user.uid, 'daily_logs', currentDate);
            await setDoc(logRef, { date: currentDate, photos: updatedPhotos, updated_at: new Date().toISOString() }, { merge: true });
            showToast('눈바디 사진이 성공적으로 저장되었습니다! 📷');
          } catch (err) {
            showToast('사진 저장 중 오류가 발생했습니다.');
          }
        } else {
           showToast('오프라인: 로컬에 임시 추가되었습니다. (저장 버튼 필요)');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------------------------
  // 🚀 식단 AI 사진 분석 로직 (@google/genai SDK 적용 + 안정성 강화)
  // ----------------------------------------------------------------------
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
            
            const b64 = canvas.toDataURL('image/jpeg', 0.8);
            resolve({ base64String: b64, base64Data: b64.split(',')[1] });
          };
          img.onerror = () => reject(new Error("이미지 로드 실패"));
          img.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("파일 읽기 실패"));
        reader.readAsDataURL(file);
      });

      // 🚨 사장님의 API 키
      const apiKey = "AIzaSyBIVnFJeO7oB0Ma1y7qNI8YiaGsJQxWQPk"; 
      
      // 최신 SDK 초기화
      const ai = new GoogleGenAI({ apiKey: apiKey });

      let response;
      let success = false;
      const retries = 3;
      let lastError = null;

      // 간헐적 통신 오류 및 속도 제한(429) 대비 재시도 루프
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
                properties: {
                  name: { type: Type.STRING },
                  calories: { type: Type.INTEGER }
                }
              }
            }
          });
          success = true;
          break; 
        } catch (apiError) {
          lastError = apiError;
          console.warn(`API 호출 실패 (${i + 1}/${retries}):`, apiError);
          // 404(모델 없음), 403(권한 없음) 에러는 재시도하지 않음
          if (apiError.status === 404 || apiError.status === 403) break; 
          if (i === retries - 1) break; 
          await new Promise(res => setTimeout(res, 1500 * (i + 1))); 
        }
      }

      if (!success) throw lastError || new Error("EMPTY_RESPONSE");

      const textResp = response.text;
      if (!textResp) throw new Error("EMPTY_RESPONSE");
      
      // 마크다운 잔재 제거 및 파싱
      const cleanedText = textResp.replace(/```json/g, '').replace(/```/g, '').trim();
      const { name, calories } = JSON.parse(cleanedText);
      
      setTodayLog(prev => ({
        ...prev,
        meals: [...prev.meals, { 
          id: Date.now(), 
          type: 'AI분석', 
          name: name || '알 수 없는 음식', 
          calories: calories || 0,
          photo: base64String
        }]
      }));
      
      showToast(`분석 완료! ${name} (${calories}kcal) 🍽️`);

    } catch (err) {
      console.error("AI Analysis Error:", err);
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

  // ----------------------------------------------------------------------
  // 연산 로직
  // ----------------------------------------------------------------------
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

  // 식단 및 운동 목록 인라인 수정 핸들러
  const handleUpdateMeal = (id, field, value) => {
    setTodayLog(prev => ({
      ...prev,
      meals: prev.meals.map(meal => 
        meal.id === id ? { ...meal, [field]: value } : meal
      )
    }));
  };

  const handleUpdateExercise = (id, field, value) => {
    setTodayLog(prev => ({
      ...prev,
      exercise: prev.exercise.map(exe => 
        exe.id === id ? { ...exe, [field]: value } : exe
      )
    }));
  };

  // ----------------------------------------------------------------------
  // 하위 렌더링 함수
  // ----------------------------------------------------------------------
  
  const renderHome = () => (
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

  const renderLog = () => (
    <div className="space-y-5 animate-in fade-in duration-300 pb-24">
      {/* 1. 기본 신체/수면 */}
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

      {/* 2. 마운자로 주사 */}
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

      {/* 3. 식단 기록 (인라인 수정 기능 유지) */}
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
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={mealFileInputRef} 
            onChange={analyzeMealPhoto} 
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
                  type="text" 
                  value={meal.name} 
                  onChange={(e) => handleUpdateMeal(meal.id, 'name', e.target.value)}
                  className="text-slate-700 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none w-full truncate transition-colors"
                />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input 
                  type="number" 
                  value={meal.calories} 
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

      {/* 4. 운동 및 걸음수 기록 */}
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

        {/* 수동 걸음수 입력 영역 */}
        <div className="flex items-center justify-between bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-5">
           <div className="flex items-center gap-2">
             <span className="text-2xl">👟</span>
             <span className="text-slate-700 font-bold">오늘 걸음수</span>
           </div>
           <div className="flex items-center gap-2">
             <input 
               type="number" 
               value={todayLog.steps ?? ''}
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
               type="text" 
               value={exe.name} 
               onChange={(e) => handleUpdateExercise(exe.id, 'name', e.target.value)}
               className="text-slate-700 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-teal-500 focus:outline-none flex-1 mr-2 transition-colors"
             />
             <div className="flex items-center gap-2 shrink-0">
               <input 
                 type="number" 
                 value={exe.calories_burned} 
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

      {/* 5. 영업 매출 기록 */}
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

  const renderGallery = () => {
    const galleryLogs = logs.filter(l => l.photos && l.photos.length > 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

        <button 
          onClick={() => fileInputRef.current.click()}
          className="w-full bg-white border-2 border-dashed border-teal-300 text-teal-600 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-teal-50 transition-colors"
        >
          <Camera size={24} />
          <span>현재 날짜({currentDate.slice(5).replace('-','/')})에 사진 추가</span>
        </button>

        {galleryLogs.length === 0 ? (
           <div className="text-center py-10 text-slate-400">
             등록된 눈바디 사진이 없습니다.
           </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {galleryLogs.map(log => (
              <div key={log.id} className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col group relative overflow-hidden">
                <div className="w-full aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center relative overflow-hidden">
                   <img src={log.photos[0].url} alt={`${log.date} 눈바디`} className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="flex justify-between items-center px-2 py-3">
                  <span className="text-slate-500 text-sm font-medium">{log.date.slice(5).replace('-', '/')}</span>
                  <span className="font-black text-slate-800">{log.weight ? `${log.weight}kg` : '-'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
          {activeTab === 'home' && renderHome()}
          {activeTab === 'log' && renderLog()}
          {activeTab === 'gallery' && renderGallery()}
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