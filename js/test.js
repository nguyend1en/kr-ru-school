// test.js — пошаговый тест на уровень (test.html).
// Экраны: вступление → 20 вопросов по одному → результат с разбором ошибок.
// Вся разметка создаётся через createElement + textContent (без innerHTML).

'use strict';

const testApp = document.getElementById('test-app');

if (testApp && typeof testQuestions !== 'undefined') {
  const STORAGE_KEY = 'slovo-level-test';
  const PASS_SHARE = 0.6;        // уровень засчитан, если верно ≥ 60 % вопросов этого уровня
  const total = testQuestions.length;

  let order = [];                // вопросы в порядке прохождения, с перемешанными вариантами
  let answers = [];              // выбранный индекс варианта для каждого вопроса (или null)
  let current = 0;
  let startedAt = 0;

  // ---------- вспомогательные функции ----------
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const shuffle = (items) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const plural = (n, one, few, many) => {
    const last = n % 10;
    const lastTwo = n % 100;
    if (last === 1 && lastTwo !== 11) return one;
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
    return many;
  };

  const readSaved = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  };

  const save = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // приватный режим или запрет хранилища — просто не сохраняем
    }
  };

  // Переход между экранами: новое содержимое и фокус на начало листа,
  // чтобы пользователь клавиатуры и экранного диктора оказался в нужном месте.
  const show = (...nodes) => {
    testApp.replaceChildren(...nodes);
    testApp.focus({ preventScroll: true });
    const top = testApp.getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) {
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // ---------- экран 1: вступление ----------
  const renderIntro = () => {
    const title = el('h2', 'h3', 'Как проходит тест');
    const list = el('ul', 'test-intro__list');
    [
      `${total} вопросов: грамматика, лексика, чтение короткого текста и диалоги.`,
      'В каждом разделе вопросы идут от простых к сложным — от A1 до B2.',
      'Около 10 минут. Регистрация не нужна.',
      'Можно вернуться к предыдущему вопросу и изменить ответ.',
      'В конце — примерный уровень, результат по разделам и разбор каждой ошибки.',
    ].forEach((text) => list.append(el('li', '', text)));

    const nodes = [title, list];

    const saved = readSaved();
    if (saved && saved.level) {
      nodes.push(el('p', 'form-hint', `Ваш прошлый результат: ${saved.level}, ${saved.score} из ${saved.total} (${saved.date}).`));
    }

    const start = el('button', 'btn btn-primary btn-lg', 'Начать тест');
    start.type = 'button';
    start.addEventListener('click', startTest);
    const actions = el('div', 'test-nav');
    actions.append(start);
    nodes.push(actions);
    show(...nodes);
  };

  // ---------- экран 2: вопрос ----------
  function startTest() {
    // перемешиваем варианты, но сохраняем, какой из них верный
    order = testQuestions.map((q) => {
      const options = shuffle(q.options.map((text, index) => ({ text, correct: index === q.answer })));
      return { ...q, options };
    });
    answers = new Array(total).fill(null);
    current = 0;
    startedAt = Date.now();
    renderQuestion();
  }

  const renderQuestion = () => {
    const q = order[current];
    const form = el('form');
    form.noValidate = true;

    // строка «раздел · номер»
    const meta = el('div', 'test-meta');
    meta.append(el('span', 'test-meta__section', testSections[q.section]));
    meta.append(el('span', '', `Вопрос ${current + 1} из ${total}`));

    // клетки прогресса: только визуально, текст выше дублирует их для дикторов
    const cells = el('ol', 'test-cells');
    cells.setAttribute('aria-hidden', 'true');
    order.forEach((_, i) => {
      const cell = el('li');
      if (answers[i] !== null) cell.classList.add('is-answered');
      if (i === current) cell.classList.add('is-current');
      cells.append(cell);
    });

    const fieldset = el('fieldset', 'test-question');
    const legend = el('legend', 'test-question__text');
    q.text.split('\n').forEach((line, i) => {
      if (i > 0) legend.append(el('br'));
      legend.append(line);
    });
    fieldset.append(legend);

    if (q.passage) {
      const passage = el('div', 'test-passage');
      passage.append(el('p', 'fw-semibold mb-2', 'Прочитайте текст:'));
      readingPassage.forEach((paragraph) => passage.append(el('p', '', paragraph)));
      fieldset.append(passage);
    }
    if (q.hint) {
      fieldset.append(el('p', 'test-question__hint', q.hint));
    }

    const options = el('div', 'test-options');
    q.options.forEach((option, i) => {
      const id = `q${current}-o${i}`;
      const label = el('label', 'test-option');
      label.htmlFor = id;
      const input = el('input');
      input.type = 'radio';
      input.name = 'answer';
      input.id = id;
      input.value = String(i);
      input.checked = answers[current] === i;
      label.append(input, el('span', '', option.text));
      options.append(label);
    });
    fieldset.append(options);

    const error = el('p', 'test-error');
    error.id = 'test-error';
    error.setAttribute('role', 'alert');

    const nav = el('div', 'test-nav');
    const back = el('button', 'btn btn-outline-secondary', 'Назад');
    back.type = 'button';
    back.disabled = current === 0;
    back.addEventListener('click', () => {
      keepAnswer(form);
      current -= 1;
      renderQuestion();
    });
    const isLast = current === total - 1;
    const next = el('button', 'btn btn-primary', isLast ? 'Завершить тест' : 'Следующий вопрос');
    next.type = 'submit';
    nav.append(back, next);

    form.append(meta, cells, fieldset, error, nav);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!keepAnswer(form)) {
        error.textContent = 'Выберите один из вариантов ответа.';
        form.querySelector('input[name="answer"]').focus();
        return;
      }
      if (isLast) {
        renderResult();
      } else {
        current += 1;
        renderQuestion();
      }
    });

    show(form);
  };

  // сохраняет выбранный вариант текущего вопроса; возвращает true, если ответ есть
  const keepAnswer = (form) => {
    const checked = form.querySelector('input[name="answer"]:checked');
    if (checked) {
      answers[current] = Number(checked.value);
    }
    return Boolean(checked);
  };

  // ---------- экран 3: результат ----------
  const isCorrect = (i) => answers[i] !== null && order[i].options[answers[i]].correct;

  const tally = (key) => {
    const groups = {};
    order.forEach((q, i) => {
      const name = q[key];
      groups[name] = groups[name] || { right: 0, all: 0 };
      groups[name].all += 1;
      if (isCorrect(i)) groups[name].right += 1;
    });
    return groups;
  };

  // уровень засчитан, если пройдены он и все уровни ниже
  const reachedLevel = (byLevel) => {
    let reached = 'none';
    for (const level of testLevels) {
      const g = byLevel[level];
      if (g && g.right / g.all >= PASS_SHARE) {
        reached = level;
      } else {
        break;
      }
    }
    return reached;
  };

  const resultTable = (caption, groups, labels) => {
    const table = el('table', 'test-table');
    table.append(el('caption', 'visually-hidden', caption));
    const head = el('tr');
    ['Раздел', 'Верно', ''].forEach((text, i) => {
      const th = el('th', '', i === 0 ? caption : text);
      th.scope = 'col';
      head.append(th);
    });
    const thead = el('thead');
    thead.append(head);
    const tbody = el('tbody');
    Object.keys(labels).forEach((key) => {
      const g = groups[key];
      if (!g) return;
      const row = el('tr');
      row.append(el('td', '', labels[key]));
      row.append(el('td', '', `${g.right} из ${g.all}`));
      const barCell = el('td');
      const bar = el('div', 'test-bar');
      bar.setAttribute('aria-hidden', 'true');
      const fill = el('span');
      fill.style.width = `${Math.round((g.right / g.all) * 100)}%`;
      bar.append(fill);
      barCell.append(bar);
      row.append(barCell);
      tbody.append(row);
    });
    table.append(thead, tbody);
    return table;
  };

  function renderResult() {
    const score = order.filter((_, i) => isCorrect(i)).length;
    const byLevel = tally('level');
    const bySection = tally('section');
    const reached = reachedLevel(byLevel);
    const rec = testRecommendations[reached];
    const course = typeof findCourse === 'function' ? findCourse(rec.courseId) : null;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));

    save({ level: rec.level, score, total, date: new Date().toLocaleDateString('ru-RU') });

    const title = el('h2', 'h3', 'Результат теста');

    const grade = el('div', 'test-grade');
    const mark = el('div', 'test-grade__level', rec.level);
    mark.setAttribute('aria-hidden', 'true');
    const summary = el('div');
    summary.append(el('p', 'test-grade__score', `Примерный уровень: ${rec.level}. Верно ${score} из ${total}.`));
    summary.append(el('p', 'mb-0 text-muted', `Время: около ${minutes} ${plural(minutes, 'минуты', 'минут', 'минут')}. Уровень засчитывается, если верно не меньше 60 % его вопросов.`));
    grade.append(mark, summary);

    const advice = el('div', 'alert alert-info');
    advice.append(el('p', 'mb-2', rec.text));
    if (course) {
      const enroll = el('a', 'btn btn-primary btn-sm me-2', 'Записаться на курс');
      enroll.href = getProductStatus(course).canEnroll ? `order.html?course=${course.id}` : 'contacts.html';
      const more = el('a', 'btn btn-outline-primary btn-sm', 'О курсе');
      more.href = `product.html?id=${course.id}`;
      advice.append(enroll, more);
    }

    const tables = el('div', 'row g-4');
    const colA = el('div', 'col-12 col-md-6');
    colA.append(resultTable('По разделам', bySection, testSections));
    const colB = el('div', 'col-12 col-md-6');
    colB.append(resultTable('По уровням', byLevel, { A1: 'A1', A2: 'A2', B1: 'B1', B2: 'B2' }));
    tables.append(colA, colB);

    // разбор ошибок
    const mistakes = order.map((q, i) => ({ q, i })).filter(({ i }) => !isCorrect(i));
    const reviewTitle = el('h3', 'h4 mt-2', mistakes.length ? `Разбор ошибок (${mistakes.length})` : 'Ошибок нет');
    const review = el('ul', 'review');
    mistakes.forEach(({ q, i }) => {
      const item = el('li');
      item.append(el('p', 'review__q', `${i + 1}. ${q.text.replace(/\n/g, ' ')}`));
      const answerLine = el('p', 'review__answer');
      answerLine.append('Ваш ответ: ', el('span', 'review__wrong', q.options[answers[i]].text), '. Правильно: ',
        el('span', 'review__right', q.options.find((o) => o.correct).text));
      item.append(answerLine, el('p', 'review__why', q.explain));
      review.append(item);
    });
    if (!mistakes.length) {
      review.append(el('li', '', 'Все ответы верные. Отличный результат!'));
    }

    const again = el('button', 'btn btn-outline-primary', 'Пройти ещё раз');
    again.type = 'button';
    again.addEventListener('click', startTest);
    const nav = el('div', 'test-nav');
    const catalog = el('a', 'btn btn-outline-secondary', 'Все курсы');
    catalog.href = 'catalog.html';
    nav.append(again, catalog);

    show(title, grade, advice, tables, reviewTitle, review, nav);
    console.log('Результат теста:', { score, total, level: rec.level, byLevel, bySection });
  }

  renderIntro();
}
