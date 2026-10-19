// Gera scene.rml (a cena do quiz em Rive) a partir deste arquivo + gelpi.svg.
//   node rive/quiz/gen-scene.mjs && rive rive/quiz --verify
//
// Por que um gerador: a cena tem centenas de objetos repetitivos (alternativas,
// botões de confiança, o mascote, uma state machine por estado do contrato).
// Os nomes dos view models / propriedades / enums seguem o contrato em
// src/components/quiz/rive/quiz-view-model.ts — mudou lá, muda aqui.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Sonda iOS (temporária): QUIZ_VARIANT=2 tira o backdrop; =3 também encolhe a
// camada da folha pra só cobrir a folha. Vazio = cena normal.
const VARIANT = process.env.QUIZ_VARIANT ?? '';
const HAS_BACKDROP = !['2', '3'].includes(VARIANT);
const SHEET_LAYER_HUG = VARIANT === '3';

// ---------------------------------------------------------------- XML básico
let next = 10;
const id = () => `0:${next++}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${k}="${esc(v)}"`)
    .join(' ');
const el = (tag, a = {}, ...kids) => {
  const body = kids.flat(Infinity).filter(Boolean).map((k) => (typeof k === 'string' ? k : k.xml)).join('\n');
  const open = `<${tag}${Object.keys(a).length ? ' ' + attrs(a) : ''}`;
  return body ? `${open}>\n${body}\n</${tag}>` : `${open}/>`;
};
const n2 = (v) => +v.toFixed(3);

/** '#1E6FD9' (+ alpha 0–1) → 'FF1E6FD9' */
const argb = (hex, a = 1) => {
  const h = hex.replace('#', '').toUpperCase();
  return Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase() + (h.length === 3 ? [...h].map((c) => c + c).join('') : h);
};

// ---------------------------------------------------------------- paleta (quiz atual)
const C = {
  ink: '#0B2845',
  muted: '#6F8AA8',
  border: '#E1EAF3',
  blue: '#1E6FD9',
  blueSoft: '#F0F7FF',
  badge: '#F0F5FB',
  bgTop: '#F4FAFF',
  bgBottom: '#E1EFFC',
  track: '#D6E4F3',
  green: '#22C55E',
  greenSoft: '#ECFDF5',
  greenInk: '#15803D',
  red: '#EF4444',
  redSoft: '#FEF2F2',
  redInk: '#B91C1C',
  orange: '#FF8B3D',
  amber: '#FFB020',
  warmInk: '#5A3520',
  warmMuted: '#B8825C',
  white: '#FFFFFF',
};

// ---------------------------------------------------------------- enums e view models
const enums = [];
function enumDef(name, keys) {
  const e = { id: id(), name, v: {} };
  for (const k of keys) e.v[k] = id();
  enums.push(e);
  return e;
}
const E = {
  phase: enumDef('QuizPhase', ['question', 'feedback', 'result']),
  optionState: enumDef('OptionState', ['idle', 'selected', 'correct', 'wrong']),
  feedbackKind: enumDef('FeedbackKind', ['none', 'correct', 'wrong']),
  confidence: enumDef('ConfidenceKey', ['none', 'guessed', 'thoughtKnew', 'knew', 'mastered']),
};

const vms = [];
function viewModel(name, props) {
  const vm = { id: id(), name, p: {}, types: {}, enumOf: {}, instances: [] };
  for (const [pname, type, en] of props) {
    vm.p[pname] = id();
    vm.types[pname] = type;
    if (en) vm.enumOf[pname] = en;
  }
  vms.push(vm);
  return vm;
}
/** valores: string|number|boolean; enum = chave; lista = array de ids de instância */
function instance(vm, name, values) {
  const iid = id();
  const kids = Object.keys(vm.p).map((pname) => {
    const pid = vm.p[pname];
    const t = vm.types[pname];
    const v = values[pname];
    if (t === 'string') return el('ViewModelInstanceString', { propertyValue: v ?? '', viewModelPropertyId: pid });
    if (t === 'number') return el('ViewModelInstanceNumber', { propertyValue: v ?? 0, viewModelPropertyId: pid });
    if (t === 'boolean') return el('ViewModelInstanceBoolean', { propertyValue: v ? 'true' : 'false', viewModelPropertyId: pid });
    if (t === 'trigger') return el('ViewModelInstanceTrigger', { viewModelPropertyId: pid });
    if (t === 'enum') {
      const en = vm.enumOf[pname];
      return el('ViewModelInstanceEnum', { propertyValue: en.v[v ?? Object.keys(en.v)[0]], viewModelPropertyId: pid });
    }
    if (t.startsWith('list:')) {
      const itemVm = t.slice(5);
      return el(
        'ViewModelInstanceList',
        { viewModelPropertyId: pid },
        (v ?? []).map((itemId) => el('ViewModelInstanceListItem', { viewModelId: VM[itemVm].id, viewModelInstanceId: itemId })),
      );
    }
    throw new Error(`tipo ${t}`);
  });
  vm.instances.push(el('ViewModelInstance', { exports: 'true', name, id: iid }, kids));
  return iid;
}
const vmXml = (vm, defaultId) =>
  el(
    'ViewModel',
    { defaultInstanceId: defaultId, name: vm.name, id: vm.id },
    Object.keys(vm.p).map((pname) => {
      const t = vm.types[pname];
      const a = { name: pname, id: vm.p[pname] };
      if (t === 'string') return el('ViewModelPropertyString', a);
      if (t === 'number') return el('ViewModelPropertyNumber', a);
      if (t === 'boolean') return el('ViewModelPropertyBoolean', a);
      if (t === 'trigger') return el('ViewModelPropertyTrigger', a);
      if (t === 'enum') return el('ViewModelPropertyEnumCustom', { enumId: vm.enumOf[pname].id, ...a });
      if (t.startsWith('list:')) return el('ViewModelPropertyList', a);
    }),
    vm.instances,
  );

const VM = {};
VM.Option = viewModel('Option', [
  ['text', 'string'],
  ['state', 'enum', E.optionState],
  ['tap', 'trigger'],
]);
VM.ReviewItem = viewModel('ReviewItem', [
  ['title', 'string'],
  ['question', 'string'],
  ['isCorrect', 'boolean'],
  ['yourAnswer', 'string'],
  ['correctAnswer', 'string'],
  ['explanation', 'string'],
]);
VM.Quiz = viewModel('Quiz', [
  ['phase', 'enum', E.phase],
  ['progressLabel', 'string'],
  ['questionNumber', 'number'],
  ['questionCount', 'number'],
  ['questionText', 'string'],
  ['options', 'list:Option'],
  ['locked', 'boolean'],
  ['combo', 'number'],
  ['xpProgress', 'number'],
  ['feedbackKind', 'enum', E.feedbackKind],
  ['feedbackTitle', 'string'],
  ['feedbackSubtitle', 'string'],
  ['xpGained', 'number'],
  ['accuracy', 'number'],
  ['confidence', 'enum', E.confidence],
  ['canContinue', 'boolean'],
  ['submitting', 'boolean'],
  ['score', 'number'],
  ['passed', 'boolean'],
  ['resultSummary', 'string'],
  ['review', 'list:ReviewItem'],
  ['generating', 'boolean'],
  ['pickGuessed', 'trigger'],
  ['pickThoughtKnew', 'trigger'],
  ['pickKnew', 'trigger'],
  ['pickMastered', 'trigger'],
  ['continueTap', 'trigger'],
  ['retryTap', 'trigger'],
  ['closeTap', 'trigger'],
]);
const P = (vm, prop) => `${vm.id}-${vm.p[prop]}`;

