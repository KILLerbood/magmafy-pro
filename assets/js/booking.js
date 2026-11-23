// Booking page: a three-step wizard (your problem, your showroom, your contact). Each step must be
// answered before "Continue" unlocks the next one. The final step opens WhatsApp with one ready message
// that starts with a short summary of the answers. No day/time picker, no meeting platform and no phone
// number is asked: WhatsApp already has it. Nothing is stored by the site; the visitor presses send in WhatsApp.
import { h, t, str, icon, settings } from './core.js';
import { socialLinks } from './layout.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const LIMITS = { name: 100, business: 150, link: 300, notes: 1000 };
const clean = (v) => str(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function bookingPage() {
  const b = t('booking') || {};
  const params = new URLSearchParams(location.search);

  // Service pages link here with ?topic=…; map it to the closest problem. No "pick a service" question exists.
  const TOPIC_TO_PROBLEM = { research: 'market_unknown', website: 'not_found', content: 'content_time' };
  const pre = TOPIC_TO_PROBLEM[params.get('topic')];
  const st = { problems: pre ? [pre] : [], goal: null, branch: null, price: null };

  const problems = arr(b.problems), goals = arr(b.goals), branchOpts = arr(b.branches), priceOpts = arr(b.prices);
  const title = (list, id) => (list.find((x) => x.id === id) || {}).title || '';

  // One option card. `multi` makes it a checkbox (pick everything that applies); otherwise a radio.
  const choice = (key, o, multi) => {
    const input = h('input', { type: multi ? 'checkbox' : 'radio', name: key, value: o.id, checked: multi ? st.problems.includes(o.id) : o.id === st[key], class: 'bk-type__input' });
    input.addEventListener('change', () => {
      if (multi) st.problems = input.checked ? [...st.problems, o.id] : st.problems.filter((x) => x !== o.id);
      else st[key] = o.id;
      update();
    });
    return h('label', { class: 'bk-type bk-type--' + (multi ? 'check' : 'radio') }, input,
      o.icon ? h('span', { class: 'bk-type__icon' }, icon(o.icon, 22)) : null,
      h('span', { class: 'bk-type__body' }, h('b', {}, o.title), o.text ? [' ', h('small', {}, o.text)] : null),
      h('span', { class: 'bk-type__box', 'aria-hidden': 'true' }, icon('check', 14)));
  };

  // Side card: the first-draft plan for every problem ticked so far.
  const plan = h('section', { class: 'bk-plan', 'aria-live': 'polite' });
  function drawPlan() {
    const head = h('b', { class: 'bk-plan__head' }, icon('spark', 18), ' ', b.planHead);
    const picked = st.problems.map((id) => [id, (b.plans || {})[id]]).filter(([, p]) => p);
    if (!picked.length) { plan.replaceChildren(head, h('p', { class: 'bk-plan__empty' }, b.planEmpty)); return; }
    const extra = [];
    if (st.branch && st.branch !== 'b1' && b.planBranches) extra.push(b.planBranches);
    if ((st.price === 'p3' || st.price === 'p4') && b.planPrice) extra.push(b.planPrice);
    plan.replaceChildren(head,
      ...picked.flatMap(([, p]) => [h('p', { class: 'bk-plan__title' }, p.title), h('ol', { class: 'bk-plan__list' }, ...arr(p.steps).map((s) => h('li', {}, s)))]),
      extra.length ? h('ul', { class: 'bk-plan__list bk-plan__list--extra' }, ...extra.map((s) => h('li', {}, s))) : null,
      h('p', { class: 'bk-plan__note' }, b.planNote));
  }

  const field = (id, label, control) => h('div', { class: 'field' },
    h('label', { for: 'bk-' + id }, label), control,
    h('p', { class: 'field__error', id: 'bk-' + id + '-err', 'aria-live': 'polite' }));
  const input = (id, type, auto, req = true, extra = {}) => h('input', { id: 'bk-' + id, name: id, type, maxlength: String(LIMITS[id]), autocomplete: auto, required: req, 'aria-describedby': 'bk-' + id + '-err', ...extra });
  const notes = h('textarea', { id: 'bk-notes', name: 'notes', rows: '4', maxlength: String(LIMITS.notes), 'aria-describedby': 'bk-notes-err' });

  const status = h('p', { class: 'form__status', role: 'status' });
  const btn = (cls, label, ic, type = 'button') => h('button', { type, class: 'btn ' + cls }, ic ? icon(ic, 18) : null, h('span', { class: 'btn__label' }, label));
  const nextBtns = [btn('btn--primary', b.next, 'arrow'), btn('btn--primary', b.next, 'arrow')];
  const backBtns = [btn('btn--ghost', b.back), btn('btn--ghost', b.back)];
  const submit = btn('btn--primary', b.confirm, 'whatsapp', 'submit');

  const panels = [
    h('div', { class: 'bk-panel' },
      h('h2', { class: 'bk-q' }, b.problemHead),
      h('p', { class: 'bk-note' }, b.problemHint),
      h('div', { class: 'bk-types' }, ...problems.map((o) => choice('problems', o, true))),
      h('div', { class: 'bk-nav' }, nextBtns[0])),
    h('div', { class: 'bk-panel', hidden: true },
      h('h2', { class: 'bk-q' }, b.sizeHead),
      h('p', { class: 'bk-note' }, b.sizeHint),
      h('p', { class: 'bk-label' }, b.goalHead),
      h('div', { class: 'bk-types bk-types--compact' }, ...goals.map((o) => choice('goal', o))),
      h('p', { class: 'bk-label' }, b.branchLabel),
      h('div', { class: 'bk-types bk-types--compact' }, ...branchOpts.map((o) => choice('branch', o))),
      h('p', { class: 'bk-label' }, b.priceLabel),
      h('div', { class: 'bk-types bk-types--compact' }, ...priceOpts.map((o) => choice('price', o))),
      h('div', { class: 'bk-nav' }, backBtns[0], nextBtns[1])),
    h('div', { class: 'bk-panel', hidden: true },
      h('h2', { class: 'bk-q' }, b.detailsHead),
      h('p', { class: 'bk-note' }, b.detailsHint),
      h('div', { class: 'form__row' },
        field('name', b.fields.name, input('name', 'text', 'name')),
        field('business', b.fields.business, input('business', 'text', 'organization'))),
      field('link', b.fields.link, input('link', 'text', 'url', false, { dir: 'ltr', placeholder: 'instagram.com/… · www…' })),
      field('notes', b.fields.notes, notes),
      h('div', { class: 'bk-nav' }, backBtns[1], submit),
      status,
      h('p', { class: 'form__note' }, b.note, ' ', h('a', { href: 'privacy.html', target: '_blank' }, b.consentLink)))
  ];

  // Step pills: a finished step can be revisited; later steps stay locked until the one before is answered.
  const stepBtns = arr(b.steps).map((s, i) => {
    const el = h('button', { type: 'button', class: 'bk-steps__item' }, h('i', {}, String(i + 1)), ' ', h('span', {}, s));
    el.addEventListener('click', () => { if (canGo(i)) go(i); });
    return el;
  });
  const form = h('form', { class: 'bk-form', novalidate: true },
    h('ol', { class: 'bk-steps' }, ...stepBtns.map((el) => h('li', {}, el))),
    ...panels);

  const valid = [() => st.problems.length > 0, () => !!st.goal && !!st.branch && !!st.price, () => true];
  const canGo = (i) => valid.slice(0, i).every((f) => f());
  let cur = 0;
  function go(i) {
    cur = i;
    panels.forEach((p, k) => { p.hidden = k !== i; });
    update();
    form.querySelector('.bk-steps').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  nextBtns.forEach((el, k) => el.addEventListener('click', () => { if (valid[k]()) go(k + 1); }));
  backBtns.forEach((el, k) => el.addEventListener('click', () => go(k)));

  function update() {
    nextBtns.forEach((el, k) => { el.disabled = !valid[k](); });
    stepBtns.forEach((el, i) => {
      el.classList.toggle('is-on', i === cur);
      el.classList.toggle('is-done', i < cur && valid[i]());
      el.disabled = !canGo(i);
    });
    drawPlan();
  }

  const done = h('div', { class: 'bk-done', hidden: true, tabindex: '-1' });
  const waNumber = String(settings.whatsapp || '').replace(/[^\d]/g, '');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const errors = {};
    for (const k of ['name', 'business', 'link', 'notes']) {
      data[k] = clean(data[k]);
      if (['name', 'business'].includes(k) && !data[k]) errors[k] = b.errors.required;
      else if (data[k].length > LIMITS[k]) errors[k] = b.errors.length;
    }
    for (const k of ['name', 'business']) {
      form.querySelector('#bk-' + k + '-err').textContent = errors[k] || '';
      form.querySelector('#bk-' + k).setAttribute('aria-invalid', errors[k] ? 'true' : 'false');
    }
    if (!valid[0]()) { status.textContent = b.errors.diagnosis; go(0); return; }
    if (!valid[1]()) { status.textContent = b.errors.size; go(1); return; }
    const first = Object.keys(errors)[0];
    if (first) { status.textContent = ''; form.querySelector('#bk-' + first).focus(); return; }
    if (!waNumber) { status.textContent = b.errors.noWhatsapp; return; }
    status.textContent = '';

    const wa = b.wa || {};
    const bar = '━━━━━━━━━━';
    const probs = st.problems.map((id) => title(problems, id)).filter(Boolean);
    const goal = title(goals, st.goal), branches = title(branchOpts, st.branch), price = title(priceOpts, st.price);
    const now = probs.length > 1 ? [wa.now, ...probs.map((p) => '   - ' + p)] : [wa.now + ' ' + probs[0]];
    const text = [
      wa.title, bar,
      wa.who + ' ' + data.name,
      wa.biz + ' ' + data.business, bar,
      ...now,
      wa.goal + ' ' + goal, bar,
      wa.size + ' ' + wa.branches + ': ' + branches + '، ' + wa.price + ': ' + price,
      data.notes ? wa.notes + ' ' + data.notes : null,
      '',
      wa.bye,
      data.link ? '' : null,
      data.link ? wa.link : null,
      data.link || null
    ].filter((x) => x !== null).join('\n').slice(0, 1800);
    const url = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(text);

    const again = h('button', { type: 'button', class: 'btn btn--ghost' }, h('span', { class: 'btn__label' }, b.again));
    again.addEventListener('click', () => { done.hidden = true; form.hidden = false; go(0); });
    done.replaceChildren(
      h('span', { class: 'bk-done__ok' }, icon('check', 34)),
      h('h2', {}, b.doneTitle),
      h('p', {}, b.doneText),
      h('div', { class: 'bk-done__actions' },
        h('a', { class: 'btn btn--primary', href: url, target: '_blank', rel: 'noopener noreferrer' }, icon('whatsapp', 18), h('span', { class: 'btn__label' }, b.openCta)),
        again));
    form.hidden = true;
    done.hidden = false;
    window.open(url, '_blank', 'noopener');
    done.focus({ preventScroll: true });
    done.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  update();

  const info = [
    ['emailLabel', 'mail', settings.email, settings.email ? 'mailto:' + settings.email : ''],
    ['whatsappLabel', 'whatsapp', settings.whatsapp, waNumber ? 'https://wa.me/' + waNumber : ''],
    ['addressLabel', 'pin', settings.address || t('contact.addressValue'), '']
  ];

  return [
    h('section', { class: 'hero hero--compact', 'aria-labelledby': 'bk-title' },
      h('div', { class: 'container hero__inner' },
        h('p', { class: 'eyebrow hero__eyebrow' }, b.eyebrow),
        h('h1', { class: 'hero__title', id: 'bk-title' }, h('span', { class: 'hero__line' }, ...str(b.title).split(/\s+/).filter(Boolean).flatMap((w, i) => [i ? ' ' : null, h('span', { class: 'word' }, h('span', { class: 'word__inner' }, w))]))),
        h('p', { class: 'hero__text' }, b.text),
        h('ul', { class: 'hero__chips' }, ...arr(b.chips).map((c) => h('li', {}, h('b', {}, c.value), ' ', h('span', {}, c.label)))))),
    h('section', { class: 'section booking', 'data-shape': 'contact' },
      h('div', { class: 'container booking__grid' },
        h('div', { class: 'booking__main', 'data-reveal': '' }, form, done),
        h('aside', { class: 'booking__aside' },
          plan,
          h('div', { class: 'bk-card', 'data-reveal': '' },
            h('h2', { class: 'bk-card__title' }, b.nextHead),
            h('ol', { class: 'bk-next' }, ...arr(b.nextSteps).map((s, i) => h('li', {}, h('i', {}, String(i + 1)), h('div', {}, h('b', {}, s.title), ' ', h('small', {}, s.text)))))),
          h('ul', { class: 'contact__info', 'data-reveal': '' },
            ...info.map(([label, ic, value, href]) => h('li', { class: 'contact__item' },
              h('span', { class: 'contact__icon' }, icon(ic, 20)),
              h('span', {},
                h('span', { class: 'contact__label' }, t('contact.' + label)), ' ',
                value ? (href ? h('a', { href, dir: ic === 'whatsapp' ? 'ltr' : null, target: href.startsWith('http') ? '_blank' : null, rel: href.startsWith('http') ? 'noopener noreferrer' : null }, value) : h('span', {}, value))
                  : h('span', { class: 'muted' }, t('contact.pending'))))),
            h('li', { class: 'contact__item contact__item--social' },
              h('span', { class: 'contact__label' }, t('contact.social')),
              socialLinks('contact__social'))))))
  ];
}
