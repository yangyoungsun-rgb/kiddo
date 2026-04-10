import React from 'react';
import { Camera } from 'lucide-react';

function getPhotoSrc(photo) {
  if (!photo) return '';
  if (typeof photo === 'string') return photo;
  if (typeof photo.url === 'string') return photo.url;
  if (typeof photo.photoUrl === 'string') return photo.photoUrl;
  if (typeof photo.src === 'string') return photo.src;
  return '';
}

export default function GalleryTab({ logs, currentDate, fileInputRef, handleImageUpload }) {
  const galleryItems = logs.flatMap(log =>
    (log.photos || [])
      .map((photo, index) => ({
        id: `${log.id}-${index}`,
        date: log.date || log.id,
        weight: log.weight,
        src: getPhotoSrc(photo),
      }))
      .filter(item => Boolean(item.src)),
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-white border-2 border-dashed border-teal-300 text-teal-600 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-teal-50 transition-colors"
      >
        <Camera size={24} />
        <span>현재 날짜({currentDate.slice(5).replace('-', '/')})에 사진 추가</span>
      </button>

      {galleryItems.length === 0 ? (
        <div className="text-center py-10 text-slate-400">등록된 눈바디 사진이 없습니다.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {galleryItems.map(item => (
            <div
              key={item.id}
              className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col group relative overflow-hidden"
            >
              <div className="w-full aspect-[4/5] rounded-xl bg-slate-100 flex items-center justify-center relative overflow-hidden">
                <img
                  src={item.src}
                  alt={`${item.date} 눈바디`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex justify-between items-center px-2 py-3">
                <span className="text-slate-500 text-sm font-medium">{item.date.slice(5).replace('-', '/')}</span>
                <span className="font-black text-slate-800">{item.weight ? `${item.weight}kg` : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
