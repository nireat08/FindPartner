// [보안] 키보드 단축키 방지 (F12, 소스보기, 저장, 인쇄, 개발자도구 등)
document.addEventListener('keydown', function (e) {
    // F12
    if (e.keyCode === 123) { e.preventDefault(); return false; }
    // Ctrl+Shift+I (개발자 도구), Ctrl+Shift+J (콘솔), Ctrl+Shift+C (요소 검사)
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
        e.preventDefault(); return false;
    }
    // Ctrl+U (소스 보기)
    if (e.ctrlKey && e.keyCode === 85) { e.preventDefault(); return false; }
    // Ctrl+S (저장)
    if (e.ctrlKey && e.keyCode === 83) { e.preventDefault(); return false; }
    // Ctrl+P (인쇄)
    if (e.ctrlKey && e.keyCode === 80) { e.preventDefault(); return false; }
});

const GAS_URL = "https://script.google.com/macros/s/AKfycbz6Olo7dxvy60Hvn7th15S6iiYBOfj8TEF7mcZSY7vPUll5-hNWTevdzT4-KXv9g7VA/exec";

let map;
let markers = []; // This will now act as a reference if needed, but mainly use cluster
let markerClusterGroup; // New global for clustering
let isClusteringEnabled = true; // [신규] 클러스터링 토글 상태
let userLat = null; // [신규] 사용자 현재 위도
let userLng = null; // [신규] 사용자 현재 경도
let ALL_DATA = [];
let currentCategory = 'all';

document.addEventListener("DOMContentLoaded", function () {
    initMap();
    fetchData();
    requestInitialLocation(); // [신규] 페이지 진입 시 위치 권한 요청
    handleResponsiveLayout(); // [신규] 화면 크기에 따른 레이아웃 처리

    const listEl = document.getElementById('listContent');
    listEl.addEventListener('scroll', () => {
        const btn = document.getElementById('topBtn');
        if (listEl.scrollTop > 300) btn.classList.add('show');
        else btn.classList.remove('show');
    });

    window.addEventListener('scroll', () => {
        if (window.innerWidth <= 900) {
            const btn = document.getElementById('topBtn');
            if (window.scrollY > 300) btn.classList.add('show');
            else btn.classList.remove('show');
        }
    });
    window.addEventListener('resize', handleResponsiveLayout);
});

// [신규] 모바일 버전에서 컨트롤 영역을 헤더로 이동시키는 포털 기능
function handleResponsiveLayout() {
    const controlArea = document.getElementById('controlArea');
    const mobilePortal = document.getElementById('mobileControlPortal');
    const aside = document.querySelector('.list-panel');
    const isMobile = window.innerWidth <= 900;

    if (isMobile) {
        if (controlArea.parentElement !== mobilePortal) {
            mobilePortal.appendChild(controlArea);
        }
    } else {
        if (controlArea.parentElement !== aside) {
            aside.insertBefore(controlArea, aside.firstChild);
        }
    }
}

function initMap() {
    // [변경] 대한민국 영역 제한 (독도 포함, 일본/북한 최소화) - OSM 복구 시에도 유지
    const southWest = L.latLng(32.9, 124.0);
    const northEast = L.latLng(38.9, 132.5);
    const bounds = L.latLngBounds(southWest, northEast);

    map = L.map('map', {
        center: [36.5, 127.5],
        zoom: 7,
        minZoom: 7,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
    });

    map.attributionControl.setPrefix(false);

    // [복구] OpenStreetMap (OSM)
    // 기본 타일 (Light)
    window.lightTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // 다크 모드용 타일 (CartoDB Dark Matter)
    window.darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CartoDB',
        maxZoom: 19
    });

    // 마커 클러스터 그룹 초기화
    markerClusterGroup = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        removeOutsideVisibleBounds: true,
        iconCreateFunction: function (cluster) {
            return L.divIcon({
                html: '<div><span>' + cluster.getChildCount() + '</span></div>',
                className: 'marker-cluster-custom',
                iconSize: L.point(40, 40)
            });
        }
    });

    // 초기 로딩 시 클러스터링 활성화 상태면 추가
    if (isClusteringEnabled) {
        map.addLayer(markerClusterGroup);
    }
}

