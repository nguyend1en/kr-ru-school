// main.js — сценарии сайта «Слово».
// Подключается через defer после data.js, поэтому DOM уже построен,
// а константы school и courses из data.js доступны.
// Каждый блок сначала проверяет, есть ли нужный элемент на странице,
// поэтому один файл подключается на всех страницах.

'use strict';

/* =====================================================================
   КР4. Часть 1. Базовые данные товара: переменные и свойства объекта
   ===================================================================== */

// Данные одного товара (курса) в отдельных переменных разных типов
const productTitle = 'Русский с нуля (A1)';   // строка
const productPrice = 6500;                    // число, руб. в месяц
const productDiscount = 0;                    // число, процент скидки
const productSeatsLeft = 3;                   // число
const productIsOpen = true;                   // логическое значение

// Те же данные, собранные в объект товара
const product = {
  title: productTitle,
  price: productPrice,
  discount: productDiscount,
  seatsLeft: productSeatsLeft,
  isOpen: productIsOpen,
  description: 'Курс для тех, кто только начинает учить русский язык: от алфавита до простых разговоров в магазине, транспорте и университете.',
};

/* =====================================================================
   КР4. Часть 2. Функции
   ===================================================================== */

/**
 * Форматирует цену: 7110 -> "7 110 ₽".
 * toLocaleString('ru-RU') ставит пробел между разрядами.
 */
function formatPrice(price) {
  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return 'цена уточняется';
  }
  return `${Math.round(price).toLocaleString('ru-RU')} ₽`;
}

/**
 * Цена со скидкой. Скидка задаётся в процентах от 0 до 100.
 * Арифметика: price - price * discount / 100, результат округляется до рубля.
 */
function getDiscountPrice(price, discount) {
  const safeDiscount = discount > 0 && discount <= 100 ? discount : 0; // логические операторы и сравнение
  return Math.round(price - (price * safeDiscount) / 100);
}

/**
 * Статус товара по количеству мест и признаку набора.
 * Возвращает объект: текст для покупателя и класс Bootstrap для бейджа.
 */
function getProductStatus(item) {
  if (!item.isOpen || item.seatsLeft <= 0) {
    return { text: 'Мест нет', className: 'text-bg-secondary', canEnroll: false };
  }
  if (item.seatsLeft <= 3) {
    return { text: 'Последние места', className: 'text-bg-warning', canEnroll: true };
  }
  return { text: 'Набор открыт', className: 'text-bg-success', canEnroll: true };
}

/**
 * Краткое описание: не длиннее maxLength символов, обрезка по границе слова.
 */
function getShortDescription(text, maxLength = 70) {
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** Собирает карточку товара для вывода в консоль. */
function describeProduct(item) {
  const finalPrice = getDiscountPrice(item.price, item.discount);
  return {
    'Курс': item.title,
    'Цена': formatPrice(item.price),
    'Скидка': `${item.discount}%`,
    'Итоговая цена': formatPrice(finalPrice),
    'Экономия': formatPrice(item.price - finalPrice),
    'Статус': getProductStatus(item).text,
    'Описание': getShortDescription(item.description),
  };
}

/* =====================================================================
   КР4. Часть 3. Результат работы функций — в консоль браузера
   ===================================================================== */

console.log('main.js подключён, страница:', document.title);
console.log('Товар:', product);
console.log('formatPrice(7110):', formatPrice(7110));
console.log('getDiscountPrice(7900, 10):', getDiscountPrice(7900, 10));
console.log('getProductStatus(product):', getProductStatus(product).text);
console.log('getShortDescription(...):', getShortDescription(product.description, 40));
console.log('Цена выше 6000 и курс открыт:', product.price > 6000 && product.isOpen);

if (typeof courses !== 'undefined') {
  console.table(courses.map(describeProduct));
}

/* =====================================================================
   Вспомогательные функции для страниц
   ===================================================================== */

// Безопасный вывод текста: textContent вставляет строку как текст,
// поэтому теги из данных или из ввода пользователя не выполняются.
function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function findCourse(id) {
  return courses.find((course) => course.id === id);
}

function getCourseFromUrl() {
  const id = new URLSearchParams(window.location.search).get('id');
  return findCourse(id) || courses[0];
}

function seatsLabel(seats) {
  if (seats <= 0) return 'Мест нет';
  const last = seats % 10;
  const lastTwo = seats % 100;
  let word = 'мест';
  if (last === 1 && lastTwo !== 11) word = 'место';
  else if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) word = 'места';
  return `${seats} ${word}`;
}

function seatsBadgeClass(seats) {
  if (seats <= 0) return 'text-bg-secondary';
  if (seats <= 3) return 'text-bg-warning';
  return 'text-bg-success';
}

