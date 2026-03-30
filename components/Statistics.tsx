import React from 'react';

export const Statistics: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] w-full animate-fade-in">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <span className="material-symbols-outlined text-6xl text-slate-300">construction</span>
        <h2 className="text-2xl font-bold text-slate-700">준비중</h2>
        <p className="text-sm">통계 페이지는 현재 준비 중입니다.</p>
      </div>
    </div>
  );
};
