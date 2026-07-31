import React from 'react';
import { useStoreContext } from '../StoreContext';
import { CONFIG } from '../config';
import ControlArea from './ControlArea';

export default function Header() {
    const { isMobile } = useStoreContext();

    return (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-200">
            <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
                {/* Left Side: Title, Subtitle, and Action Buttons */}
                <div className="flex flex-col gap-1.5">
                    <div className="text-lg md:text-xl font-extrabold tracking-tight text-gray-900">전국 대리점 안내</div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                        <div className="text-xs md:text-sm text-gray-500">가까운 공식 대리점을 검색해보세요</div>
                        {!isMobile && (
                            <div className="flex items-center gap-2">
                                <a href={CONFIG.EXTERNAL_SERVICES.KAKAO_CHANNEL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1 bg-[#FEE500] hover:bg-[#F4DC00] text-[#000000] text-xs font-bold rounded-full transition-colors shadow-sm">
                                    <i className="fa-brands fa-kakao text-sm"></i> 카카오톡 1:1상담 하기
                                </a>
                                <a href={CONFIG.EXTERNAL_SERVICES.REGIST_CENTER} target="_blank" rel="noreferrer" className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-full transition-colors shadow-sm">
                                    정품등록센터
                                </a>
                                <a href="about:blank" target="_blank" rel="noreferrer" className="flex items-center px-3 py-1 bg-white hover:bg-gray-100 text-black border border-gray-300 text-xs font-bold rounded-full transition-colors shadow-sm">
                                    제품가이드
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Logo Only */}
                <div className="flex items-center">
                    <div className="h-6 md:h-7 w-auto">
                        <img src="https://cdn.xtron-guide.kr/common/logos/Xtron_x_Qualisports_Logo_Black.webp" alt="Qualisports Logo" className="h-full object-contain" />
                    </div>
                </div>
            </div>

            {/* Mobile Control Area (Search & Filters) injected below header */}
            {isMobile && (
                <div className="w-full">
                    <ControlArea />
                </div>
            )}
        </header>
    );
}