// ---------------------------------------------------------------- conversores
const CV = {
  str: id(), // número → texto inteiro
  rest: id(), // 0–100 → 100–0 (o resto da barra)
  ring: id(), // 0–100 → 0–1 (trim do anel)
};
const converters = [
  el('DataConverterToString', { decimals: 0, round: 'true', name: 'Inteiro', id: CV.str }),
  el('DataConverterRangeMapper', { minInput: 0, maxInput: 100, minOutput: 100, maxOutput: 0, clampLower: 'true', clampUpper: 'true', name: 'Resto', id: CV.rest }),
  el('DataConverterRangeMapper', { minInput: 0, maxInput: 100, minOutput: 0, maxOutput: 1, clampLower: 'true', clampUpper: 'true', name: 'Anel', id: CV.ring }),
];
const bind = (pathIds, key, conv) => el('DataBindContext', { sourcePathIds: pathIds, propertyKey: key, converterId: conv });

// ---------------------------------------------------------------- layout / pintura / texto
const FONT = id();
const WEIGHT_TAG = 2003265652; // 'wght'

function solid(hex, a = 1, cid) {
  return el('SolidColor', { colorValue: argb(hex, a), name: 'C', id: cid });
}
function paintFill(hex, { a = 1, cid } = {}) {
  return el('Fill', { name: 'Fill' }, solid(hex, a, cid));
}
function paintStroke(hex, thickness, { cid, cap, kids } = {}) {
  return el('Stroke', { thickness, cap, join: cap ? 'round' : undefined, name: 'Stroke' }, solid(hex, 1, cid), kids);
}

const UNIT_KEYS = /^(padding|gap|position|border)(Left|Right|Top|Bottom|Horizontal|Vertical)$/;
function styleAttrs(s) {
  const o = {};
  const set = (k, v) => {
    o[k] = v;
    if (UNIT_KEYS.test(k)) o[`${k}UnitsValue`] = 'points';
  };
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined) continue;
    if (k === 'p') ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach((x) => set(x, v));
    else if (k === 'px') ['paddingLeft', 'paddingRight'].forEach((x) => set(x, v));
    else if (k === 'py') ['paddingTop', 'paddingBottom'].forEach((x) => set(x, v));
    else if (k === 'gap') ['gapHorizontal', 'gapVertical'].forEach((x) => set(x, v));
    else if (k === 'pt') set('paddingTop', v);
    else if (k === 'pb') set('paddingBottom', v);
    else if (k === 'dir') o.flexDirectionValue = v;
    else if (k === 'align') o.layoutAlignmentType = v;
    else if (k === 'w') o.layoutWidthScaleType = v;
    else if (k === 'h') o.layoutHeightScaleType = v;
    else if (k === 'radius') {
      if (Array.isArray(v)) {
        o.linkCornerRadius = 'false';
        [o.cornerRadiusTL, o.cornerRadiusTR, o.cornerRadiusBR, o.cornerRadiusBL] = v;
      } else o.cornerRadiusTL = v;
    } else if (k === 'absolute') {
      o.positionTypeValue = 'absolute';
      for (const [side, val] of Object.entries(v)) set(`position${side[0].toUpperCase()}${side.slice(1)}`, val);
    } else if (k === 'hidden') o.displayValue = v ? 'none' : 'flex';
    else set(k, v);
  }
  return o;
}

/** Caixa de layout. Retorna { id, styleId, xml }. */
function box(name, opt = {}, kids = []) {
  const bid = opt.id ?? id();
  const sid = opt.styleId ?? id();
  const { width, height, clip, fill, stroke, x, y, opacity, origin, fractionalWidth, attrs: extra, ...style } = opt;
  delete style.id;
  delete style.styleId;
  const xml = el(
    'LayoutComponent',
    { width, height, clip: clip === undefined ? 'false' : String(clip), x, y, opacity, fractionalWidth, ...extra, styleId: sid, name, id: bid },
    el('LayoutComponentStyle', { ...styleAttrs(style), name: `${name} Style`, id: sid }),
    origin && el('ComponentOrigin', { originX: origin[0], originY: origin[1], name: 'Origin' }),
    kids,
    fill,
    stroke,
  );
  return { id: bid, styleId: sid, xml };
}

/**
 * Texto. runs: string literal | { bind: pathIds, conv }.
 * opt: size, color, weight, w/h (participante), wrap, align, colorId, sem (SemanticData), id
 */
function text(name, runs, opt = {}) {
  const tid = opt.id ?? id();
  const styleId = id();
  const { size = 16, color = C.ink, weight = 400, w = 'fill', h = 'hug', wrap = true, align, colorId, sem, spacing, lineHeight } = opt;
  const runEls = (Array.isArray(runs) ? runs : [runs]).map((r) =>
    typeof r === 'string'
      ? el('TextValueRun', { styleId, text: r, name: 'Run' })
      : el('TextValueRun', { styleId, text: r.sample ?? ' ', name: 'Run' }, bind(r.bind, 268, r.conv)),
  );
  return {
    id: tid,
    xml: el(
      'Text',
      { wrapValue: wrap ? 'wrap' : 'noWrap', alignValue: align, name, id: tid },
      el('LayoutParticipant', { layoutWidthScaleType: w, layoutHeightScaleType: h, name: 'L' }),
      sem,
      el(
        'TextStylePaint',
        { fontSize: size, letterSpacing: spacing, lineHeight, fontAssetId: FONT, name: `${name} Style`, id: styleId },
        el('Fill', { name: 'F' }, solid(color, 1, colorId)),
        weight !== 400 && el('TextStyleAxis', { tag: WEIGHT_TAG, axisValue: weight, name: 'Weight' }),
      ),
      runEls,
    ),
  };
}
const semText = (labelBind, extra = {}) =>
  el('SemanticData', { role: 'text', label: '', name: 'Sem', ...extra }, labelBind && bind(labelBind, 983));
const semButton = (label) => el('SemanticData', { role: 'button', label, name: 'Sem' });

