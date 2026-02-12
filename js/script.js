// [보안] 키보드 단축키 방지 (F12, 소스보기, 저장, 인쇄, 개발자도구 등)
document.addEventListener('keydown', function(e) {
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
let markers = [];
let ALL_DATA = []; 
let currentCategory = 'all';

document.addEventListener("DOMContentLoaded", function() {
    initMap();
    fetchData();
    
    const listEl = document.getElementById('listContent');
    listEl.addEventListener('scroll', () => {
        const btn = document.getElementById('topBtn');
        if (listEl.scrollTop > 300) btn.classList.add('show');
        else btn.classList.remove('show');
    });

    window.addEventListener('scroll', () => {
        if(window.innerWidth <= 900) {
            const btn = document.getElementById('topBtn');
            if (window.scrollY > 300) btn.classList.add('show');
            else btn.classList.remove('show');
        }
    });
});

function initMap() {
    const southWest = L.latLng(32.8, 124.5);
    const northEast = L.latLng(38.65, 132.0); 
    const bounds = L.latLngBounds(southWest, northEast);

    map = L.map('map', {
        center: [37.5665, 126.9780],
        zoom: 10,
        minZoom: 7,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0
    });
    
    map.attributionControl.setPrefix(false);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
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
    if (isPremium) {
        return L.divIcon({
            className: 'custom-pin premium-pin', 
            html: `<i class="fa-solid fa-crown"></i>`, 
            iconSize: [48, 48],
            iconAnchor: [24, 48], 
            popupAnchor: [0, -50]
        });
    }

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
    markers.forEach(layer => map.removeLayer(layer));
    markers = [];
    const bounds = []; 

    stores.forEach((store) => {
        const pos = getStoreLatLng(store);

        if (pos) {
            const isPremium = (store.grade === 'S');
            const customIcon = getMarkerIcon(store.category, isPremium);
            const marker = L.marker([pos.lat, pos.lng], { icon: customIcon }).addTo(map);

            const badgeHtml = isPremium ? '<span style="background:#FFD700; color:#fff; padding:2px 5px; border-radius:3px; font-size:10px; margin-right:5px;">PREMIUM</span>' : '';

            // [팝업에 네이버 지도 링크 버튼 추가]
            let popupLinkBtn = '';
            if (store.link && store.link.trim() !== '' && store.link !== '#') {
                popupLinkBtn = `
                    <div style="margin-top:8px; text-align:center;">
                        <a href="${store.link}" target="_blank" style="
                            display: inline-block; padding: 4px 12px; 
                            background-color: #03C75A; color: white; 
                            text-decoration: none; border-radius: 4px; 
                            font-size: 11px; font-weight: 500;">
                            네이버지도보기
                        </a>
                    </div>
                `;
            }

            const popupContent = `
                <div style="font-family:'Noto Sans KR'; min-width:160px;">
                    <h4 style="margin:0 0 5px; color:#2f6286;">
                        ${badgeHtml}${store.name}
                    </h4>
                    <p style="margin:0; font-size:12px; color:#555;">${store.phone || ''}</p>
                    ${popupLinkBtn}
                </div>
            `;
            marker.bindPopup(popupContent);

            marker.on('click', () => {
                highlightListItem(store.name);
                showSelectedStore(store.name); 
            });
            store.markerRef = marker; 
            markers.push(marker);
            bounds.push([pos.lat, pos.lng]);
        }
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50] });
    }
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
                map.flyTo([targetPos.lat, targetPos.lng], 16, { duration: 1.5 });
                if (store.markerRef) store.markerRef.openPopup();
                
                if (window.innerWidth <= 900) {
                     document.querySelector('.map-panel').scrollIntoView({behavior: 'smooth'});
                }
            }
        };

        let locationIcon = isPremium 
            ? '<i class="fa-solid fa-crown" style="color:#FFD700;"></i>' 
            : (pos ? '<i class="fa-solid fa-location-dot" style="color:#e03131;"></i>' : '<i class="fa-solid fa-location-dot"></i>');

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
    if(checkbox.checked) {
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
    if(map) map.closePopup();
    scrollToListTop();
}

function highlightListItem(storeName) {
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
    if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
    if(el) {
        el.classList.add('active');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    document.getElementById("searchInput").value = "";
    applyFilter();
}

function filterData() { applyFilter(); }

function applyFilter() {
    const keyword = document.getElementById("searchInput").value.toUpperCase().trim();
    const showPremiumOnly = document.getElementById("premiumCheck").checked;
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

    // 2. [추가] 정렬 수행 (S등급 최상단, 나머지는 원래 순서 유지)
    filtered.sort((a, b) => {
        const isPremiumA = a.grade === 'S';
        const isPremiumB = b.grade === 'S';
        
        if (isPremiumA && !isPremiumB) return -1; // A가 프리미엄이면 앞으로
        if (!isPremiumA && isPremiumB) return 1;  // B가 프리미엄이면 앞으로
        return 0; // 둘 다 같으면 순서 유지
    });

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

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || e.keyCode === 123) return false;
});