/* =====================================================================
   1. Цены и статусы в карточках курсов (главная, каталог)
   ===================================================================== */

document.querySelectorAll('[data-course-id]').forEach((card) => {
  const course = findCourse(card.dataset.courseId);
  if (!course) return;

  const finalPrice = getDiscountPrice(course.price, course.discount);
  const status = getProductStatus(course);
  setText(card.querySelector('[data-role="price"]'), formatPrice(finalPrice));

  const oldPrice = card.querySelector('[data-role="old-price"]');
  if (oldPrice) {
    oldPrice.classList.toggle('d-none', course.discount === 0);
    setText(oldPrice, course.discount > 0 ? formatPrice(course.price) : '');
  }

  const badge = card.querySelector('[data-role="status"]');
  if (badge) {
    badge.className = `badge ${status.className}`;
    setText(badge, course.discount > 0 && status.canEnroll ? `Скидка ${course.discount}%` : status.text);
  }
});

/* =====================================================================
   2. Сообщение на главной странице (textContent)
   ===================================================================== */

const jsMessage = document.getElementById('js-message');

if (jsMessage) {
  const openCourses = courses.filter((course) => getProductStatus(course).canEnroll);
  const cheapest = openCourses.reduce((min, course) => (course.price < min.price ? course : min));
  const discounted = courses.filter((course) => course.discount > 0);

  setText(
    jsMessage,
    `Сейчас идёт набор на ${openCourses.length} из ${courses.length} курсов. ` +
    `Самый доступный — «${cheapest.title}» за ${formatPrice(cheapest.price)} в месяц. ` +
    `Курсов со скидкой: ${discounted.length}.`,
  );
}

/* =====================================================================
   3. Фильтр курсов по уровню (catalog.html)
   ===================================================================== */

const courseList = document.getElementById('course-list');

if (courseList) {
  const filterInputs = document.querySelectorAll('input[name="level-filter"]');
  const courseCount = document.getElementById('course-count');

  filterInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const group = input.value;
      let shown = 0;

      courseList.querySelectorAll('[data-group]').forEach((course) => {
        const visible = group === 'all' || course.dataset.group === group;
        // d-none — утилита Bootstrap, скрывает элемент (display: none)
        course.classList.toggle('d-none', !visible);
        if (visible) shown += 1;
      });

      setText(courseCount, `Показано курсов: ${shown}`);
    });
  });
}

/* =====================================================================
   4. Страница курса по параметру ?id= (product.html)
   ===================================================================== */

const coursePage = document.getElementById('course-page');

if (coursePage) {
  const course = getCourseFromUrl();
  const status = getProductStatus(course);
  const finalPrice = getDiscountPrice(course.price, course.discount);
  const fullTitle = `${course.title} (${course.level})`;

  document.title = `${fullTitle} — Онлайн-школа «Слово»`;
  setText(document.getElementById('course-breadcrumb'), fullTitle);
  setText(document.getElementById('course-title'), fullTitle);
  setText(document.getElementById('course-description'), course.description);
  setText(document.getElementById('course-level-mark'), course.level);
  setText(document.getElementById('course-level-name'), course.levelName);

  const cover = document.getElementById('course-cover');
  if (cover) {
    cover.querySelector('source').srcset = `images/courses/${course.id}-480.webp 480w, images/courses/${course.id}-960.webp 960w`;
    const img = cover.querySelector('img');
    img.src = `images/courses/${course.id}-960.jpg`;
    img.srcset = `images/courses/${course.id}-480.jpg 480w, images/courses/${course.id}-960.jpg 960w`;
  }

  const badge = document.getElementById('course-status');
  badge.className = `badge ${status.className} mb-3`;
  setText(badge, status.text);

  setText(document.getElementById('course-price'), `${formatPrice(finalPrice)} в месяц`);
  setText(
    document.getElementById('course-price-note'),
    course.discount > 0
      ? `Скидка ${course.discount}%: без скидки ${formatPrice(course.price)}, экономия ${formatPrice(course.price - finalPrice)} в месяц.`
      : 'Оплата помесячно, первый урок можно перенести.',
  );

  const enroll = document.getElementById('course-enroll');
  if (status.canEnroll) {
    enroll.href = `order.html?course=${course.id}`;
  } else {
    enroll.removeAttribute('href');
    enroll.setAttribute('aria-disabled', 'true');
    enroll.classList.add('disabled');
    setText(enroll, 'Мест нет');
  }

  setText(
    document.getElementById('course-alert'),
    status.canEnroll
      ? `Ближайшая группа стартует ${course.nextStart}. Свободно: ${seatsLabel(course.seatsLeft)}.`
      : `Набор закрыт. Следующий поток — ${course.nextStart}. Оставьте заявку в разделе «Контакты», и мы сообщим о старте.`,
  );

  // Таблица «Информация о курсе»
  const info = {
    level: `${course.level} (${course.levelName})`,
    duration: course.weeks > 0 ? `${course.weeks} недель, ${course.lessons} занятий` : `без срока, ${course.lessons} встречи в месяц`,
    schedule: course.schedule,
    price: course.discount > 0 ? `${formatPrice(finalPrice)} в месяц со скидкой` : `${formatPrice(course.price)} в месяц`,
    result: course.result,
  };
  Object.keys(info).forEach((key) => {
    setText(document.querySelector(`[data-info="${key}"]`), info[key]);
  });

  // Программа: строим элементы через createElement + textContent
  const programList = document.getElementById('course-program');
  if (programList) {
    programList.replaceChildren(
      ...course.program.map(([period, topic]) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex gap-3';
        const periodEl = document.createElement('span');
        periodEl.className = 'fw-bold text-primary text-nowrap';
        periodEl.textContent = period;
        const topicEl = document.createElement('span');
        topicEl.textContent = topic;
        li.append(periodEl, topicEl);
        return li;
      }),
    );
  }

  // Расписание групп
  const scheduleBody = document.getElementById('course-schedule');
  if (scheduleBody) {
    scheduleBody.replaceChildren(
      ...course.groups.map((group) => {
        const row = document.createElement('tr');
        const code = document.createElement('th');
        code.scope = 'row';
        code.textContent = group.code;
        row.append(code);
        [group.start, group.time, group.teacher].forEach((value) => {
          const cell = document.createElement('td');
          cell.textContent = value;
          row.append(cell);
        });
        const seatsCell = document.createElement('td');
        const seats = document.createElement('span');
        seats.className = `badge ${seatsBadgeClass(group.seats)}`;
        seats.textContent = seatsLabel(group.seats);
        seatsCell.append(seats);
        row.append(seatsCell);
        return row;
      }),
    );
  }
}