function getStoreLatLng(store) {
    let lat = null;
    let lng = null;

    if (store.lat && store.lng) {
        lat = parseFloat(store.lat);
        lng = parseFloat(store.lng);
    }
    else if (store.coord || store.coordinates) {
        const coordStr = store.coord || store.coordinates;
        if (typeof coordStr === 'string' && coordStr.includes(',')) {
            const parts = coordStr.split(',');
            if (parts.length === 2) {
                lat = parseFloat(parts[0].trim());
                lng = parseFloat(parts[1].trim());
            }
        }
    }

    if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
    }
    return null;
}

function getMarkerIcon(category, isPremium) {
    /* [주석처리] 프리미엄 아이콘 비활성화
    if (isPremium) {
        return L.divIcon({
            className: 'custom-pin premium-pin',
            html: `<i class="fa-solid fa-crown"></i>`,
            iconSize: [48, 48],
            iconAnchor: [24, 48],
            popupAnchor: [0, -50]
        });
    }
    */

    const colors = {
        '서울': '#2f6286', '경기': '#72bf44', '인천': '#00bcd4', '강원': '#03a9f4',
        '충남': '#ff9800', '충북': '#ffc107', '세종': '#ffeb3b', '대전': '#ff5722',
        '전남': '#9c27b0', '전북': '#673ab7', '경남': '#f44336', '경북': '#e53935',
        '대구': '#d32f2f', '부산': '#c62828', '울산': '#b71c1c', '제주': '#ff5722'
    };
    const color = colors[category] || '#2f6286';

    return L.divIcon({
        className: 'custom-pin',
        html: `<i class="fa-solid fa-location-dot" style="color:${color};"></i>`,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -45]
    });
}

function fetchData() {
    fetch(GAS_URL)
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);
            ALL_DATA = data;
            applyFilter();
        })
        .catch(err => {
            document.getElementById("listContent").innerHTML =
                '<div class="message-box" style="color:red;">데이터 로드 실패</div>';
        });
}

