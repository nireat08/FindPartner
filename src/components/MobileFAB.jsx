import React, { useState } from 'react';
import { useStoreContext } from '../StoreContext';
import { CONFIG } from '../config';

export default function MobileFAB() {
    const { isClustered, setIsClustered } = useStoreContext();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="fixed bottom-[160px] right-5 z-[2100] flex flex-col items-end gap-3 pointer-events-none">
            {/* Menu Items */}
            <div className={`flex flex-col items-end gap-2.5 transition-all duration-300 origin-bottom-right ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                <button 
                    onClick={() => {
                        setIsClustered(!isClustered);
                        setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 bg-gray-900 text-white rounded-xl shadow-lg font-semibold text-sm min-w-[160px] pointer-events-auto transition-transform active:scale-95"
                >
                    <i className="fa-solid fa-layer-group text-white"></i> {isClustered ? '지도 핀 펼쳐보기' : '지도 핀 모아보기'}
                </button>
                <button 
                    onClick={() => {
                        const mapBtn = document.querySelector('button[title="내 위치 끄기"], button[title="내 위치 찾기"]');
                        if (mapBtn) mapBtn.click();
                        setIsOpen(false);
                    }}
                    className="flex items-center justify-center gap-2.5 px-4 py-3 bg-white text-gray-900 rounded-xl shadow-lg font-semibold text-sm min-w-[160px] pointer-events-auto transition-transform active:scale-95"
                >
                    <i className="fa-solid fa-location-crosshairs text-blue-600"></i> 내 위치 토글
                </button>
                <a href={CONFIG.EXTERNAL_SERVICES.KAKAO_CHANNEL} target="_blank" rel="noreferrer" className="flex items-center justify-center px-4 py-3 bg-[#FEE500] text-[#191919] rounded-xl shadow-lg font-semibold text-sm min-w-[160px] pointer-events-auto transition-transform active:scale-95">
                    카카오톡 문의
                </a>
                <a href={CONFIG.EXTERNAL_SERVICES.REGIST_CENTER} target="_blank" rel="noreferrer" className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-xl shadow-lg font-semibold text-sm min-w-[160px] pointer-events-auto transition-transform active:scale-95">
                    제품등록센터
                </a>
                <a href="about:blank" target="_blank" rel="noreferrer" className="flex items-center justify-center px-4 py-3 bg-white text-gray-800 border border-gray-200 rounded-xl shadow-lg font-semibold text-sm min-w-[160px] pointer-events-auto transition-transform active:scale-95">
                    제품가이드
                </a>
            </div>

            {/* Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xl hover:bg-blue-700 transition-all active:scale-95 pointer-events-auto"
            >
                <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
            </button>
        </div>
    );
}