// ---------------------------------------------------------------- caminhos (subset de SVG: M L Q C Z)
function parseD(d) {
  const tok = d.match(/[MLQCZ]|-?\d*\.?\d+/gi);
  const subs = [];
  let cur = null;
  let i = 0;
  const num = () => +tok[i++];
  while (i < tok.length) {
    const cmd = tok[i++].toUpperCase();
    if (cmd === 'M') {
      cur = { pts: [{ x: num(), y: num() }], closed: false };
      subs.push(cur);
    } else if (cmd === 'L') cur.pts.push({ x: num(), y: num() });
    else if (cmd === 'Q') {
      const c = { x: num(), y: num() };
      const p = { x: num(), y: num() };
      const p0 = cur.pts.at(-1);
      p0.out = { x: p0.x + (2 / 3) * (c.x - p0.x), y: p0.y + (2 / 3) * (c.y - p0.y) };
      p.in = { x: p.x + (2 / 3) * (c.x - p.x), y: p.y + (2 / 3) * (c.y - p.y) };
      cur.pts.push(p);
    } else if (cmd === 'C') {
      const c1 = { x: num(), y: num() };
      const c2 = { x: num(), y: num() };
      const p = { x: num(), y: num() };
      cur.pts.at(-1).out = c1;
      p.in = c2;
      cur.pts.push(p);
    } else if (cmd === 'Z') {
      cur.closed = true;
      const a = cur.pts[0];
      const b = cur.pts.at(-1);
      if (cur.pts.length > 1 && Math.hypot(a.x - b.x, a.y - b.y) < 0.01) {
        a.in = b.in;
        cur.pts.pop();
      }
    }
  }
  return subs;
}
function bboxOf(subs) {
  const xs = [];
  const ys = [];
  for (const s of subs) for (const p of s.pts) for (const q of [p, p.in, p.out].filter(Boolean)) xs.push(q.x), ys.push(q.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
function pointsPath(sub, ox, oy) {
  let area = 0;
  sub.pts.forEach((p, i) => {
    const q = sub.pts[(i + 1) % sub.pts.length];
    area += p.x * q.y - q.x * p.y;
  });
  const verts = sub.pts.map((p) => {
    const x = n2(p.x - ox);
    const y = n2(p.y - oy);
    if (!p.in && !p.out) return el('StraightVertex', { x, y });
    const h = (q) => (q ? { r: n2(Math.atan2(q.y - p.y, q.x - p.x)), d: n2(Math.hypot(q.x - p.x, q.y - p.y)) } : { r: 0, d: 0 });
    const hi = h(p.in);
    const ho = h(p.out);
    return el('CubicDetachedVertex', { x, y, inRotation: hi.r, inDistance: hi.d, outRotation: ho.r, outDistance: ho.d });
  });
  return el('PointsPath', { isClosed: sub.closed ? 'true' : 'false', isClockwise: area >= 0 ? 'true' : 'false', name: 'Path' }, verts);
}
/** Forma a partir de um `d` (coordenadas absolutas), com a origem em (ox, oy). */
function pathShape(name, d, { ox = 0, oy = 0, x = 0, y = 0, fill, stroke, id: sid } = {}) {
  const subs = parseD(d);
  return el('Shape', { x, y, name, id: sid ?? id() }, subs.map((s) => pointsPath(s, ox, oy)), stroke, fill);
}

// ---------------------------------------------------------------- Dr. Gelpi (gelpi.svg → RML)
const PIVOTS = {
  'body-group': [200, 495],
  'head-group': [200, 240],
  'arm-right': [262, 268],
  'thumbs-up': [287, 192],
  'arm-left': [135, 275],
  eyebrows: [200, 142],
  'mouth-group': [200, 224],
};
const gelpiIds = {}; // classe → id do Node/Shape (pra animar)

function gelpiXml() {
  const svg = fs.readFileSync(path.join(here, 'gelpi.svg'), 'utf8');
  const grads = {};
  const root = { cls: 'root', pivot: [0, 0], kids: [] };
  const stack = [root];
  let grad = null;
  const re = /<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g;
  let m;
  const A = (s) => Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
  while ((m = re.exec(svg))) {
    const [, close, tag, raw, selfClose] = m;
    const a = A(raw);
    if (tag === 'svg' || tag === 'defs' || tag === 'filter' || tag === 'feGaussianBlur') continue;
    if (tag === 'linearGradient' || tag === 'radialGradient') {
      if (close) grad = null;
      else grads[a.id] = grad = { type: tag, a, stops: [] };
      continue;
    }
    if (tag === 'stop') {
      grad.stops.push({ pos: parseFloat(a.offset) / 100, color: a['stop-color'], alpha: a['stop-opacity'] ? +a['stop-opacity'] : 1 });
      continue;
    }
    if (tag === 'g') {
      if (close) stack.pop();
      else {
        const parent = stack.at(-1);
        const g = { cls: a.class, pivot: PIVOTS[a.class] ?? parent.pivot, kids: [] };
        parent.kids.push(g);
        stack.push(g);
      }
      continue;
    }
    if (!close) stack.at(-1).kids.push({ tag, a });
  }

  const pct = (v, def) => (v === undefined ? def : parseFloat(v) / 100);
  function gradient(ref, bb) {
    const g = grads[ref];
    const w = bb.maxX - bb.minX;
    const h = bb.maxY - bb.minY;
    const stops = g.stops.map((s) => el('GradientStop', { colorValue: argb(s.color, s.alpha), position: s.pos }));
    if (g.type === 'linearGradient') {
      return el(
        'LinearGradient',
        {
          startX: n2(bb.minX + pct(g.a.x1, 0) * w),
          startY: n2(bb.minY + pct(g.a.y1, 0) * h),
          endX: n2(bb.minX + pct(g.a.x2, 1) * w),
          endY: n2(bb.minY + pct(g.a.y2, 0) * h),
          name: 'G',
        },
        stops,
      );
    }
    const cx = bb.minX + pct(g.a.cx, 0.5) * w;
    const cy = bb.minY + pct(g.a.cy, 0.5) * h;
    const r = pct(g.a.r, 0.5) * ((w + h) / 2);
    return el('RadialGradient', { startX: n2(cx), startY: n2(cy), endX: n2(cx + r), endY: n2(cy), name: 'G' }, stops);
  }
  function paints(a, bb, closed) {
    const fillAttr = a.fill ?? (closed ? '#000000' : 'none');
    const fill =
      fillAttr === 'none'
        ? null
        : el('Fill', { name: 'Fill' }, fillAttr.startsWith('url(') ? gradient(fillAttr.slice(5, -1), bb) : solid(fillAttr));
    const stroke = a.stroke && a.stroke !== 'none' ? paintStroke(a.stroke, +(a['stroke-width'] ?? 1), { cap: a['stroke-linecap'] }) : null;
    return { fill, stroke };
  }

  function shapeXml(node, pivot) {
    const { tag, a } = node;
    const sid = id();
    if (a.class) gelpiIds[a.class] = sid;
    const [px, py] = pivot;
    const op = a.opacity !== undefined ? +a.opacity : undefined;
    if (tag === 'path' || tag === 'line') {
      const d = tag === 'line' ? `M${a.x1} ${a.y1} L${a.x2} ${a.y2}` : a.d;
      const subs = parseD(d);
      const bb = bboxOf(subs);
      const local = { minX: bb.minX - px, minY: bb.minY - py, maxX: bb.maxX - px, maxY: bb.maxY - py };
      const { fill, stroke } = paints(a, local, subs.some((s) => s.closed));
      return el('Shape', { opacity: op, name: a.class ?? tag, id: sid }, subs.map((s) => pointsPath(s, px, py)), stroke, fill);
    }
    if (tag === 'ellipse' || tag === 'circle') {
      const rx = +(a.rx ?? a.r);
      const ry = +(a.ry ?? a.r);
      const { fill, stroke } = paints(a, { minX: -rx, minY: -ry, maxX: rx, maxY: ry }, true);
      return el(
        'Shape',
        { x: n2(+a.cx - px), y: n2(+a.cy - py), opacity: op, name: a.class ?? tag, id: sid },
        el('Ellipse', { width: 2 * rx, height: 2 * ry, name: 'Path' }),
        stroke,
        fill,
      );
    }
    if (tag === 'rect') {
      const w = +a.width;
      const h = +a.height;
      const { fill, stroke } = paints(a, { minX: 0, minY: 0, maxX: w, maxY: h }, true);
      return el(
        'Shape',
        { x: n2(+a.x - px), y: n2(+a.y - py), opacity: op, name: a.class ?? tag, id: sid },
        el('Rectangle', { width: w, height: h, originX: 0, originY: 0, cornerRadiusTL: a.rx ?? 0, name: 'Path' }),
        stroke,
        fill,
      );
    }
    throw new Error(`gelpi.svg: <${tag}> não suportado`);
  }
  // RML desenha o primeiro irmão por cima; SVG, o último. Daí o reverse().
  function groupXml(g, parentPivot) {
    const kids = [...g.kids].reverse().map((k) => (k.kids ? groupXml(k, g.pivot) : shapeXml(k, g.pivot)));
    if (g.cls === 'root') return kids;
    // Keyframe de x/y substitui a posição (não soma): o Node de fora posiciona,
    // o de dentro (em 0,0 = o pivô) é o que as animações tocam.
    const nid = id();
    gelpiIds[g.cls] = nid;
    return el(
      'Node',
      { x: n2(g.pivot[0] - parentPivot[0]), y: n2(g.pivot[1] - parentPivot[1]), name: g.cls },
      el('Node', { name: `${g.cls} anim`, id: nid }, kids),
    );
  }
  return groupXml(root, [0, 0]);
}

// ---------------------------------------------------------------- animação e state machines
const animations = [];
/** keys: [{ obj, key, kind: 'Double'|'Color'|'Uint', frames: [[frame, value, ease?]] }] */
function anim(name, duration, keys, { loop } = {}) {
  const aid = id();
  const byObj = new Map();
  for (const k of keys) {
    if (!byObj.has(k.obj)) byObj.set(k.obj, []);
    byObj.get(k.obj).push(k);
  }
  animations.push(
    el(
      'LinearAnimation',
      { duration, loopValue: loop ? 'loop' : undefined, name, id: aid },
      [...byObj].map(([obj, ks]) =>
        el(
          'KeyedObject',
          { objectId: obj },
          ks.map((k) =>
            el(
              'KeyedProperty',
              { propertyKey: k.key },
              k.frames.map(([frame, value, ease]) =>
                el(
                  `KeyFrame${k.kind}`,
                  { value: k.kind === 'Color' ? argb(...[].concat(value)) : value, frame, interpolationType: ease ? 'cubic' : 'linear' },
                  ease && el('CubicEaseInterpolator', { x1: 0.42, y1: 0, x2: 0.58, y2: 1 }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  return aid;
}
const K = { x: 13, y: 14, rotation: 15, scaleX: 16, scaleY: 17, opacity: 18, color: 37, display: 596 };
/** Deslocamento em y que tira um contêiner inteiro do artboard (844 de altura). */
const OFFSCREEN_Y = 1000;
const hold = (obj, key, kind, value) => ({ obj, key, kind, frames: [[0, value]] });
const show = (styleId, on) => hold(styleId, K.display, 'Uint', on ? 0 : 1);

const condEnum = (pathIds, valueId) =>
  el(
    'TransitionViewModelCondition',
    { opValue: 'equal' },
    el('TransitionPropertyViewModelComparator', {}, el('BindablePropertyEnum', {}, bind(pathIds, 637))),
    el('TransitionValueEnumComparator', { value: valueId }),
  );
const condBool = (pathIds, v) =>
  el(
    'TransitionViewModelCondition',
    { opValue: 'equal' },
    el('TransitionPropertyViewModelComparator', {}, el('BindablePropertyBoolean', {}, bind(pathIds, 634))),
    el('TransitionValueBooleanComparator', { value: v ? 'true' : 'false' }),
  );

/** Uma camada: um estado por valor; transição de cada estado pra cada outro. */
function layer(name, states, y = 0) {
  const ids = states.map(() => id());
  return el(
    'StateMachineLayer',
    { name, id: id() },
    el('AnyState', { x: 0, y: y - 120 }),
    el('ExitState', { x: 200, y: y - 120 }),
    el('EntryState', { x: -200, y }, el('StateTransition', { stateToId: ids[0] })),
    states.map((s, i) =>
      el(
        'AnimationState',
        { x: i * 220, y, animationId: s.anim, stateName: s.name, id: ids[i] },
        states.map((t, j) => (i === j ? null : el('StateTransition', { stateToId: ids[j], duration: t.blend ?? 0 }, t.cond))),
      ),
    ),
  );
}
const enumLayer = (name, vm, prop, en, animsByKey, y) =>
  layer(
    name,
    Object.keys(en.v).map((k) => ({ name: k, anim: animsByKey[k], cond: condEnum(P(vm, prop), en.v[k]) })),
    y,
  );
const boolLayer = (name, vm, prop, offAnim, onAnim, y) =>
  layer(
    name,
    [
      { name: 'false', anim: offAnim, cond: condBool(P(vm, prop), false) },
      { name: 'true', anim: onAnim, cond: condBool(P(vm, prop), true) },
    ],
    y,
  );

function tapListener(targetId, triggerPath) {
  return el(
    'StateMachineListener',
    { targetId, name: 'Tap' },
    el('ListenerInputType', { listenerTypeValue: 'click' }),
    el('ListenerInputTypeSemantic', { listenerTypeValue: 'semanticAction' }, el('SemanticInput', { actionType: 'tap' })),
    el('ListenerViewModelChange', {}, el('BindablePropertyTrigger', { propertyValue: 1 }, bind(triggerPath, 686).replace('/>', ' direction="true"/>'))),
  );
}
function stateMachine(name, smId, listeners, layers) {
  return el('StateMachine', { name, id: smId }, listeners, layers);
}

// ---------------------------------------------------------------- ícones
const iconCheck = (hex, sid) => pathShape('Check', 'M-6 0 L-2 4 L6 -5', { stroke: paintStroke(hex, 2.6, { cap: 'round' }), id: sid });
const iconX = (hex, sid, s = 5) => pathShape('X', `M${-s} ${-s} L${s} ${s} M${s} ${-s} L${-s} ${s}`, { stroke: paintStroke(hex, 2.6, { cap: 'round' }), id: sid });
const flame = () =>
  pathShape('Flame', 'M0 -9 C1 -5 6 -3 6 2 C6 6 3 9 0 9 C-3 9 -6 6 -6 2 C-6 -2 -2 -3 0 -9 Z', { fill: paintFill(C.white) });

/** Ícone desenhado dentro de uma caixa fixa (o Node mantém o tamanho). */
const iconBox = (name, size, kids, opt = {}) =>
  box(name, { w: 'fixed', h: 'fixed', width: size, height: size, align: 'center', ...opt }, [el('Node', { x: size / 2, y: size / 2, name: `${name} Art` }, kids)]);

// ================================================================ artboard Option
const OPT = { sm: id() };
const optCard = { id: id(), styleId: id(), fill: id(), stroke: id() };
const optBadge = { id: id(), styleId: id(), fill: id() };
const optIcons = { ring: id(), dot: id(), check: id(), x: id() };
const optLabel = id();
const optLabelColor = id();

const optionArtboard = (() => {
  const badge = box(
    'Badge',
    { id: optBadge.id, styleId: optBadge.styleId, w: 'fixed', h: 'fixed', width: 28, height: 28, radius: 8, align: 'center', fill: paintFill(C.badge, { cid: optBadge.fill }) },
    [
      el(
        'Node',
        { x: 14, y: 14, name: 'Icons' },
        el('Shape', { name: 'Ring', id: optIcons.ring }, el('Ellipse', { width: 12, height: 12, name: 'Path' }), paintStroke(C.muted, 2)),
        el('Shape', { opacity: 0, name: 'Dot', id: optIcons.dot }, el('Ellipse', { width: 10, height: 10, name: 'Path' }), paintFill(C.white)),
        el('Node', { opacity: 0, name: 'CheckWrap', id: optIcons.check }, iconCheck(C.white)),
        el('Node', { opacity: 0, name: 'XWrap', id: optIcons.x }, iconX(C.white, undefined, 4.5)),
      ),
    ],
  );
  const label = text('Label', [{ bind: P(VM.Option, 'text'), sample: 'Alternativa' }], { id: optLabel, size: 15, weight: 600, color: C.ink, colorId: optLabelColor });
  const card = box(
    'Card',
    {
      id: optCard.id,
      styleId: optCard.styleId,
      dir: 'row',
      align: 'centerLeft',
      w: 'fill',
      h: 'hug',
      px: 16,
      py: 14,
      gap: 12,
      radius: 14,
      origin: [0.5, 0.5],
      fill: paintFill(C.white, { cid: optCard.fill }),
      stroke: paintStroke(C.border, 2, { cid: optCard.stroke }),
    },
    [el('SemanticData', { role: 'button', label: '', name: 'Sem' }, bind(P(VM.Option, 'text'), 983)), badge, label],
  );

  const look = (cardFill, cardStroke, badgeFill, labelColor, icon) => [
    hold(optCard.fill, K.color, 'Color', cardFill),
    hold(optCard.stroke, K.color, 'Color', cardStroke),
    hold(optBadge.fill, K.color, 'Color', badgeFill),
    hold(optLabelColor, K.color, 'Color', labelColor),
    ...Object.entries(optIcons).map(([k, oid]) => hold(oid, K.opacity, 'Double', k === icon ? 1 : 0)),
  ];
  const A = {
    idle: anim('Option Idle', 1, look(C.white, C.border, C.badge, C.ink, 'ring')),
    selected: anim('Option Selected', 1, look(C.blueSoft, C.blue, C.blue, C.ink, 'dot')),
    correct: anim('Option Correct', 24, [
      ...look(C.greenSoft, C.green, C.green, C.greenInk, 'check'),
      { obj: optCard.id, key: K.scaleX, kind: 'Double', frames: [[0, 1], [8, 1.03, true], [24, 1, true]] },
      { obj: optCard.id, key: K.scaleY, kind: 'Double', frames: [[0, 1], [8, 1.03, true], [24, 1, true]] },
    ]),
    wrong: anim('Option Wrong', 24, [
      ...look(C.redSoft, C.red, C.red, C.redInk, 'x'),
      { obj: optCard.id, key: K.x, kind: 'Double', frames: [[0, 0], [4, -7], [8, 7], [12, -5], [16, 5], [20, -2], [24, 0]] },
    ]),
  };
  return el(
    'Artboard',
    { isComponent: 'true', defaultStateMachineId: OPT.sm, viewModelId: VM.Option.id, viewModelInstanceId: '__OPTION_DEFAULT__', x: 500, y: 0, width: 350, height: 60, styleId: (OPT.style = id()), name: 'Option', id: (OPT.ab = id()) },
    el('LayoutComponentStyle', { ...styleAttrs({ dir: 'column', w: 'fill', h: 'hug' }), name: 'Option Style', id: OPT.style }),
    card,
    stateMachine('Option SM', OPT.sm, [tapListener(optCard.id, P(VM.Option, 'tap'))], [
      enumLayer('State', VM.Option, 'state', E.optionState, A, 0),
    ]),
    animations.splice(0),
  );
})();

// ================================================================ artboard ReviewItem
const RV = { sm: id() };
const reviewArtboard = (() => {
  const bar = { id: id(), fill: id() };
  const status = { id: id(), color: id() };
  const answers = { styleId: id() };
  const statusOk = id();
  const statusBad = id();
  const content = box('Content', { dir: 'column', w: 'fill', h: 'hug', p: 14, gap: 6 }, [
    box('Head', { dir: 'row', align: 'spaceBetweenCenter', w: 'fill', h: 'hug' }, [
      text('Title', [{ bind: P(VM.ReviewItem, 'title'), sample: 'Questão 1' }], { size: 12, weight: 700, color: C.muted, w: 'hug', wrap: false, spacing: 1 }),
      box('OkBox', { styleId: statusOk, w: 'hug', h: 'hug' }, [text('Acertou', 'Acertou', { size: 12, weight: 700, color: C.greenInk, w: 'hug', wrap: false })]),
      box('BadBox', { styleId: statusBad, w: 'hug', h: 'hug' }, [text('Errou', 'Errou', { size: 12, weight: 700, color: C.redInk, w: 'hug', wrap: false })]),
    ]),
    text('Question', [{ bind: P(VM.ReviewItem, 'question'), sample: 'Pergunta' }], { size: 15, weight: 600, color: C.ink, sem: semText(P(VM.ReviewItem, 'question')) }),
    box('Answers', { styleId: answers.styleId, dir: 'column', w: 'fill', h: 'hug', gap: 4 }, [
      text('Yours', ['Sua resposta: ', { bind: P(VM.ReviewItem, 'yourAnswer'), sample: '—' }], { size: 14, color: C.redInk }),
      text('Correct', ['Correta: ', { bind: P(VM.ReviewItem, 'correctAnswer'), sample: '—' }], { size: 14, weight: 600, color: C.greenInk }),
    ]),
    text('Explanation', [{ bind: P(VM.ReviewItem, 'explanation'), sample: '' }], { size: 13, color: C.muted, lineHeight: 18 }),
  ]);
  const card = box('Card', { dir: 'row', w: 'fill', h: 'hug', radius: 14, clip: true, fill: paintFill(C.white), stroke: paintStroke(C.border, 1) }, [
    box('Bar', { id: bar.id, w: 'fixed', h: 'fill', width: 4, fill: paintFill(C.green, { cid: bar.fill }) }),
    content,
  ]);
  const ok = anim('Review Ok', 1, [
    hold(bar.fill, K.color, 'Color', C.green),
    show(answers.styleId, false),
    show(statusOk, true),
    show(statusBad, false),
  ]);
  const bad = anim('Review Bad', 1, [
    hold(bar.fill, K.color, 'Color', C.red),
    show(answers.styleId, true),
    show(statusOk, false),
    show(statusBad, true),
  ]);
  return el(
    'Artboard',
    { isComponent: 'true', defaultStateMachineId: RV.sm, viewModelId: VM.ReviewItem.id, viewModelInstanceId: '__REVIEW_DEFAULT__', x: 500, y: 200, width: 350, height: 140, styleId: (RV.style = id()), name: 'ReviewItem', id: (RV.ab = id()) },
    el('LayoutComponentStyle', { ...styleAttrs({ dir: 'column', w: 'fill', h: 'hug' }), name: 'ReviewItem Style', id: RV.style }),
    card,
    stateMachine('ReviewItem SM', RV.sm, [], [boolLayer('Correct', VM.ReviewItem, 'isCorrect', bad, ok, 0)]),
    animations.splice(0),
  );
})();

// ================================================================ artboard Quiz
const Q = { sm: id(), ab: id(), style: id() };
const S = {}; // ids de estilos/caixas que as animações tocam
const quizArtboard = (() => {
  const q = (prop) => P(VM.Quiz, prop);

  // --- topo
  const close = box('Close', { w: 'fixed', h: 'fixed', width: 36, height: 36, radius: 18, align: 'center', fill: paintFill(C.white), stroke: paintStroke(C.border, 1) }, [
    semButton('Fechar o quiz'),
    el('Node', { x: 18, y: 18, name: 'Close Art' }, iconX(C.muted, undefined, 5)),
  ]);
  S.close = close.id;
  const track = box('Track', { styleId: (S.track = id()), dir: 'row', w: 'fill', h: 'fixed', height: 10, radius: 5, clip: true, fill: paintFill(C.track) }, [
    box('Done', { w: 'fill', h: 'fill', attrs: {}, radius: 5, fill: el('Fill', { name: 'Fill' }, el('LinearGradient', { startX: 0, startY: 0, endX: 200, endY: 0, name: 'G' }, el('GradientStop', { colorValue: argb(C.blue), position: 0 }), el('GradientStop', { colorValue: argb('#4FA8E8'), position: 1 }))) }, [
      bind(q('xpProgress'), 706),
    ]),
    box('Rest', { w: 'fill', h: 'fill' }, [bind(q('xpProgress'), 706, CV.rest)]),
  ]);
  const combo = box('Combo', { styleId: (S.combo = id()), dir: 'row', align: 'center', w: 'hug', h: 'fixed', height: 30, px: 10, gap: 4, radius: 15, fill: el('Fill', { name: 'Fill' }, el('LinearGradient', { startX: 0, startY: 0, endX: 60, endY: 30, name: 'G' }, el('GradientStop', { colorValue: argb(C.orange), position: 0 }), el('GradientStop', { colorValue: argb(C.amber), position: 1 }))) }, [
    el('SemanticData', { role: 'text', label: 'Sequência de acertos', name: 'Sem' }),
    iconBox('FlameBox', 18, [flame()]),
    text('ComboN', [{ bind: q('combo'), conv: CV.str, sample: '0' }], { size: 15, weight: 800, color: C.white, w: 'hug', wrap: false }),
  ]);
  const resultTitle = box('ResultTitleBox', { styleId: (S.resultTitle = id()), w: 'fill', h: 'hug', align: 'center', hidden: true }, [
    text('ResultTitle', 'Resultado', { size: 17, weight: 700, color: C.ink, w: 'hug', wrap: false, sem: semText(null, { label: 'Resultado', headingLevel: 1 }) }),
  ]);
  const header = box('Header', { dir: 'row', align: 'centerLeft', w: 'fill', h: 'hug', px: 20, py: 12, gap: 12 }, [close, track, combo, resultTitle]);

  // --- pergunta
  const optionsList = box('Options', { dir: 'column', w: 'fill', h: 'hug', gap: 10 }, [
    el('SemanticData', { role: 'list', label: 'Alternativas', name: 'Sem' }),
    el('ArtboardComponentList', { name: 'Rows', id: id() }, bind(q('options'), 800)),
  ]);
  S.hint = id();
  S.sending = id();
  const question = box('QuestionSection', { styleId: (S.question = id()), dir: 'column', w: 'fill', h: 'fill', px: 20, py: 8, gap: 14 }, [
    text('ProgressLabel', [{ bind: q('progressLabel'), sample: 'Pergunta 1 de 5' }], { size: 12, weight: 700, color: C.muted, spacing: 1.2, sem: semText(q('progressLabel')) }),
    text('QuestionText', [{ bind: q('questionText'), sample: 'Pergunta' }], { size: 20, weight: 800, color: C.ink, lineHeight: 26, sem: semText(q('questionText'), { headingLevel: 1 }) }),
    optionsList,
    box('HintBox', { styleId: S.hint, w: 'fill', h: 'hug', align: 'center', pt: 0 }, [
      text('Hint', 'Toque em uma alternativa para responder', { size: 13, color: C.muted, w: 'hug', wrap: false }),
    ]),
    box('SendingBox', { styleId: S.sending, w: 'fill', h: 'hug', align: 'center', hidden: true }, [
      text('Sending', 'Enviando…', { size: 13, weight: 600, color: C.blue, w: 'hug', wrap: false }),
    ]),
  ]);

  // --- feedback (folha inferior)
  const gelpi = box('GelpiBox', { w: 'fixed', h: 'fixed', width: 104, height: 135, clip: false }, [
    el('Node', { scaleX: 0.26, scaleY: 0.26, name: 'Dr. Gelpi', id: (S.gelpi = id()) }, gelpiXml()),
  ]);
  S.fbTitleColor = id();
  S.fbSubColor = id();
  const pill = (name, runs, bg, fg, styleId) =>
    box(name, { styleId, dir: 'row', align: 'center', w: 'hug', h: 'fixed', height: 30, px: 12, radius: 15, fill: paintFill(bg) }, [
      text(`${name}T`, runs, { size: 13, weight: 700, color: fg, w: 'hug', wrap: false }),
    ]);
  S.xpPill = id();
  const rewards = box('Rewards', { dir: 'row', align: 'centerLeft', w: 'fill', h: 'hug', gap: 8 }, [
    pill('XpPill', ['+', { bind: q('xpGained'), conv: CV.str, sample: '0' }, ' XP'], '#FFF4D6', '#C77F00', S.xpPill),
    pill('ComboPill', ['Combo ', { bind: q('combo'), conv: CV.str, sample: '0' }], '#FFE9DA', '#C2410C'),
    pill('AccPill', [{ bind: q('accuracy'), conv: CV.str, sample: '0' }, '% de acerto'], C.blueSoft, C.blue),
  ]);
  const CONF = [
    ['guessed', 'Chutei', 'pickGuessed'],
    ['thoughtKnew', 'Achei que sabia', 'pickThoughtKnew'],
    ['knew', 'Sabia', 'pickKnew'],
    ['mastered', 'Dominei', 'pickMastered'],
  ];
  S.conf = {};
  const confButtons = CONF.map(([key, label, trig]) => {
    const ids = { fill: id(), stroke: id(), label: id() };
    const b = box(`Conf ${key}`, { dir: 'column', align: 'center', w: 'fill', h: 'fixed', height: 54, px: 4, radius: 12, fill: paintFill(C.white, { cid: ids.fill }), stroke: paintStroke(C.border, 2, { cid: ids.stroke }) }, [
      semButton(label),
      text(`ConfL ${key}`, label, { size: 12, weight: 700, color: C.ink, colorId: ids.label, align: 'center', w: 'fill' }),
    ]);
    S.conf[key] = { ...ids, box: b.id, trig };
    return b;
  });
  S.cont = { id: id(), fill: id() };
  const cont = box('Continue', { id: S.cont.id, align: 'center', w: 'fill', h: 'fixed', height: 52, radius: 14, origin: [0.5, 0.5], fill: paintFill(C.blue, { cid: S.cont.fill }) }, [
    semButton('Continuar'),
    text('ContinueT', 'Continuar →', { size: 16, weight: 800, color: C.white, w: 'hug', wrap: false }),
  ]);
  const sheet = box(
    'FeedbackSheet',
    {
      id: (S.sheet = id()),
      opacity: 0,
      y: OFFSCREEN_Y,
      dir: 'column',
      w: 'fill',
      h: 'hug',
      px: 20,
      pt: 18,
      pb: 28,
      gap: 12,
      radius: [28, 28, 0, 0],
      fill: paintFill(C.white),
      stroke: paintStroke(C.border, 1),
    },
    [
      box('GelpiRow', { dir: 'row', align: 'centerLeft', w: 'fill', h: 'hug', gap: 12 }, [
        gelpi,
        box('FbText', { dir: 'column', w: 'fill', h: 'hug', gap: 4 }, [
          text('FbTitle', [{ bind: q('feedbackTitle'), sample: 'Excelente, doutor!' }], { size: 21, weight: 800, color: C.ink, colorId: S.fbTitleColor, sem: semText(q('feedbackTitle'), { headingLevel: 2 }) }),
          text('FbSubtitle', [{ bind: q('feedbackSubtitle'), sample: '' }], { size: 14, color: C.muted, colorId: S.fbSubColor, sem: semText(q('feedbackSubtitle')) }),
        ]),
      ]),
      rewards,
      text('ConfQ', 'Quão confiante você estava?', { size: 13, weight: 700, color: C.muted }),
      box('ConfRow', { dir: 'row', w: 'fill', h: 'hug', gap: 8 }, confButtons),
      cont,
    ],
  );
  // Camadas do stack: a folha fica embaixo, alinhada pela própria camada.
  // NUNCA `hidden` (display: none) em contêiner com botão: no rive-ios 6.28
  // o que nasce colapsado e é exibido por animação não recebe toque (os
  // botões de confiança não respondiam no iPhone). Fora da fase, a folha e o
  // backdrop saem por posição/opacidade, não por display.
  const sheetLayer = box('SheetLayer', { styleId: (S.sheetStyle = id()), dir: 'column', align: 'bottomCenter', w: 'fill', h: SHEET_LAYER_HUG ? 'hug' : 'fill' }, [sheet]);
  const backdrop = box('Backdrop', { id: (S.backdrop = id()), styleId: (S.backdropStyle = id()), opacity: 0, w: 'fill', h: 'fill', fill: paintFill(C.ink, { a: 0.28 }) });

  // --- resultado
  S.ringColor = id();
  S.ringTrim = id();
  S.ok = id();
  S.bad = id();
  const ring = box('Ring', { w: 'fixed', h: 'fixed', width: 132, height: 132, align: 'center' }, [
    el(
      'Node',
      { x: 66, y: 66, name: 'Ring Art' },
      el('Shape', { rotation: -1.5708, name: 'Progress' }, el('Ellipse', { width: 116, height: 116, name: 'Path' }), paintStroke(C.green, 12, { cid: S.ringColor, cap: 'round', kids: el('TrimPath', { start: 0, end: 0.5, name: 'Trim', id: S.ringTrim }, bind(q('score'), 115, CV.ring)) })),
      el('Shape', { name: 'Groove' }, el('Ellipse', { width: 116, height: 116, name: 'Path' }), paintStroke(C.border, 12)),
    ),
    text('Score', [{ bind: q('score'), conv: CV.str, sample: '0' }, '%'], { size: 30, weight: 800, color: C.ink, w: 'hug', wrap: false, sem: semText(null, { label: 'Nota' }) }),
  ]);
  const badge = box('Badge', { dir: 'row', align: 'center', w: 'hug', h: 'fixed', height: 30, px: 14, radius: 15, fill: paintFill(C.greenSoft, { cid: (S.badgeFill = id()) }) }, [
    box('OkBox', { styleId: S.ok, w: 'hug', h: 'hug' }, [text('Ok', 'Aprovado!', { size: 14, weight: 800, color: C.greenInk, w: 'hug', wrap: false })]),
    box('BadBox', { styleId: S.bad, w: 'hug', h: 'hug', hidden: true }, [text('Bad', 'Reprovado', { size: 14, weight: 800, color: C.redInk, w: 'hug', wrap: false })]),
  ]);
  S.retryLabel = id();
  S.genLabel = id();
  const retry = box('Retry', { id: (S.retry = id()), align: 'center', w: 'fill', h: 'fixed', height: 52, radius: 14, fill: paintFill(C.blue) }, [
    semButton('Novo Quiz'),
    box('RetryLBox', { styleId: S.retryLabel, w: 'hug', h: 'hug' }, [text('RetryL', 'Novo Quiz', { size: 16, weight: 800, color: C.white, w: 'hug', wrap: false })]),
    box('GenLBox', { styleId: S.genLabel, w: 'hug', h: 'hug', hidden: true }, [text('GenL', 'Gerando…', { size: 16, weight: 800, color: C.white, w: 'hug', wrap: false })]),
  ]);
  const back = box('Back', { id: (S.back = id()), align: 'center', w: 'fill', h: 'fixed', height: 52, radius: 14, fill: paintFill(C.white), stroke: paintStroke(C.border, 2) }, [
    semButton('Voltar para a aula'),
    text('BackL', 'Voltar para a aula', { size: 16, weight: 700, color: C.ink, w: 'hug', wrap: false }),
  ]);
  const scrollContent = box('ResultContent', { dir: 'column', w: 'fill', h: 'hug', px: 20, pt: 4, pb: 32, gap: 14 }, [
    box('ScoreCard', { dir: 'column', align: 'topCenter', w: 'fill', h: 'hug', p: 20, gap: 10, radius: 20, fill: paintFill(C.white), stroke: paintStroke(C.border, 1) }, [
      ring,
      badge,
      text('Summary', [{ bind: q('resultSummary'), sample: '0 de 0 corretas' }], { size: 15, weight: 600, color: C.muted, w: 'hug', wrap: false, sem: semText(q('resultSummary')) }),
    ]),
    text('ReviewTitle', 'Revisão das questões', { size: 17, weight: 800, color: C.ink, sem: semText(null, { label: 'Revisão das questões', headingLevel: 2 }) }),
    box('Review', { dir: 'column', w: 'fill', h: 'hug', gap: 10 }, [el('ArtboardComponentList', { name: 'ReviewRows', id: id() }, bind(q('review'), 800))]),
    retry,
    back,
    el('ScrollConstraint', { directionValue: 'vertical', physicsId: (S.physics = id()), name: 'Scroll' }),
  ]);
  // Mesma regra da folha: a seção de resultado tem botões (Novo Quiz, Voltar),
  // então vive numa camada própria do stack, sempre exibida, e fora da fase
  // fica abaixo do artboard. `pt` = altura do header (py 12 + botão 36), que
  // segue visível por cima na fase de resultado.
  const result = box('ResultSection', { id: (S.result = id()), dir: 'column', w: 'fill', h: 'fill', clip: true, opacity: 0, y: OFFSCREEN_Y }, [scrollContent]);
  const resultLayer = box('ResultLayer', { dir: 'column', w: 'fill', h: 'fill', pt: 60 }, [result]);

  // --- animações da tela
  const bd = (k) => (HAS_BACKDROP ? [k] : []);
  const offscreen = (obj, on) => [
    hold(obj, K.y, 'Double', on ? 0 : OFFSCREEN_Y),
    hold(obj, K.opacity, 'Double', on ? 1 : 0),
  ];
  const phaseLook = (ph) => [
    show(S.question, ph !== 'result'),
    ...offscreen(S.result, ph === 'result'),
    show(S.track, ph !== 'result'),
    show(S.combo, ph !== 'result'),
    show(S.resultTitle, ph === 'result'),
  ];
  const A = {
    question: anim('Phase Question', 1, [...phaseLook('question'), ...offscreen(S.sheet, false), ...bd(hold(S.backdrop, K.opacity, 'Double', 0))]),
    feedback: anim('Phase Feedback', 20, [
      ...phaseLook('feedback'),
      hold(S.sheet, K.opacity, 'Double', 1),
      { obj: S.sheet, key: K.y, kind: 'Double', frames: [[0, 420], [20, 0, true]] },
      ...bd({ obj: S.backdrop, key: K.opacity, kind: 'Double', frames: [[0, 0], [14, 1, true]] }),
    ]),
    result: anim('Phase Result', 1, [...phaseLook('result'), ...offscreen(S.sheet, false), ...bd(hold(S.backdrop, K.opacity, 'Double', 0))]),
  };
  const g = gelpiIds;
  const GA = {
    none: anim('Gelpi None', 1, [hold(g.thumb, K.opacity, 'Double', 1)]),
    correct: anim(
      'Gelpi Correct',
      72,
      [
        { obj: g['body-group'], key: K.y, kind: 'Double', frames: [[0, 0], [18, -14, true], [36, 0, true], [54, -8, true], [72, 0, true]] },
        { obj: g['head-group'], key: K.rotation, kind: 'Double', frames: [[0, 0], [18, 0.07, true], [54, -0.07, true], [72, 0, true]] },
        { obj: g['arm-right'], key: K.rotation, kind: 'Double', frames: [[0, 0], [12, -0.22, true], [24, 0, true], [36, -0.22, true], [48, 0, true]] },
        { obj: g['thumbs-up'], key: K.rotation, kind: 'Double', frames: [[0, 0], [10, 0.25, true], [20, 0, true]] },
        { obj: g.eyebrows, key: K.y, kind: 'Double', frames: [[0, 0], [18, -5, true], [36, 0, true]] },
        hold(g.thumb, K.opacity, 'Double', 1),
        hold(g['thumb-nail'], K.opacity, 'Double', 1),
        hold(g['mouth-group'], K.scaleY, 'Double', 1),
        hold(S.fbTitleColor, K.color, 'Color', C.ink),
        hold(S.fbSubColor, K.color, 'Color', C.muted),
        hold(S.xpPill, K.display, 'Uint', 0),
      ],
      { loop: true },
    ),
    wrong: anim(
      'Gelpi Wrong',
      90,
      [
        { obj: g['head-group'], key: K.rotation, kind: 'Double', frames: [[0, 0], [10, -0.1, true], [22, 0.1, true], [34, -0.06, true], [44, 0, true], [90, 0]] },
        { obj: g['body-group'], key: K.y, kind: 'Double', frames: [[0, 0], [45, 4, true], [90, 0, true]] },
        hold(g['arm-right'], K.rotation, 'Double', 2.6),
        hold(g.thumb, K.opacity, 'Double', 0),
        hold(g['thumb-nail'], K.opacity, 'Double', 0),
        hold(g.eyebrows, K.y, 'Double', 4),
        { obj: g['mouth-group'], key: K.scaleY, kind: 'Double', frames: [[0, 0.45]] },
        hold(S.fbTitleColor, K.color, 'Color', C.warmInk),
        hold(S.fbSubColor, K.color, 'Color', C.warmMuted),
        hold(S.xpPill, K.display, 'Uint', 1),
      ],
      { loop: true },
    ),
  };
  const confLook = (sel) =>
    Object.entries(S.conf).flatMap(([key, ids]) => [
      hold(ids.fill, K.color, 'Color', key === sel ? C.blue : C.white),
      hold(ids.stroke, K.color, 'Color', key === sel ? C.blue : C.border),
      hold(ids.label, K.color, 'Color', key === sel ? C.white : C.ink),
    ]);
  const CA = Object.fromEntries(Object.keys(E.confidence.v).map((k) => [k, anim(`Conf ${k}`, 1, confLook(k))]));

  const listeners = [
    tapListener(S.close, q('closeTap')),
    ...Object.values(S.conf).map((c) => tapListener(c.box, q(c.trig))),
    tapListener(S.cont.id, q('continueTap')),
    tapListener(S.retry, q('retryTap')),
    tapListener(S.back, q('closeTap')),
  ];
  const layers = [
    enumLayer('Phase', VM.Quiz, 'phase', E.phase, A, 0),
    enumLayer('Gelpi', VM.Quiz, 'feedbackKind', E.feedbackKind, GA, 300),
    enumLayer('Confidence', VM.Quiz, 'confidence', E.confidence, CA, 600),
    boolLayer('CanContinue', VM.Quiz, 'canContinue', anim('Continue Off', 1, [hold(S.cont.id, K.opacity, 'Double', 0.45)]), anim('Continue On', 1, [hold(S.cont.id, K.opacity, 'Double', 1)]), 900),
    boolLayer('Locked', VM.Quiz, 'locked', anim('Hint On', 1, [show(S.hint, true)]), anim('Hint Off', 1, [show(S.hint, false)]), 1200),
    boolLayer('Submitting', VM.Quiz, 'submitting', anim('Sending Off', 1, [show(S.sending, false)]), anim('Sending On', 1, [show(S.sending, true)]), 1500),
    boolLayer(
      'Passed',
      VM.Quiz,
      'passed',
      anim('Failed', 1, [show(S.ok, false), show(S.bad, true), hold(S.ringColor, K.color, 'Color', C.red), hold(S.badgeFill, K.color, 'Color', C.redSoft)]),
      anim('Passed', 1, [show(S.ok, true), show(S.bad, false), hold(S.ringColor, K.color, 'Color', C.green), hold(S.badgeFill, K.color, 'Color', C.greenSoft)]),
      1800,
    ),
    boolLayer('Generating', VM.Quiz, 'generating', anim('Gen Off', 1, [show(S.retryLabel, true), show(S.genLabel, false)]), anim('Gen On', 1, [show(S.retryLabel, false), show(S.genLabel, true)]), 2100),
  ];

  return el(
    'Artboard',
    { defaultStateMachineId: Q.sm, viewModelId: VM.Quiz.id, viewModelInstanceId: '__QUIZ_DEFAULT__', x: 0, y: 0, width: 390, height: 844, styleId: Q.style, name: 'Quiz', id: Q.ab },
    el('LayoutComponentStyle', { ...styleAttrs({ dir: 'column' }), name: 'Quiz Style', id: Q.style }),
    el('Fill', { name: 'Background' }, el('LinearGradient', { startX: 0, startY: 0, endX: 0, endY: 844, name: 'G' }, el('GradientStop', { colorValue: argb(C.bgTop), position: 0 }), el('GradientStop', { colorValue: argb(C.bgBottom), position: 1 }))),
    // stack: as três camadas ocupam a mesma célula; a primeira declarada fica por cima
    box('Root', { layoutTypeValue: 'stack', w: 'fill', h: 'fill', ...(SHEET_LAYER_HUG ? { align: 'bottomCenter' } : {}) }, [
      sheetLayer,
      ...(HAS_BACKDROP ? [backdrop] : []),
      box('Main', { dir: 'column', w: 'fill', h: 'fill', pt: 8 }, [header, question]),
      resultLayer,
    ]),
    stateMachine('Quiz SM', Q.sm, listeners, layers),
    animations.splice(0),
  );
})();

// ---------------------------------------------------------------- instâncias de exemplo (o que o CLI mostra)
const optionDefault = instance(VM.Option, 'Default', { text: 'Alternativa', state: 'idle' });
const OPTIONS = [
  'Poliglecaprone 25 (absorvível monofilamentar)',
  'Seda',
  'Nylon multifilamentar, com nós externos e retirada dos pontos em 10 a 14 dias após o procedimento',
  'Categute cromado',
];
const optionIds = OPTIONS.map((t, i) => instance(VM.Option, `Opt ${i + 1}`, { text: t, state: 'idle' }));
const reviewDefault = instance(VM.ReviewItem, 'Default', { title: 'Questão 1', question: 'Pergunta', isCorrect: true });
const reviewIds = [
  instance(VM.ReviewItem, 'Rev 1', {
    title: 'QUESTÃO 1',
    question: 'Qual fio é mais indicado para a sutura intradérmica após uma orquiectomia em cão?',
    isCorrect: true,
    explanation: 'Absorvível e monofilamentar: menor reação tecidual e sem necessidade de retirada.',
  }),
  instance(VM.ReviewItem, 'Rev 2', {
    title: 'QUESTÃO 2',
    question: 'Tempo de jejum hídrico recomendado antes da anestesia em cães adultos saudáveis?',
    isCorrect: false,
    yourAnswer: 'Nenhum',
    correctAnswer: '2 horas',
    explanation: 'Jejum hídrico curto reduz o risco de regurgitação sem desidratar o paciente.',
  }),
  instance(VM.ReviewItem, 'Rev 3', {
    title: 'QUESTÃO 3',
    question: 'Qual a principal função do pedículo ovariano na técnica de ovariohisterectomia?',
    isCorrect: true,
    explanation: '',
  }),
];
const quizDefault = instance(VM.Quiz, 'Default', {
  phase: 'question',
  progressLabel: 'PERGUNTA 1 DE 5',
  questionNumber: 1,
  questionCount: 5,
  questionText: 'Qual fio é mais indicado para a sutura intradérmica após uma orquiectomia em cão?',
  options: optionIds,
  combo: 2,
  xpProgress: 40,
  feedbackKind: 'none',
  feedbackTitle: 'Excelente, doutor!',
  feedbackSubtitle: 'Resposta certeira — diagnóstico em segundos.',
  xpGained: 17,
  accuracy: 67,
  confidence: 'none',
  score: 67,
  passed: true,
  resultSummary: '2 de 3 corretas',
  review: reviewIds,
});

// ---------------------------------------------------------------- saída
const out = [
  '<Rive version="1" kind="fragment">',
  '<!-- GERADO por gen-scene.mjs — não editar à mão. -->',
  quizArtboard.replace('__QUIZ_DEFAULT__', quizDefault),
  optionArtboard.replace('__OPTION_DEFAULT__', optionDefault),
  reviewArtboard.replace('__REVIEW_DEFAULT__', reviewDefault),
  animations.length ? (() => { throw new Error('animação fora de artboard'); })() : '',
  el('ElasticScrollPhysics', { name: 'Physics', id: S.physics }),
  el('FontAsset', { file: 'Inter.ttf', name: 'Inter', id: FONT }),
  converters,
  enums.map((e) => el('DataEnumCustom', { name: e.name, id: e.id }, Object.entries(e.v).map(([k, vid]) => el('DataEnumValue', { key: k, value: k, id: vid })))),
  vmXml(VM.Option, optionDefault),
  vmXml(VM.ReviewItem, reviewDefault),
  vmXml(VM.Quiz, quizDefault),
  '</Rive>',
]
  .flat(Infinity)
  .filter(Boolean)
  .map((x) => (typeof x === 'string' ? x : x.xml))
  .join('\n');
fs.writeFileSync(path.join(here, 'scene.rml'), out + '\n');
console.log(`scene.rml: ${out.length} bytes, ${next - 10} ids`);