function updateMarkers(stores) {
    // 기존 마커 및 클러스터 제거
    markerClusterGroup.clearLayers();
    // 개별 마커 레이어 제거 (클러스터 미사용 시)
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const bounds = [];

    stores.forEach((store) => {
        const pos = getStoreLatLng(store);

        if (pos) {
            // [주석처리] 프리미엄 로직 비활성화
            const isPremium = false;
            const customIcon = getMarkerIcon(store.category, isPremium);
            const marker = L.marker([pos.lat, pos.lng], { icon: customIcon });


            // const badgeHtml = isPremium ? '<span style="background:#FFD700; color:#fff; padding:2px 5px; border-radius:3px; font-size:10px; margin-right:5px;">PREMIUM</span>' : '';
            const badgeHtml = '';

            // [상세 정보 HTML 생성]
            let branchHtml = '';
            if (store.branch && store.branch.trim() !== '') {
                branchHtml = `<div class="map-popup-branch">퀄리스포츠 ${store.branch}</div>`;
            }

            // [변경] 웹사이트(데스크탑)에서 정보를 모두 표시하기 위해 팝업 내용은 항상 전체 정보를 포함하도록 생성
            // 모바일에서는 노출 시점(focusMarker)에서 팝업이 뜨지 않게 제어하므로, 데이터는 항상 전체를 바인딩해둡니다.
            let popupLinkBtn = '';

            // 네이버 지도로 보기 (상세)
            if (store.link && store.link.trim() !== '' && store.link !== '#') {
                popupLinkBtn += `
                    <a href="${store.link}" target="_blank" class="map-popup-btn">
                        네이버 지도로 보기
                    </a>
                `;
            }

            // 길찾기 버튼 (네이버) - 클릭 시점에 동적으로 내 위치 확인하여 연동
            popupLinkBtn += `
                <a href="#" onclick="openNaverNavi(${pos.lat}, ${pos.lng}, '${store.name}'); return false;" class="btn-map-link">
                    <i class="fa-solid fa-location-arrow"></i> 네이버 길찾기
                </a>
            `;

            const addressHtml = `<div class="map-popup-row popup-mobile-hide"><i class="fa-solid fa-location-dot"></i> ${store.address}</div>`;
            const phoneHtml = store.phone ? `<div class="map-popup-row popup-mobile-hide"><i class="fa-solid fa-phone"></i> <a href="tel:${store.phone}">${store.phone}</a></div>` : '';
            const closedHtml = `<div class="map-popup-row popup-mobile-hide"><i class="fa-regular fa-calendar-xmark"></i> 휴무: ${store.closed || '없음'}</div>`;

            const popupContent = `
                <div class="map-popup-inner">
                    <div class="map-popup-header">
                        <h4 class="map-popup-title">${badgeHtml}${store.name}</h4>
                        ${branchHtml}
                    </div>
                    <div class="map-popup-body">
                        ${addressHtml}
                        ${phoneHtml}
                        ${closedHtml}
                    </div>
                    <div class="map-popup-buttons">
                        ${popupLinkBtn}
                    </div>
                </div>
            `;

            // [수정] 모바일에서도 팝업을 다시 노출하되, CSS로 정보를 최적화하여 잘림 방지
            marker.bindPopup(popupContent);

            marker.on('click', () => {
                const isMobile = window.innerWidth <= 900;

                if (isMobile) {
                    // 모바일: 팝업도 띄우고 정보 바도 노출
                    highlightListItem(store.name, false);
                    showSelectedStore(store.name);
                    setActivePin(marker);
                    focusMarker(marker, pos, store); // 팝업 노출을 위해 추가
                } else {
                    // 데스크탑: 기존 동작 (팝업 + 리스트 강조 + 스크롤)
                    highlightListItem(store.name, true);
                    showSelectedStore(store.name);
                    focusMarker(marker, pos, store);
                }
            });

            store.markerRef = marker;
            markers.push(marker); // Keep reference

            // [신규] 클러스터링 토글 상태에 따라 추가 방식 분기
            if (isClusteringEnabled) {
                markerClusterGroup.addLayer(marker);
            } else {
                marker.addTo(map);
            }

            bounds.push([pos.lat, pos.lng]);
        }
    });

    // 클러스터링 미사용 시에도 markerClusterGroup Layer는 map에 있어야 할 수 있으나(관리상),
    // 토글 시 isClusteringEnabled에 따라 clearLayers 혹은 removeLayer 처리를 하는 것이 깔끔.
    // 여기서는 applyFilter가 전체 재호출되므로, 위쪽 로직으로 충분.
    if (isClusteringEnabled) {
        if (!map.hasLayer(markerClusterGroup)) map.addLayer(markerClusterGroup);
    } else {
        if (map.hasLayer(markerClusterGroup)) map.removeLayer(markerClusterGroup);
    }

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// [신규 기능] 활성화 핀 스타일 적용 (빨간색 강조)
function setActivePin(marker) {
    // 모든 마커에서 active-pin 클래스 제거
    document.querySelectorAll('.custom-pin').forEach(el => {
        el.classList.remove('active-pin');
        el.style.zIndex = ""; // z-index 초기화
    });

    // 현재 마커 아이콘에 클래스 추가
    if (marker && marker.getElement()) {
        const iconEl = marker.getElement();
        iconEl.classList.add('active-pin');
        iconEl.style.zIndex = 9999;
    }
}

// [신규 기능] 초기 위치 권한 요청
function requestInitialLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLat = position.coords.latitude;
                userLng = position.coords.longitude;
                // console.log("Initial location acquired:", userLat, userLng);
            },
            (error) => {
                // console.warn("Location permission denied or error.");
            }
        );
    }
}

