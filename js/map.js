// map.js — интерактивная карта Яндекса на странице «Контакты».
// Координаты и адрес берутся из объекта school (data.js).
//
// 1) Загружаем JavaScript API Яндекс Карт 2.1 и рисуем карту: метки офиса и метро,
//    пешеходную линию, балуны, кнопки масштаба, слоёв и полноэкранного режима.
// 2) Свои элементы управления над картой работают всегда:
//    «Офис / Метро / Путь от метро», кнопки «+» и «−», клавиши + − и стрелки.
// 3) Колесо мыши масштабирует карту только после щелчка по ней — так страница
//    не «застревает» на карте при обычной прокрутке.
// 4) Если API не загрузился (нет интернета, блокировщик, нужен ключ),
//    показываем виджет-карту Яндекса в iframe. Её тоже можно двигать и масштабировать,
//    а наши кнопки меняют её центр и масштаб.

'use strict';

// Ключ можно бесплатно получить на https://developer.tech.yandex.ru/ (JavaScript API и HTTP Геокодер).
const YANDEX_MAPS_API_KEY = '';
const MAP_LOAD_TIMEOUT = 7000; // мс
const MIN_ZOOM = 10;
const MAX_ZOOM = 19;

const mapContainer = document.getElementById('map');

if (mapContainer && typeof school !== 'undefined') {
  const mapStatus = document.getElementById('map-status');
  const zoomLabel = document.getElementById('map-zoom-level');
  const viewButtons = document.querySelectorAll('[data-map-action]');
  const zoomButtons = document.querySelectorAll('[data-map-zoom]');
  const office = school.coords;
  const metro = school.metroCoords;
  const walkPath = [metro, [55.764420, 37.605800], [55.762900, 37.608100], office];

  // Состояние карты — общее для обоих режимов
  const state = { mode: 'loading', center: [...office], zoom: 16, points: 'both' };
  let apiMap = null;
  let officeMark = null;
  let metroMark = null;

  const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const updateZoomLabel = () => {
    if (zoomLabel) zoomLabel.textContent = `Масштаб ${state.zoom}`;
    zoomButtons.forEach((button) => {
      const step = Number(button.dataset.mapZoom);
      button.disabled = state.mode === 'loading' || (step < 0 ? state.zoom <= MIN_ZOOM : state.zoom >= MAX_ZOOM);
    });
  };

  const setActive = (action) => {
    viewButtons.forEach((button) => {
      const active = button.dataset.mapAction === action;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('btn-primary', active);
      button.classList.toggle('btn-outline-primary', !active);
    });
  };

  // ---------- режим iframe ----------
  const widgetSrc = () => {
    const marks = [];
    if (state.points !== 'metro') marks.push(`${office[1]},${office[0]},pm2rdl`);
    if (state.points !== 'office') marks.push(`${metro[1]},${metro[0]},pm2bll`);
    const params = new URLSearchParams({
      ll: `${state.center[1]},${state.center[0]}`,   // в URL Яндекса сначала долгота
      z: String(state.zoom),
      pt: marks.join('~'),
    });
    return `https://yandex.ru/map-widget/v1/?${params.toString()}`;
  };

  const renderWidget = () => {
    let frame = mapContainer.querySelector('iframe');
    if (!frame) {
      frame = document.createElement('iframe');
      frame.title = 'Карта Яндекса: офис школы «Слово» и метро «Пушкинская»';
      frame.allowFullscreen = true;
      mapContainer.replaceChildren(frame);
    }
    frame.src = widgetSrc();
  };

  const showWidget = () => {
    if (state.mode !== 'loading') return;
    state.mode = 'widget';
    renderWidget();
    updateZoomLabel();
  };

  // ---------- режим API ----------
  const initApiMap = () => {
    state.mode = 'api';
    mapContainer.replaceChildren();

    apiMap = new ymaps.Map(mapContainer, {
      center: state.center,
      zoom: state.zoom,
      controls: ['zoomControl', 'typeSelector', 'fullscreenControl', 'geolocationControl'],
    }, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
    });

    // перетаскивание, двойной щелчок и жесты включены по умолчанию;
    // колесо мыши включаем только после щелчка по карте
    apiMap.behaviors.disable('scrollZoom');

    officeMark = new ymaps.Placemark(office, {
      iconCaption: 'Школа «Слово»',
      hintContent: 'Офис школы «Слово»',
      balloonContentHeader: school.name,
      balloonContentBody: `г. ${school.city}, ${school.address}<br>${school.workHours}`,
      balloonContentFooter: `Телефон: ${school.phone}`,
    }, { preset: 'islands#redEducationIcon' });

    metroMark = new ymaps.Placemark(metro, {
      iconCaption: `м. ${school.metro}`,
      hintContent: `Станция метро «${school.metro}»`,
      balloonContentBody: 'До школы около 7 минут пешком (≈ 600 м).',
    }, { preset: 'islands#blueRapidTransitIcon' });

    const walkLine = new ymaps.Polyline(walkPath, { hintContent: 'Пешком от метро ≈ 600 м' }, {
      strokeColor: '#c8102e',
      strokeWidth: 5,
      strokeStyle: 'shortdash',
      strokeOpacity: 0.9,
    });

    apiMap.geoObjects.add(walkLine).add(metroMark).add(officeMark);

    // масштаб и центр могли измениться колесом, жестом или встроенными кнопками
    apiMap.events.add('boundschange', (event) => {
      state.zoom = event.get('newZoom');
      state.center = event.get('newCenter');
      updateZoomLabel();
    });

    updateZoomLabel();
  };

  // ---------- общие действия ----------
  const applyView = () => {
    if (state.mode === 'api') {
      apiMap.setCenter(state.center, state.zoom, { duration: 300, checkZoomRange: true });
    } else if (state.mode === 'widget') {
      renderWidget();
    }
    updateZoomLabel();
  };

  const zoomBy = (step) => {
    if (state.mode === 'loading') return;
    state.zoom = clampZoom(state.zoom + step);
    applyView();
  };

  // сдвиг на часть видимой области: её размер в градусах зависит от масштаба
  const panBy = (dLat, dLon) => {
    if (state.mode === 'loading') return;
    const span = 360 / 2 ** state.zoom;
    state.center = [state.center[0] + dLat * span * 0.5, state.center[1] + dLon * span];
    applyView();
  };

  const views = {
    office: () => {
      Object.assign(state, { center: [...office], zoom: 17, points: 'both' });
      applyView();
      if (officeMark) officeMark.balloon.open();
    },
    metro: () => {
      Object.assign(state, { center: [...metro], zoom: 17, points: 'both' });
      applyView();
      if (metroMark) metroMark.balloon.open();
    },
    route: () => {
      state.points = 'both';
      if (state.mode === 'api') {
        apiMap.balloon.close();
        apiMap.setBounds(ymaps.util.bounds.fromPoints(walkPath), { checkZoomRange: true, zoomMargin: 50, duration: 300 });
      } else {
        state.center = [(office[0] + metro[0]) / 2, (office[1] + metro[1]) / 2];
        state.zoom = 16;
        applyView();
      }
    },
  };

  viewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (state.mode === 'loading') return;
      views[button.dataset.mapAction]();
      setActive(button.dataset.mapAction);
    });
  });

  zoomButtons.forEach((button) => {
    button.addEventListener('click', () => zoomBy(Number(button.dataset.mapZoom)));
  });

  // клавиатура: карта получает фокус по Tab
  mapContainer.addEventListener('keydown', (event) => {
    const keys = {
      '+': () => zoomBy(1), '=': () => zoomBy(1), '-': () => zoomBy(-1), '_': () => zoomBy(-1),
      ArrowUp: () => panBy(1, 0), ArrowDown: () => panBy(-1, 0),
      ArrowLeft: () => panBy(0, -1), ArrowRight: () => panBy(0, 1),
    };
    if (keys[event.key] && event.target === mapContainer) {
      event.preventDefault();
      keys[event.key]();
    }
  });

  // колесо мыши — только после щелчка по карте, до ухода курсора
  mapContainer.addEventListener('click', () => {
    if (apiMap) apiMap.behaviors.enable('scrollZoom');
  });
  mapContainer.addEventListener('mouseleave', () => {
    if (apiMap) apiMap.behaviors.disable('scrollZoom');
  });

  updateZoomLabel();

  // ---------- загрузка API ----------
  const script = document.createElement('script');
  const keyParam = YANDEX_MAPS_API_KEY ? `&apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}` : '';
  script.src = `https://api-maps.yandex.ru/2.1/?lang=ru_RU${keyParam}`;
  script.async = true;

  const timer = setTimeout(() => {
    console.warn('Яндекс Карты API не ответил вовремя — показываем виджет-карту.');
    showWidget();
  }, MAP_LOAD_TIMEOUT);

  script.addEventListener('load', () => {
    if (typeof ymaps === 'undefined') {
      clearTimeout(timer);
      showWidget();
      return;
    }
    ymaps.ready(() => {
      clearTimeout(timer);
      if (state.mode !== 'loading') return; // уже показан виджет
      try {
        initApiMap();
        officeMark.balloon.open();
      } catch (error) {
        console.warn('Ошибка Яндекс Карт API:', error);
        state.mode = 'loading';
        showWidget();
      }
    }, () => {
      clearTimeout(timer);
      showWidget();
    });
  });

  script.addEventListener('error', () => {
    clearTimeout(timer);
    showWidget();
  });

  if (mapStatus) mapStatus.textContent = 'Загружаем карту Яндекса…';
  document.head.append(script);
}