/* =====================================================================
   5. Страница записи: курс из адреса и расчёт стоимости (order.html)
   ===================================================================== */

const orderCourse = document.getElementById('order-course');

if (orderCourse) {
  const summary = document.getElementById('order-summary');

  const updateSummary = () => {
    const course = findCourse(orderCourse.value);
    if (!course) {
      setText(summary, 'Выберите курс, чтобы увидеть стоимость.');
      return;
    }
    const finalPrice = getDiscountPrice(course.price, course.discount);
    const discountText = course.discount > 0 ? ` (скидка ${course.discount}%: экономия ${formatPrice(course.price - finalPrice)})` : '';
    setText(summary, `«${course.title}»: ${formatPrice(finalPrice)} в месяц${discountText}. Старт — ${course.nextStart}.`);
  };

  const fromUrl = new URLSearchParams(window.location.search).get('course');
  const option = fromUrl ? orderCourse.querySelector(`option[value="${CSS.escape(fromUrl)}"]`) : null;
  if (option && !option.disabled) {
    orderCourse.value = fromUrl;
  }

  orderCourse.addEventListener('change', updateSummary);
  document.getElementById('order-form').addEventListener('reset', () => {
    // reset срабатывает до очистки полей, поэтому пересчитываем на следующем шаге
    setTimeout(updateSummary, 0);
  });
  updateSummary();
}

/* 6. Тест на уровень — отдельные файлы js/test-data.js и js/test.js */

/* =====================================================================
   7. Проверка форм (order.html, модальное окно в catalog.html, contacts.html)
   ===================================================================== */

document.querySelectorAll('#order-form, #trialForm, #contact-form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    // Сервера пока нет, поэтому страницу не перезагружаем
    event.preventDefault();

    // checkValidity() проверяет required, type="email", minlength
    if (!form.checkValidity()) {
      // was-validated включает красные рамки и тексты .invalid-feedback
      form.classList.add('was-validated');
      // Переводим фокус на первое ошибочное поле — так ошибку услышит и экранный диктор
      form.querySelector(':invalid').focus();
      return;
    }

    // Имя берём из формы и выводим через textContent — без риска вставки HTML
    const nameField = form.querySelector('[name="name"]');
    const name = nameField ? nameField.value.trim() : '';

    form.reset();
    form.classList.remove('was-validated');

    // Если форма внутри модального окна — закрываем окно
    const modal = form.closest('.modal');
    if (modal) {
      bootstrap.Modal.getInstance(modal).hide();
    }

    const toast = document.getElementById('success-toast');
    const toastText = toast.querySelector('.toast-body');
    const baseText = toast.dataset.text || toastText.textContent;
    toast.dataset.text = baseText;
    setText(toastText, name ? `${name}, спасибо! ${baseText}` : baseText);
    bootstrap.Toast.getOrCreateInstance(toast).show();
  });
});