// [신규 기능] 네이버 길찾기 동적 연동
function openNaverNavi(lat, lng, name) {
    // 기본 URL (도착지)
    let url = `https://map.naver.com/index.nhn?elat=${lat}&elng=${lng}&etext=${name}&menu=route`;

    // 현재 시점의 내 위치가 있으면 출발지로 추가
    // 만약 userLat가 없다면, 다시 한번 시도해볼 수도 있음 (여기서는 저장된 값 사용)
    if (navigator.geolocation && (!userLat || !userLng)) {
        // 위치 정보가 없으면, 즉시 요청 후 이동 시도 (약간의 딜레이 발생 가능하므로 바로 이동시키는게 나을수도 있음)
        // 여기서는 사용자 경험상 바로 띄우는게 낫지만, 권한 체크를 위해 getCurrentPosition을 한 번 더 수행
        navigator.geolocation.getCurrentPosition((position) => {
            userLat = position.coords.latitude;
            userLng = position.coords.longitude;
            url += `&slat=${userLat}&slng=${userLng}&stext=내위치`;
            window.open(url, '_blank');
        }, () => {
            // 권한 없으면 도착지만
            window.open(url, '_blank');
        });
    } else if (userLat && userLng) {
        url += `&slat=${userLat}&slng=${userLng}&stext=내위치`;
        window.open(url, '_blank');
    } else {
        window.open(url, '_blank');
    }
}

// [신규 기능] 클러스터링 토글
function toggleClustering() {
    isClusteringEnabled = !isClusteringEnabled;
    const btn = document.getElementById('btnCluster'); // ID 변경

    if (isClusteringEnabled) {
        btn.classList.add('active');
        applyFilter();
    } else {
        btn.classList.remove('active');
        applyFilter();
    }
}

// [신규 기능] 다크 모드 토글
function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    const btn = document.getElementById('btnDarkMode'); // ID 변경

    if (isDark) {
        btn.classList.add('active');
        if (map && window.darkTile) {
            map.removeLayer(window.lightTile);
            window.darkTile.addTo(map);
        }
    } else {
        btn.classList.remove('active');
        if (map && window.lightTile) {
            map.removeLayer(window.darkTile);
            window.lightTile.addTo(map);
        }
    }
}

// [신규 기능] 내 위치 토글 (Toggle)
function toggleMyLocation() {
    const btn = document.getElementById('btnMyLocation');

    // 이미 마커가 있다면 -> 끄기 (제거)
    if (window.myLocationMarker) {
        map.removeLayer(window.myLocationMarker);
        window.myLocationMarker = null;
        btn.classList.remove('active');
        return;
    }

    // 없다면 -> 켜기 (찾기)
    if (!navigator.geolocation) {
        alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // [업데이트] 전역 변수 동기화
            userLat = lat;
            userLng = lng;

            // 지도 이동
            map.flyTo([lat, lng], 14, { duration: 1.5 });

            // [변경] 커스텀 디자인 마커 (레이더 효과)
            const myLocIcon = L.divIcon({
                className: 'my-location-marker',
                html: '<div class="my-location-pulse"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            // [변경] 커스텀 팝업 적용 (X버튼 숨김, 오토클로즈)
            window.myLocationMarker = L.marker([lat, lng], { icon: myLocIcon }).addTo(map)
                .bindPopup('현재 내 위치', {
                    className: 'custom-location-popup',
                    minWidth: 50,
                    closeButton: false, // CSS로도 숨겼지만 명시적으로 false
                    autoClose: true,    // 다른거 누르면 닫힘
                    closeOnClick: true
                })
                .openPopup();

            // 버튼 활성화
            btn.classList.add('active');
        },
        (error) => {
            alert("위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.");
            btn.classList.remove('active');
        }
    );
}

function renderList(data) {
    const container = document.getElementById("listContent");
    container.innerHTML = "";

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="message-box">조건에 맞는 매장이 없습니다.</div>';
        return;
    }

    data.forEach((store) => {
        const isPremium = (store.grade === 'S');
        const pos = getStoreLatLng(store);

        let badgesHtml = '';
        if (store.testRide === "O") {
            badgesHtml += `
            <span class="badge test-ride">
                <i class="fa-solid fa-motorcycle"></i> 시승가능
            </span>`;
        }
        if (store.oneCare === "O") {
            badgesHtml += `
            <span class="badge one-care">
                <i class="fa-solid fa-screwdriver-wrench"></i> 원케어
            </span>`;
        }

        const phoneHtml = store.phone ? `<a href="tel:${store.phone}" class="phone-link" onclick="event.stopPropagation();">${store.phone}</a>` : '-';

        let branchHtml = '';
        if (store.branch && store.branch.trim() !== '') {
            branchHtml = `<div class="store-branch">퀄리스포츠 ${store.branch}</div>`;
        }

        const card = document.createElement("div");
        card.className = `store-card ${isPremium ? 'premium-card' : ''}`;
        card.dataset.storeName = store.name;

        card.onclick = () => {
            const targetPos = getStoreLatLng(store);

            document.querySelectorAll('.store-card').forEach(c => c.classList.remove('active-card'));
            card.classList.add('active-card');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });

            showSelectedStore(store.name);

            if (map && targetPos) {
                if (isClusteringEnabled && markerClusterGroup) {
                    markerClusterGroup.zoomToShowLayer(store.markerRef, () => {
                        // [수정] 리스트 클릭 시에만 모달 띄우도록
                        showMobileModal(store);
                        focusMarker(store.markerRef, targetPos, store);
                    });
                } else {
                    showMobileModal(store);
                    focusMarker(store.markerRef, targetPos, store);
                }
            }
        };

        // [주석처리] 프리미엄 아이콘 비활성화
        let locationIcon = /* isPremium
            ? '<i class="fa-solid fa-crown" style="color:#FFD700;"></i>'
            : */ (pos ? '<i class="fa-solid fa-location-dot" style="color:#e03131;"></i>' : '<i class="fa-solid fa-location-dot"></i>');

        card.innerHTML = `
            <div class="card-header">
                <h3 class="store-name">${store.name}</h3>
            </div>
            <div class="card-body">
                ${branchHtml}
                <div class="info-row">
                    ${locationIcon}
                    <div>${store.address}</div>
                </div>
                <div class="info-row">
                    <i class="fa-solid fa-phone"></i>
                    <div>${phoneHtml}</div>
                </div>
                <div class="closed-day">
                    <i class="fa-regular fa-calendar-xmark" style="color:#888; margin-right:4px;"></i>
                    휴무: ${store.closed || '없음'}
                </div>
                <div class="badge-group">${badgesHtml}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateFilter(checkbox) {
    const label = checkbox.parentElement;
    if (checkbox.checked) {
        label.classList.add('active');
    } else {
        label.classList.remove('active');
    }
}

function showSelectedStore(name) {
    const bar = document.getElementById('selectedStoreBar');
    const nameEl = document.getElementById('selectedStoreName');
    nameEl.innerText = name;
    bar.style.display = 'flex';
}

function clearSelection() {
    document.getElementById('selectedStoreBar').style.display = 'none';
    document.querySelectorAll('.store-card').forEach(c => c.classList.remove('active-card'));
    if (map) map.closePopup();
    setActivePin(null); // [추가] 선택 해제 시 핀 강조 초기화
    scrollToListTop();
}

function highlightListItem(storeName, shouldScroll = true) {
    const cards = document.querySelectorAll('.store-card');
    let targetCard = null;
    cards.forEach(card => {
        if (card.dataset.storeName === storeName) {
            card.classList.add('active-card');
            targetCard = card;
        } else {
            card.classList.remove('active-card');
        }
    });

    if (targetCard && shouldScroll) {
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            // 모바일: 최상단으로 스크롤 (start)
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // 데스크탑: 중앙으로 스크롤 (center)
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function scrollTabs(direction) {
    const container = document.getElementById('categoryTabs');
    const scrollAmount = 150;
    if (direction === 'left') container.scrollLeft -= scrollAmount;
    else container.scrollLeft += scrollAmount;
}

function setCategory(cat, el) {
    currentCategory = cat;
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    if (el) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    document.getElementById("searchInput").value = "";
    applyFilter();
}

function toggleClearBtn() {
    const input = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    if (input.value.length > 0) clearBtn.classList.add("show");
    else clearBtn.classList.remove("show");
}

function clearSearch() {
    const input = document.getElementById("searchInput");
    input.value = "";
    toggleClearBtn();
    filterData();
    input.focus();
}

function filterData() { toggleClearBtn(); applyFilter(); }

// [신규] 마커 및 팝업 포커싱 (모바일/데스크탑 모두 핀 좌우 정렬)
function focusMarker(marker, pos, storeData) {
    const isMobile = window.innerWidth <= 900;
    const zoomLevel = 16;

    // 맵의 중심으로부터 핀이 어느 쪽에 있는지에 따라 꼬리 방향 결정
    const mapCenter = map.getCenter();
    const isLeftOfCenter = pos.lng < mapCenter.lng;

    // 기본값은 핀이 왼쪽에 있고 팝업이 오른쪽에 오는 형태 (데스크탑 오프셋)
    let offsetPixels = isMobile ? 0 : 220; // 모바일은 팝업 안 쓰므로 오프셋 무의미
    let popupClass = 'side-popup popup-left-tail';
    let moveDirection = 1;

    if (!isLeftOfCenter) {
        popupClass = 'side-popup popup-right-tail';
        moveDirection = -1;
    }

    // 모바일에서는 단순히 핀이 중앙 근처에 오도록 처리 (오프셋 없이)
    const point = map.project([pos.lat, pos.lng], zoomLevel);
    const offsetValue = isMobile ? 0 : offsetPixels * moveDirection;
    const newPoint = point.add([offsetValue, 0]);
    const newCenter = map.unproject(newPoint, zoomLevel);

    map.flyTo(newCenter, zoomLevel, { animate: true, duration: 1 });

    // 데스크탑에서만 팝업 바인딩 및 오픈
    if (!isMobile) {
        const content = marker.getPopup().getContent();
        marker.bindPopup(content, {
            offset: [offsetPixels * moveDirection, 0],
            className: popupClass,
            closeOnClick: false
        });

        setTimeout(() => {
            marker.openPopup();
        }, 450);
    }

    // 핀 강조는 모바일/데스크탑 모두 적용
    setTimeout(() => {
        setActivePin(marker);
    }, 450);
}

let mobileMiniMap = null;

// [신규] 모바일 전용 상세 모달 표시
function showMobileModal(store) {
    if (window.innerWidth > 900) return; // 데스크탑은 무시

    const body = document.getElementById('mobileModalBody');
    const pos = getStoreLatLng(store);

    // 모달 내용에 미니 지도 영역 추가
    let miniMapHtml = `<div id="mobileMiniMap"></div>`;

    let branchHtml = '';
    if (store.branch && store.branch.trim() !== '') {
        branchHtml = `<div class="map-popup-branch" style="margin-bottom:10px;">퀄리스포츠 ${store.branch}</div>`;
    }

    let popupLinkBtn = '';
    if (store.link && store.link.trim() !== '' && store.link !== '#') {
        popupLinkBtn += `
            <a href="${store.link}" target="_blank" class="map-popup-btn">
                네이버 지도로 보기
            </a>
        `;
    }
    popupLinkBtn += `
        <a href="#" onclick="openNaverNavi(${pos.lat}, ${pos.lng}, '${store.name}'); return false;" class="btn-map-link">
            <i class="fa-solid fa-location-arrow"></i> 네이버 길찾기
        </a>
    `;

    // 모바일 모달은 모든 정보 표시 (원래대로)
    body.innerHTML = `
        <div class="map-popup-inner" style="padding:0;">
            ${miniMapHtml}
            <div class="map-popup-header">
                <h4 class="map-popup-title" style="font-size:20px;">${store.name}</h4>
                ${branchHtml}
            </div>
            <div class="map-popup-body" style="font-size:15px; margin: 15px 0;">
                <div class="map-popup-row"><i class="fa-solid fa-location-dot"></i> ${store.address}</div>
                <div class="map-popup-row"><i class="fa-solid fa-phone"></i> <a href="tel:${store.phone}">${store.phone || '-'}</a></div>
                <div class="map-popup-row"><i class="fa-regular fa-calendar-xmark"></i> 휴무: ${store.closed || '없음'}</div>
            </div>
            <div class="map-popup-buttons" style="margin-top:20px;">
                ${popupLinkBtn}
            </div>
        </div>
    `;

    const overlay = document.getElementById('mobileModalOverlay');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // 모달 내 미니 지도 초기화 (비동기 처리)
    setTimeout(() => {
        if (mobileMiniMap) {
            mobileMiniMap.remove();
        }
        mobileMiniMap = L.map('mobileMiniMap', {
            center: [pos.lat, pos.lng],
            zoom: 15,
            zoomControl: false,
            dragging: false,
            touchZoom: false,
            scrollWheelZoom: false,
            doubleClickZoom: false
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mobileMiniMap);

        const miniIcon = L.divIcon({
            className: 'custom-pin',
            html: `<i class="fa-solid fa-location-dot" style="color:#ff3b30; font-size:30px;"></i>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });
        L.marker([pos.lat, pos.lng], { icon: miniIcon }).addTo(mobileMiniMap);

        // 맵 클릭 시 네이버 지도로 연결되게 설정
        mobileMiniMap.on('click', () => {
            window.open(`https://map.naver.com/v5/search/${encodeURIComponent(store.address)}`, '_blank');
        });
    }, 200);
}

function closeMobileModal() {
    const overlay = document.getElementById('mobileModalOverlay');
    overlay.classList.remove('show');
    document.body.style.overflow = '';
}

function applyFilter() {
    const keyword = document.getElementById("searchInput").value.toUpperCase().trim();
    // [주석처리] 프리미엄 필터 체크박스 비활성화
    // const showPremiumOnly = document.getElementById("premiumCheck").checked;
    const showPremiumOnly = false; // 강제 false 처리
    const showOneCareOnly = document.getElementById("oneCareCheck").checked;
    const showTestRideOnly = document.getElementById("testRideCheck").checked;

    clearSelection();

    // 1. 필터링 수행
    let filtered = ALL_DATA.filter(store => {
        if (currentCategory !== 'all' && store.category !== currentCategory) return false;

        if (showPremiumOnly && store.grade !== 'S') return false;
        if (showOneCareOnly && store.oneCare !== 'O') return false;
        if (showTestRideOnly && store.testRide !== 'O') return false;

        if (keyword !== "") {
            return (store.name && store.name.toUpperCase().includes(keyword)) ||
                (store.address && store.address.toUpperCase().includes(keyword)) ||
                (store.branch && store.branch.toUpperCase().includes(keyword));
        }
        return true;
    });

    // 2. [주석처리] 정렬 수행 비활성화 (S등급 최상단 기능 끔)
    /*
    filtered.sort((a, b) => {
        const isPremiumA = a.grade === 'S';
        const isPremiumB = b.grade === 'S';

        if (isPremiumA && !isPremiumB) return -1; // A가 프리미엄이면 앞으로
        if (!isPremiumA && isPremiumB) return 1;  // B가 프리미엄이면 앞으로
        return 0; // 둘 다 같으면 순서 유지
    });
    */

    renderList(filtered);
    updateMarkers(filtered);
    scrollToListTop();
}

function scrollToListTop() {
    const listEl = document.getElementById('listContent');
    listEl.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.innerWidth <= 900) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) return false;
});
