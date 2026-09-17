import { useState, useRef, useEffect, useCallback } from "react";

// ─── Типы ────────────────────────────────────────────────────────────────────

type Screen = "home" | "quiz" | "dashboard" | "specialty" | "compare" | "complist" | "favorites";

type Quota = "none" | "mo" | "target" | "special";

interface Profile {
  rus: string;
  math: string;
  info: string;
  achievements: number; // ИД
  quota: Quota;
  bvi: Record<string, boolean>; // per specialty id
  saved: boolean;
  favorites: string[];
}

type Archetype = "ai" | "swe" | "biz" | "hw";

interface Grade { level: string; salary: string; }
interface Olympiad { name: string; level: string; bonus: string; }
interface Career { role: string; salary: string; demand: string; }

interface Specialty {
  id: string;
  name: string;
  code: string;
  uni: string;
  city: string;
  archetype: Archetype;
  scoreGeneral: number | "БВИ";
  scoreQuota: number;
  budgetGeneral: number;
  budgetQuota: number;
  paid: number;
  dorm: boolean;
  salary: string;
  grades: Grade[];
  stack: string[];
  subjects: string[];
  desc: string;
  olympiads: Olympiad[];
  subjectsStudy: string[];
  careers: Career[];
}

type Category = "БВИ" | "Особая квота" | "Целевой прием" | "Квота МО" | "Общий конкурс";

interface CompetitorEntry {
  snils: string;
  ege: number;
  achievements: number;
  total: number;
  category: Category;
  consent: boolean;
  priority: number;
  isPhantom: boolean;
  isMe?: boolean;
}

// ─── Data: 4 целевые IT-программы ──────────────────────────────────────────────
// Демонстрационные данные для хакатон-MVP: баллы/зарплаты смоделированы,
// чтобы формулы шансов и конкурсных списков работали реалистично и стабильно.

const SPECIALTIES: Specialty[] = [
  {
    id: "hse-ai",
    name: "Технологии искусственного и дополненного интеллекта",
    code: "09.03.04",
    uni: "ВШЭ — Нижний Новгород",
    city: "Нижний Новгород",
    archetype: "ai",
    // Проходной балл: 2025 — 290, в 2026 приём шёл практически полностью по БВИ
    scoreGeneral: "БВИ",
    scoreQuota: 255,
    budgetGeneral: 8,
    budgetQuota: 2, // особая квота 1 + отдельная квота 1
    paid: 590000,
    dorm: true,
    salary: "290 000 ₽",
    grades: [
      { level: "Junior", salary: "90 000 ₽" },
      { level: "Middle", salary: "200 000 ₽" },
      { level: "Senior", salary: "350 000 ₽" },
    ],
    stack: ["Python", "PyTorch", "ML", "NLP"],
    subjects: ["Профильная математика", "Информатика / Физика", "Русский язык"],
    desc: "Фокус на методах ИИ, нейросетях, компьютерном зрении и анализе данных. Практическая разработка систем машинного обучения совместно с IT-кампусом «НЕЙМАРК».",
    olympiads: [
      { name: "ВсОШ (информатика / математика)", level: "победитель или призёр", bonus: "БВИ без подтверждения ЕГЭ" },
      { name: "«Высшая проба» (информатика, I уровень)", level: "победитель", bonus: "БВИ (при ЕГЭ ≥ 75)" },
      { name: "«Высшая проба» (математика, I уровень)", level: "призёр", bonus: "100 баллов по математике (при ЕГЭ ≥ 75)" },
      { name: "«Ломоносов» (математика, I уровень)", level: "победитель / призёр", bonus: "100 баллов (при ЕГЭ ≥ 75)" },
      { name: "НТО (искусственный интеллект, III уровень)", level: "победитель / призёр", bonus: "100 баллов по информатике (при ЕГЭ ≥ 75)" },
    ],
    subjectsStudy: ["Машинное обучение", "Нейронные сети", "Матанализ и линал", "Python и алгоритмы", "Обработка естественного языка", "Компьютерное зрение", "Базы данных", "Теория вероятностей"],
    careers: [
      { role: "ML-инженер", salary: "120 000 ₽", demand: "Очень высокий" },
      { role: "Data Scientist", salary: "110 000 ₽", demand: "Очень высокий" },
      { role: "Backend-разработчик", salary: "100 000 ₽", demand: "Очень высокий" },
      { role: "Prompt-инженер", salary: "80 000 ₽", demand: "Средний" },
    ],
  },
  {
    id: "mipt-pmi",
    name: "Прикладная математика и информатика",
    code: "01.03.02",
    uni: "МФТИ - Долгопрудный",
    city: "Долгопрудный",
    archetype: "swe",
    // Проходной балл: 2025 — 303, 2026 — 310
    scoreGeneral: 310,
    scoreQuota: 275,
    budgetGeneral: 133,
    budgetQuota: 47, // особая 18 + отдельная 18 + целевая 11
    paid: 1014000,
    dorm: true,
    salary: "350 000 ₽",
    grades: [
      { level: "Junior", salary: "100 000 ₽" },
      { level: "Middle", salary: "200 000 ₽" },
      { level: "Senior", salary: "350 000 ₽" },
    ],
    stack: ["C++", "Алгоритмы", "Матанализ", "Линал"],
    subjects: ["Профильная математика", "Информатика / Физика", "Русский язык"],
    desc: "Флагманская программа Физтеха с глубокой математикой и мощным алгоритмическим ядром. Подготовка специалистов в Data Science, разработке ПО и FinTech.",
    olympiads: [
      { name: "ВсОШ (информатика / математика)", level: "победитель или призёр", bonus: "БВИ без подтверждения ЕГЭ" },
      { name: "«Физтех» (математика, II уровень)", level: "победитель / призёр", bonus: "БВИ для ФПМИ (при ЕГЭ ≥ 75)" },
      { name: "«Высшая проба» (информатика, I уровень)", level: "победитель / призёр", bonus: "БВИ для ФПМИ (при ЕГЭ ≥ 75)" },
      { name: "«Физтех» (информатика и программирование, III уровень)", level: "победитель / призёр", bonus: "100 баллов по информатике (при ЕГЭ ≥ 75)" },
      { name: "НТО (информационная безопасность / ИИ, II–III уровень)", level: "победитель / призёр", bonus: "100 баллов (при ЕГЭ ≥ 75)" },
    ],
    subjectsStudy: ["Алгоритмы и структуры данных", "Дискретная математика", "Матанализ", "Операционные системы", "Компьютерные сети", "Теория вероятностей", "С++ и системное программирование", "Компьютерная архитектура"],
    careers: [
      { role: "ML-инженер", salary: "120 000 ₽", demand: "Очень высокий" },
      { role: "Data Scientist", salary: "110 000 ₽", demand: "Очень высокий" },
      { role: "Research-инженер (исследователь)", salary: "130 000 ₽", demand: "Высокий" },
      { role: "Backend-разработчик", salary: "100 000 ₽", demand: "Очень высокий" },
    ],
  },
  {
    id: "hse-bi",
    name: "Компьютерные науки и технологии (Бизнес-информатика)",
    code: "38.03.05",
    uni: "ВШЭ — Нижний Новгород",
    city: "Нижний Новгород",
    archetype: "biz",
    // Проходной балл: 2025 — 251, 2026 — 269
    scoreGeneral: 269,
    scoreQuota: 234,
    budgetGeneral: 53,
    budgetQuota: 12, // отдельная 10 + особая 1 + целевая 1
    paid: 440000,
    dorm: true,
    salary: "290 000 ₽",
    grades: [
      { level: "Junior", salary: "80 000 ₽" },
      { level: "Middle", salary: "180 000 ₽" },
      { level: "Senior", salary: "300 000 ₽" },
    ],
    stack: ["SQL", "BI-аналитика", "Python", "1С"],
    subjects: ["Профильная математика", "Информатика / Обществознание", "Русский язык"],
    desc: "Подготовка специалистов на стыке IT и бизнеса. Обучение проектированию, внедрению и сопровождению корпоративных информационных систем, анализу данных и управлению проектами.",
    olympiads: [
      { name: "ВсОШ (информатика / математика)", level: "победитель или призёр", bonus: "БВИ без подтверждения ЕГЭ" },
      { name: "«Высшая проба» (информатика, I уровень)", level: "победитель", bonus: "БВИ (при ЕГЭ ≥ 75)" },
      { name: "«Высшая проба» (информатика, I уровень)", level: "призёр (II–III)", bonus: "100 баллов по информатике (при ЕГЭ ≥ 75)" },
      { name: "«Ломоносов» (математика, I уровень)", level: "победитель / призёр", bonus: "100 баллов по математике (при ЕГЭ ≥ 75)" },
      { name: "НТО (большие данные и МО, III уровень)", level: "победитель / призёр", bonus: "100 баллов по информатике (при ЕГЭ ≥ 75)" },
    ],
    subjectsStudy: ["Бизнес-анализ", "Управление IT-проектами", "Базы данных", "Эконометрика", "Цифровой маркетинг", "BI и визуализация данных", "Основы программирования", "Системный анализ"],
    careers: [
      { role: "Бизнес-аналитик", salary: "100 000 ₽", demand: "Высокий" },
      { role: "Product-менеджер", salary: "120 000 ₽", demand: "Высокий" },
      { role: "Системный аналитик", salary: "90 000 ₽", demand: "Высокий" },
      { role: "Data Analyst", salary: "80 000 ₽", demand: "Очень высокий" },
    ],
  },
  {
    id: "misis-ivt",
    name: "Информатика и вычислительная техника",
    code: "09.00.00",
    uni: "МИСиС - Москва",
    city: "Москва",
    archetype: "hw",
    // Проходной балл: 2025 — 284, 2026 — 289
    scoreGeneral: 289,
    scoreQuota: 254,
    budgetGeneral: 117,
    budgetQuota: 38, // особая 16 + отдельная 16 + целевая 6
    paid: 440000,
    dorm: true,
    salary: "250 000 ₽",
    grades: [
      { level: "Junior", salary: "80 000 ₽" },
      { level: "Middle", salary: "180 000 ₽" },
      { level: "Senior", salary: "300 000 ₽" },
    ],
    stack: ["C", "Сети", "Embedded", "IoT"],
    subjects: ["Профильная математика", "Информатика / Физика", "Русский язык"],
    desc: "Подготовка IT-инженеров широкого профиля. Специализации в сфере искусственного интеллекта, Big Data, программной инженерии, IoT и автономных систем.",
    olympiads: [
      { name: "ВсОШ (информатика / математика)", level: "победитель или призёр", bonus: "БВИ без подтверждения ЕГЭ" },
      { name: "«Высшая проба» (информатика, I уровень)", level: "победитель / призёр", bonus: "БВИ (при ЕГЭ ≥ 75)" },
      { name: "«Физтех» (математика / информатика, II уровень)", level: "победитель / призёр", bonus: "БВИ (при ЕГЭ ≥ 75)" },
      { name: "НТО (искусственный интеллект, III уровень)", level: "победитель / призёр", bonus: "БВИ (при ЕГЭ ≥ 75)" },
      { name: "ОММО (математика, II уровень)", level: "победитель / призёр", bonus: "100 баллов по математике (при ЕГЭ ≥ 75)" },
    ],
    subjectsStudy: ["Компьютерная архитектура", "Компьютерные сети", "Embedded-системы", "Операционные системы", "Электроника и схемотехника", "Linux и администрирование", "Базы данных", "Кибербезопасность"],
    careers: [
      { role: "Backend-разработчик", salary: "100 000 ₽", demand: "Очень высокий" },
      { role: "Системный программист", salary: "90 000 ₽", demand: "Высокий" },
      { role: "Data Engineer", salary: "100 000 ₽", demand: "Высокий" },
      { role: "DevOps-инженер", salary: "100 000 ₽", demand: "Высокий" },
    ],
  },
];

const QUOTA_LABELS: Record<Quota, string> = {
  none: "Без квоты",
  mo: "Квота МО",
  target: "Целевой прием",
  special: "Особая квота",
};

const DEFAULT_PROFILE: Profile = {
  rus: "",
  math: "",
  info: "",
  achievements: 0,
  quota: "none",
  bvi: {},
  saved: false,
  favorites: [],
};

// ─── Формулы: баллы, шансы, конкурсные списки ──────────────────────────────────

function clampAchievements(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(10, Math.round(v)));
}

function totalEge(p: Profile): number {
  return (Number(p.rus) || 0) + (Number(p.math) || 0) + (Number(p.info) || 0);
}

function effectiveEge(p: Profile): number {
  return p.saved ? totalEge(p) : 255;
}

function effectiveAchievements(p: Profile): number {
  return p.saved ? p.achievements : 5;
}

function effectiveTotal(p: Profile): number {
  return effectiveEge(p) + effectiveAchievements(p);
}

function calcChance(sp: Specialty, p: Profile): number {
  if (p.bvi[sp.id]) return 99;
  const total = effectiveTotal(p);
  const threshold = p.quota !== "none" ? sp.scoreQuota : sp.scoreGeneral;
  const pct = Math.round(50 + (total - threshold) * 2.2);
  return Math.max(2, Math.min(98, pct));
}

function quotaCategory(p: Profile, spId: string): Category {
  if (p.bvi[spId]) return "БВИ";
  if (p.quota === "mo") return "Квота МО";
  if (p.quota === "target") return "Целевой прием";
  if (p.quota === "special") return "Особая квота";
  return "Общий конкурс";
}

const CATEGORY_RANK: Record<Category, number> = {
  "БВИ": 0,
  "Особая квота": 1,
  "Целевой прием": 1,
  "Квота МО": 1,
  "Общий конкурс": 2,
};

const CATEGORY_COLOR: Record<Category, string> = {
  "БВИ": "#10B981",
  "Особая квота": "#F59E0B",
  "Целевой прием": "#2563EB",
  "Квота МО": "#8B5CF6",
  "Общий конкурс": "#64748B",
};

function generateCompetitors(base: number): CompetitorEntry[] {
  const out: CompetitorEntry[] = [];
  const catCycle: Category[] = ["БВИ", "Общий конкурс", "Общий конкурс", "Особая квота", "Общий конкурс", "Целевой прием", "Общий конкурс", "Квота МО", "Общий конкурс", "Общий конкурс"];
  const idCycle = [10, 5, 0, 8, 3];
  for (let i = 0; i < 22; i++) {
    const drop = Math.round(i * 3.6 + (i % 3) * 2);
    const ege = Math.max(140, base + 22 - drop);
    const achievements = idCycle[i % idCycle.length];
    const total = ege + achievements;
    const category = catCycle[i % catCycle.length];
    const priority = (i % 5) + 1;
    const consent = priority === 1 && i % 3 !== 2;
    const isPhantom = !consent && priority > 1;
    out.push({
      snils: String(1000000 + i * 7919 + base).slice(0, 7),
      ege,
      achievements,
      total,
      category,
      consent,
      priority,
      isPhantom,
    });
  }
  return out;
}

function buildFullList(sp: Specialty, p: Profile): CompetitorEntry[] {
  // scoreGeneral может быть "БВИ" (например, для программ, где приём почти полностью
  // идёт без вступительных баллов) — generateCompetitors ждёт число, поэтому для
  // генерации реалистичного конкурсного списка используем численный ориентир (290 —
  // фактический проходной балл прошлого года по общему конкурсу, см. комментарий выше).
  const baseScore = typeof sp.scoreGeneral === "number" ? sp.scoreGeneral : 290;
  const base = generateCompetitors(baseScore);
  const ege = effectiveEge(p);
  const achievements = effectiveAchievements(p);
  const total = ege + achievements;
  const category = quotaCategory(p, sp.id);
  const me: CompetitorEntry = {
    snils: String(9000000 + total * 41 + achievements).slice(0, 7),
    ege,
    achievements,
    total,
    category,
    consent: true,
    priority: 1,
    isPhantom: false,
    isMe: true,
  };
  return [...base, me].sort((a, b) => {
    const r = CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
    if (r !== 0) return r;
    return b.total - a.total;
  });
}

// ─── AI-ассистент: детерминированная база знаний ───────────────────────────────

const AI_QUICK_PROMPTS = [
  "Проходные баллы всех программ",
  "Зарплатные треки Junior/Middle/Senior",
  "Какие олимпиады дают БВИ",
  "Есть общежития?",
  "Мои шансы поступления",
  "Как работают квоты",
  "Что даёт БВИ",
];

const SPECIALTY_ALIASES: Record<string, string[]> = {
  "hse-ai": ["искусственный интеллект", "вшэ ии", " ии ", "ии-программ"],
  "mipt-pmi": ["мфти", "пми", "физтех"],
  "hse-bi": ["бизнес-информатика", "бизнес информатика", "вшэ би"],
  "misis-ivt": ["мисис", "ивт", "вычислительная техника"],
};

function findMentionedSpecialty(text: string): Specialty | undefined {
  const t = " " + text.toLowerCase() + " ";
  for (const sp of SPECIALTIES) {
    const aliases = SPECIALTY_ALIASES[sp.id] || [];
    if (aliases.some(a => t.includes(a))) return sp;
  }
  return undefined;
}

function answerScores(target?: Specialty): string {
  const list = target ? [target] : SPECIALTIES;
  const lines = list.map(s => `• ${s.name} (${s.uni}): общий конкурс — ${s.scoreGeneral} б., по квоте — ${s.scoreQuota} б.`);
  return "Проходные баллы прошлого набора:\n" + lines.join("\n");
}

function answerSalary(target?: Specialty): string {
  const list = target ? [target] : SPECIALTIES;
  const lines = list.map(s => `• ${s.name}: ` + s.grades.map(g => `${g.level} — ${g.salary}`).join(", "));
  return "Зарплатные треки по рынку на 2026 год:\n" + lines.join("\n");
}

function answerOlymp(target?: Specialty): string {
  const list = target ? [target] : SPECIALTIES;
  const lines = list.map(s => `• ${s.name}:\n` + s.olympiads.map(o => `   – ${o.name} (${o.level}) → ${o.bonus}`).join("\n"));
  return "Олимпиады, которые засчитываются:\n" + lines.join("\n");
}

function answerDorm(target?: Specialty): string {
  const list = target ? [target] : SPECIALTIES;
  const lines = list.map(s => `• ${s.name} (${s.uni}): ${s.dorm ? "общежитие есть" : "общежития нет"}`);
  return lines.join("\n");
}

function answerChance(profile: Profile, target?: Specialty): string {
  const list = target ? [target] : SPECIALTIES;
  const lines = list.map(s => {
    const pct = calcChance(s, profile);
    const note = profile.bvi[s.id]
      ? " (БВИ — вне конкурса)"
      : profile.quota !== "none"
        ? ` (с учётом квоты «${QUOTA_LABELS[profile.quota]}»)`
        : "";
    return `• ${s.name}: ${pct}%${note}`;
  });
  const header = profile.saved
    ? "Твои расчётные шансы:"
    : "Ориентировочные шансы по демо-баллам (заполни профиль для точного расчёта):";
  return header + "\n" + lines.join("\n");
}

function answerQuota(): string {
  return "Квоты меняют порог поступления и позицию в списке:\n• Квота МО — целевые места для региона\n• Целевой приём — по договору с работодателем\n• Особая квота — для льготных категорий\nВключи нужную квоту в профиле — калькулятор шансов и конкурсный список пересчитаются автоматически.";
}

function answerBVI(): string {
  return "БВИ (без вступительных испытаний) даёт зачисление вне конкурса при победе/призёрстве в перечневых олимпиадах (ВсОШ, «Высшая проба», олимпиада МФТИ и др.). Отметь БВИ по нужной программе в профиле — шанс станет 99%, а в конкурсном списке ты окажешься в категории «БВИ» на самом верху.";
}

function buildAiAnswer(qRaw: string, profile: Profile): string {
  const q = qRaw.toLowerCase();
  const target = findMentionedSpecialty(qRaw);
  if (q.includes("бви")) return answerBVI();
  if (q.includes("квот")) return answerQuota();
  if (q.includes("шанс") || q.includes("поступлю") || q.includes("пройду")) return answerChance(profile, target);
  if (q.includes("зарплат") || q.includes("трек") || q.includes("junior") || q.includes("middle") || q.includes("senior")) return answerSalary(target);
  if (q.includes("олимп")) return answerOlymp(target);
  if (q.includes("общеж")) return answerDorm(target);
  if (q.includes("балл") || q.includes("проходн")) return answerScores(target);
  if (q.includes("сравн")) return "Открой раздел «Сравнение» — там можно сопоставить любые 2 из 4 программ по баллам, ценам, зарплатам и олимпиадам бок о бок.";
  if (target) return `${target.name} (${target.uni}): проходной балл ${target.scoreGeneral}, зарплата выпускников ~${target.salary}. Спроси про баллы, зарплаты, олимпиады, общежитие, шансы или квоты — отвечу подробнее!`;
  return "Спроси меня про проходные баллы, зарплатные треки, олимпиады, общежития, шансы поступления или квоты — отвечу мгновенно по любой из 4 программ! Выбери подсказку ниже 👇";
}

// ─── Robot AI Copilot ──────────────────────────────────────────────────────────

const PIXEL_ART = [
  ".........BB.........",
  ".........BB.........",
  "......BBBBBBBB......",
  "....BB........BB....",
  "...B............B...",
  "..EB..WWWWWWWW..BE..",
  "..EB.W........W.BE..",
  ".EBB.W.CC..CC.W.BBE.",
  ".EBB.W.CC..CC.W.BBE.",
  "..EB.W........W.BE..",
  "..EB.W...CC...W.BE..",
  "...B..W......W..B...",
  "....B..WWWWWW..B....",
  ".....BB......BB.....",
  ".......BBBBBB.......",
];

const PIXEL_COLORS: Record<string, string> = {
  B: "#0284C7",
  W: "#E2E8F0",
  C: "#38BDF8",
  E: "#33CCFF",
};

function RobotIcon({ size = 32, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 15"
      shapeRendering="crispEdges"
      style={{ display: "block", filter: glow ? "drop-shadow(0 0 4px #38BDF8)" : "none" }}
    >
      {PIXEL_ART.map((row, ri) =>
        row.split("").map((ch, ci) => {
          const fill = PIXEL_COLORS[ch];
          return fill ? <rect key={`${ri}-${ci}`} x={ci} y={ri} width={1} height={1} fill={fill} /> : null;
        })
      )}
    </svg>
  );
}

function AICopilot({
  minimized, onMinimize, onExpand, aiEnabled, onToggleAI, profile,
}: {
  minimized: boolean; onMinimize: () => void; onExpand: () => void;
  aiEnabled: boolean; onToggleAI: () => void; profile: Profile;
}) {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([
    { role: "ai", text: "Привет! Я ИИ-Навигатор Абитуребят. Спроси про баллы, зарплаты, олимпиады, общежития, шансы или квоты — отвечу мгновенно!" },
  ]);
  const [blink, setBlink] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  useEffect(() => {
    if (!minimized) return;
    const t = setInterval(() => setBlink(b => !b), 1200);
    return () => clearInterval(t);
  }, [minimized]);

  const sendMsg = useCallback((text: string) => {
    if (!text.trim()) return;
    const q = text.trim();
    setMsg("");
    setChat(c => [...c, { role: "user", text: q }]);
    setTimeout(() => {
      setChat(c => [...c, { role: "ai", text: buildAiAnswer(q, profile) }]);
    }, 500);
  }, [profile]);

  if (!aiEnabled) return null;

  if (minimized) {
    return (
      <button
        onClick={onExpand}
        title="Открыть ИИ-Навигатор"
        style={{ position: "fixed", bottom: 28, right: 28, width: 68, height: 68, borderRadius: 0, background: "#0F172A", border: "2px solid #00F0FF", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, boxShadow: blink ? "0 0 0 3px rgba(0,240,255,0.3), 0 0 14px rgba(0,240,255,0.4), 4px 4px 0 #0F172A" : "4px 4px 0 #0F172A", zIndex: 50, transition: "box-shadow 0.5s" }}
      >
        <RobotIcon size={40} glow={blink} />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7, color: blink ? "#00F0FF" : "#38BDF8", letterSpacing: "0.08em", fontWeight: 700 }}>ИИ</span>
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 28, right: 28, width: 368, background: "var(--color-surface)", border: "2px solid #1E293B", boxShadow: "6px 6px 0 #0F172A", zIndex: 50, display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#0F172A", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "2px solid #00F0FF" }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{ background: "#1E293B", border: "2px solid #00F0FF", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 8px rgba(0,240,255,0.4)" }}>
            <RobotIcon size={32} glow />
          </div>
          <div style={{ position: "absolute", bottom: -1, right: -1, width: 8, height: 8, background: "#00F0FF", border: "1px solid #0F172A" }} />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "#00F0FF", letterSpacing: "0.06em" }}>ИИ-НАВИГАТОР</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "#38BDF8", letterSpacing: "0.08em", marginTop: 1 }}>
            <span style={{ color: "#00F0FF" }}>▮</span> ОНЛАЙН · АБИТУРЕБЯТА
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onToggleAI} style={{ background: "none", border: "1px solid rgba(0,240,255,0.3)", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", padding: "2px 6px" }}>ВЫКЛ</button>
          <button onClick={onMinimize} style={{ background: "none", border: "1px solid rgba(0,240,255,0.3)", color: "#00F0FF", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "2px 6px", fontFamily: "var(--font-mono)" }}>—</button>
        </div>
      </div>

      <div style={{ height: 240, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 8, background: "#F8FAFC" }}>
        {chat.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 7, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "ai" && (
              <div style={{ flexShrink: 0, background: "#0F172A", border: "1.5px solid #00F0FF", padding: 2, boxShadow: "0 0 5px rgba(0,240,255,0.3)" }}>
                <RobotIcon size={22} glow />
              </div>
            )}
            <div style={{ maxWidth: "80%", padding: "8px 11px", background: m.role === "user" ? "var(--color-violet)" : "white", border: `1.5px solid ${m.role === "user" ? "var(--color-violet)" : "#E2E8F0"}`, color: m.role === "user" ? "white" : "var(--color-ink)", fontFamily: "var(--font-body)", fontSize: 12, lineHeight: 1.55, borderRadius: 0, whiteSpace: "pre-line" }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ borderTop: "2px solid #1E293B", padding: "8px 10px", display: "flex", gap: 4, flexWrap: "wrap", background: "#F1F5F9" }}>
        {AI_QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => sendMsg(p)} style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 600, padding: "3px 8px", background: "white", color: "#1E293B", border: "1.5px solid #CBD5E1", cursor: "pointer", letterSpacing: "0.02em", transition: "all 0.1s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#00F0FF"; (e.currentTarget as HTMLElement).style.color = "#0E7490"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#CBD5E1"; (e.currentTarget as HTMLElement).style.color = "#1E293B"; }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ borderTop: "2px solid #1E293B", display: "flex", background: "#0F172A" }}>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMsg(msg)}
          placeholder="Задай вопрос ИИ-Навигатору..."
          style={{ flex: 1, padding: "10px 12px", border: "none", fontFamily: "var(--font-body)", fontSize: 12, outline: "none", background: "transparent", color: "white" }}
        />
        <button onClick={() => sendMsg(msg)} style={{ padding: "10px 14px", background: "#00F0FF", color: "#0F172A", border: "none", borderLeft: "2px solid #1E293B", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em" }}>
          ОТПРАВИТЬ
        </button>
      </div>
    </div>
  );
}

// ─── 3D Hero Decorations ──────────────────────────────────────────────────────

function HeroDecorations() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {[
        { v: "100", x: "8%", y: "18%", size: 58, color: "#8B5CF6", delay: "0s", dur: "6s" },
        { v: "295", x: "88%", y: "12%", size: 52, color: "#2563EB", delay: "1.5s", dur: "7s" },
        { v: "98", x: "5%", y: "65%", size: 44, color: "#8B5CF6", delay: "3s", dur: "8s" },
        { v: "ЕГЭ", x: "91%", y: "70%", size: 44, color: "#2563EB", delay: "0.8s", dur: "5.5s" },
      ].map((b, i) => (
        <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.size, height: b.size, display: "flex", alignItems: "center", justifyContent: "center", animation: `floatY ${b.dur} ease-in-out ${b.delay} infinite alternate`, opacity: 0.85 }}>
          <div style={{
            width: b.size, height: b.size, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 30%, ${b.color}cc, ${b.color}55)`,
            border: `2px solid ${b.color}`,
            boxShadow: `0 0 20px ${b.color}55, inset 0 -4px 12px rgba(0,0,0,0.3), inset 0 4px 8px rgba(255,255,255,0.15)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: "perspective(80px) rotateX(8deg) rotateY(-6deg)",
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: b.size * 0.28, fontWeight: 900, color: "white", letterSpacing: "0.04em", textShadow: "0 2px 6px rgba(0,0,0,0.4)" }}>
              {b.v}
            </span>
          </div>
        </div>
      ))}

      {[
        { x: "15%", y: "72%", size: 34, rot: "12deg", color: "#8B5CF6", delay: "2s" },
        { x: "82%", y: "45%", size: 28, rot: "-8deg", color: "#2563EB", delay: "0.5s" },
        { x: "72%", y: "80%", size: 22, rot: "20deg", color: "#8B5CF6", delay: "3.5s" },
      ].map((c, i) => (
        <div key={`cube-${i}`} style={{ position: "absolute", left: c.x, top: c.y, animation: `floatY 7s ease-in-out ${c.delay} infinite alternate`, opacity: 0.7 }}>
          <div style={{
            width: c.size, height: c.size,
            background: `linear-gradient(135deg, ${c.color}cc, ${c.color}44)`,
            border: `1.5px solid ${c.color}`,
            boxShadow: `3px 3px 0 ${c.color}55, 0 0 15px ${c.color}33`,
            transform: `perspective(120px) rotateX(20deg) rotateZ(${c.rot})`,
          }} />
        </div>
      ))}

      {[
        { x: "22%", y: "30%", size: 28, color: "#8B5CF6", delay: "1s" },
        { x: "78%", y: "28%", size: 22, color: "#2563EB", delay: "2.8s" },
        { x: "60%", y: "76%", size: 18, color: "#8B5CF6", delay: "0.3s" },
        { x: "38%", y: "82%", size: 16, color: "#2563EB", delay: "4s" },
      ].map((s, i) => (
        <div key={`star-${i}`} style={{ position: "absolute", left: s.x, top: s.y, animation: `floatY 5.5s ease-in-out ${s.delay} infinite alternate, spinSlow 12s linear infinite`, opacity: 0.8 }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24">
            <polygon points="12,1 15,9 23,9 17,14 19,22 12,17 5,22 7,14 1,9 9,9" fill={s.color + "99"} stroke={s.color} strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />
          </svg>
        </div>
      ))}

      {[
        { x: "48%", y: "8%", size: 80, delay: "1.2s" },
        { x: "2%", y: "40%", size: 55, delay: "3s" },
      ].map((r, i) => (
        <div key={`ring-${i}`} style={{ position: "absolute", left: r.x, top: r.y, animation: `floatY 9s ease-in-out ${r.delay} infinite alternate, spinSlow 18s linear infinite`, opacity: 0.25 }}>
          <div style={{ width: r.size, height: r.size, borderRadius: "50%", border: "3px solid", borderColor: "transparent #8B5CF6 #2563EB #8B5CF6", transform: "perspective(100px) rotateX(60deg)" }} />
        </div>
      ))}

      <style>{`
        @keyframes floatY {
          from { transform: translateY(0px); }
          to   { transform: translateY(-18px); }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <button className="flex items-center gap-2" onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
      <div className={`toggle-track ${on ? "on" : ""}`}>
        <div className="toggle-thumb" />
      </div>
      {label && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: on ? "var(--color-violet)" : "var(--color-ink-3)", fontWeight: 600, letterSpacing: "0.04em" }}>{label}</span>}
    </button>
  );
}

function ChanceBadge({ pct, isBvi }: { pct: number | string; isBvi?: boolean }) {
  const bviMode = isBvi === true || pct === "БВИ";

  if (bviMode) {
    const passes = pct === 100 || pct === "100";
    return (
      <span className={passes ? "chance-high" : "chance-low"} style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, padding: "3px 10px", display: "inline-block" }}>
        {passes ? "🟢 100% • Проходит по БВИ" : "🔴 0% • Только БВИ"}
      </span>
    );
  }
  const numPct = typeof pct === "number" ? pct : Number(pct);
  const safePct = Number.isFinite(numPct) ? numPct : 0;

  const cls = safePct >= 75 ? "chance-high" : safePct >= 45 ? "chance-medium" : "chance-low";
  const emoji = safePct >= 75 ? "🟢" : safePct >= 45 ? "🟡" : "🔴";
  return (
    <span className={cls} style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, padding: "3px 10px", display: "inline-block" }}>
      {emoji} {safePct}% шанс
    </span>
  );
}

function Tag({ children, color = "#8B5CF6" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, padding: "2px 7px", background: color + "18", color, border: `1.5px solid ${color}`, display: "inline-block" }}>
      {children}
    </span>
  );
}

function CyberBtn({ children, onClick, variant = "primary", small }: { children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger" | "blue"; small?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "var(--color-ink)", color: "white", border: "2px solid var(--color-border)" },
    secondary: { background: "var(--color-violet)", color: "white", border: "2px solid var(--color-border)" },
    blue: { background: "var(--color-blue)", color: "white", border: "2px solid var(--color-border)" },
    ghost: { background: "var(--color-bg)", color: "var(--color-ink)", border: "2px solid var(--color-border)" },
    danger: { background: "var(--color-red-light)", color: "var(--color-red)", border: "2px solid var(--color-red)" },
  };
  return (
    <button
      onClick={onClick}
      style={{ ...styles[variant], fontFamily: "var(--font-display)", fontSize: small ? 9 : 10, fontWeight: 800, letterSpacing: "0.07em", padding: small ? "5px 10px" : "8px 16px", cursor: "pointer", transition: "all 0.1s" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 var(--color-border)"}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}
    >
      {children}
    </button>
  );
}

// ─── Auth / Guest-mode modals ───────────────────────────────────────────────────

function LoginModal({ onLogin, onClose }: { onLogin: () => void; onClose: () => void }) {
  const [email, setEmail] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.7)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: "28px 30px", width: 340, boxShadow: "6px 6px 0 var(--color-border)" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 900, letterSpacing: "0.06em", marginBottom: 6 }}>ВХОД В АБИТУРЕБЯТА</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-ink-3)", marginBottom: 18, lineHeight: 1.5 }}>
          Демо-режим: введи любую почту, чтобы продолжить как авторизованный пользователь.
        </p>
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: "100%", padding: "10px 12px", border: "2px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 14, outline: "none", background: "var(--color-bg)", color: "var(--color-ink)" }}
        />
        <CyberBtn variant="secondary" onClick={onLogin}>ВОЙТИ →</CyberBtn>
        <div style={{ marginTop: 12 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-3)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Продолжить как гость
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestGateModal({ onLogin, onDemo, onClose }: { onLogin: () => void; onDemo: () => void; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.7)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: "28px 30px", width: 380, boxShadow: "6px 6px 0 var(--color-border)" }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 900, letterSpacing: "0.05em", marginBottom: 8 }}>НУЖНА АВТОРИЗАЦИЯ</div>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-ink-3)", marginBottom: 20, lineHeight: 1.5 }}>
          Чтобы сохранить программу в избранное или изменить баллы в профиле, войди в аккаунт — либо продолжи как гость с демо-баллами (Рус 82 / Мат 91 / Инф 88, ИД +5).
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <CyberBtn variant="secondary" onClick={onLogin}>ВОЙТИ →</CyberBtn>
          <CyberBtn variant="ghost" onClick={onDemo}>ПРИМЕНИТЬ ДЕМО-БАЛЛЫ</CyberBtn>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-3)", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Panel ────────────────────────────────────────────────────────────

interface ProfileLocal {
  rus: string; math: string; info: string;
  achievements: number; quota: Quota; bvi: Record<string, boolean>;
}

function ProfilePanel({
  profile, authed, guestUnlocked, onSave, onClose,
}: {
  profile: Profile;
  authed: boolean;
  guestUnlocked: boolean;
  onSave: (local: ProfileLocal) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<ProfileLocal>({
    rus: profile.rus, math: profile.math, info: profile.info,
    achievements: profile.achievements, quota: profile.quota, bvi: { ...profile.bvi },
  });
  const [justSaved, setJustSaved] = useState(false);
  const total = (Number(local.rus) || 0) + (Number(local.math) || 0) + (Number(local.info) || 0) + local.achievements;

  function save() {
    onSave(local);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  function setAchievements(raw: string) {
    setLocal(l => ({ ...l, achievements: clampAchievements(Number(raw)) }));
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(15,23,42,0.7)" }} onClick={onClose} />
      <div style={{ width: 380, background: "var(--color-surface)", borderLeft: "2px solid var(--color-border)", display: "flex", flexDirection: "column", overflowY: "auto" }}>
        <div style={{ background: "var(--color-ink)", padding: "16px 20px", borderBottom: "2px solid var(--color-violet)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: "white" }}>👨🏻‍💻</div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "white", letterSpacing: "0.05em" }}>МОЙ ПРОФИЛЬ</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#8B5CF6", marginTop: 2 }}>
              {authed ? "abiturient@smile.ru" : "👤 гостевой режим"}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: 20, flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 16 }}>📊 МОИ БАЛЛЫ ЕГЭ</div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-ink-3)", marginBottom: 16, lineHeight: 1.5 }}>
            Введи и сохрани баллы — они автоматически применятся во всех калькуляторах, карточках специальностей и конкурсных списках.
          </p>

          {[
            { key: "rus" as const, label: "Русский язык", max: 100 },
            { key: "math" as const, label: "Математика (профиль)", max: 100 },
            { key: "info" as const, label: "Информатика / доп. предмет", max: 100 },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <label style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-ink-2)" }}>{f.label}</label>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: "var(--color-violet)" }}>{local[f.key] || "0"}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="range" min={0} max={f.max} value={Number(local[f.key]) || 0} onChange={e => setLocal({ ...local, [f.key]: e.target.value })} style={{ flex: 1, accentColor: "var(--color-violet)" }} />
                <input type="number" min={0} max={f.max} value={local[f.key]} onChange={e => setLocal({ ...local, [f.key]: e.target.value })} style={{ width: 48, padding: "4px 6px", border: "2px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, textAlign: "center", background: "var(--color-bg)", outline: "none" }} />
              </div>
            </div>
          ))}

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-ink-2)" }}>
                Индивидуальные достижения (ИД)
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: "var(--color-blue)" }}>+{local.achievements}</span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="range" min={0} max={10} step={1} value={local.achievements} onChange={e => setAchievements(e.target.value)} style={{ flex: 1, accentColor: "var(--color-blue)" }} />
              <input type="number" min={0} max={10} value={local.achievements} onChange={e => setAchievements(e.target.value)} style={{ width: 48, padding: "4px 6px", border: "2px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, textAlign: "center", background: "var(--color-bg)", outline: "none" }} />
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-ink-3)", marginTop: 4 }}>Максимум — 10 баллов, как в реальной шкале ЕГЭ + ИД.</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-ink-2)", marginBottom: 8 }}>Квота при поступлении</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(["none", "mo", "target", "special"] as Quota[]).map(q => (
                <button
                  key={q}
                  onClick={() => setLocal({ ...local, quota: q })}
                  style={{ padding: "6px 10px", border: `2px solid ${local.quota === q ? "var(--color-violet)" : "var(--color-border-soft)"}`, background: local.quota === q ? "var(--color-violet)" : "var(--color-bg)", color: local.quota === q ? "white" : "var(--color-ink-3)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                >
                  {QUOTA_LABELS[q]}
                </button>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-ink-3)", marginTop: 4 }}>Квота меняет проходной порог и позицию в конкурсном списке.</p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--color-ink-2)", marginBottom: 8 }}>
              Наличие БВИ (без вступительных испытаний)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SPECIALTIES.map(sp => (
                <label key={sp.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", border: `2px solid ${local.bvi[sp.id] ? "var(--color-green)" : "var(--color-border-soft)"}`, background: local.bvi[sp.id] ? "var(--color-green-light)" : "var(--color-bg)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!local.bvi[sp.id]}
                    onChange={() => setLocal(l => ({ ...l, bvi: { ...l.bvi, [sp.id]: !l.bvi[sp.id] } }))}
                    style={{ accentColor: "var(--color-green)", width: 14, height: 14 }}
                  />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600 }}>{sp.name}</span>
                </label>
              ))}
            </div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-ink-3)", marginTop: 4 }}>При включённом БВИ шанс становится 99–100%, ты попадаешь в верхнюю категорию списка.</p>
          </div>

          <div style={{ background: "var(--color-ink)", color: "white", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em" }}>СУММА БАЛЛОВ</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: "var(--color-violet)" }}>{total}</span>
          </div>

          <CyberBtn variant="secondary" onClick={save}>
            {justSaved ? "✓ СОХРАНЕНО!" : "💾 СОХРАНИТЬ ПРОФИЛЬ"}
          </CyberBtn>

          {profile.saved && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-green)", marginTop: 10, letterSpacing: "0.04em" }}>
              ✓ Данные сохранены и применены во всех калькуляторах
            </p>
          )}
          {!authed && !guestUnlocked && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-yellow)", marginTop: 10, letterSpacing: "0.02em" }}>
              ⚠ Гостевой режим: при сохранении попросим войти или применить демо-баллы
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

type TopBarProps = {
  aiEnabled: boolean; onToggleAI: () => void;
  profile: Profile; onOpenProfile: () => void;
  authed: boolean; onOpenLogin: () => void;
};

function TopBar({
  onNavigate, title, back, aiEnabled, onToggleAI, profile, onOpenProfile, authed, onOpenLogin,
}: TopBarProps & { onNavigate: (s: Screen) => void; title: string; back?: Screen }) {
  const total = totalEge(profile) + profile.achievements;
  return (
    <header style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 40, flexWrap: "wrap" }}>
      {back && (
        <button onClick={() => onNavigate(back)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "var(--color-ink-3)", padding: 0 }}>
          ← НАЗАД
        </button>
      )}
      <button onClick={() => onNavigate("home")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: "var(--color-ink)", letterSpacing: "0.08em", padding: 0 }}>
        АБИТУ<span style={{ color: "var(--color-violet)" }}>РЕБЯТА</span>
      </button>
      {title && <><div style={{ width: 1, height: 18, background: "var(--color-border-soft)" }} /><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-3)", letterSpacing: "0.05em" }}>{title}</span></>}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Toggle on={aiEnabled} onToggle={onToggleAI} label="БОТ" />
        <div style={{ width: 1, height: 18, background: "var(--color-border-soft)" }} />
        {(["dashboard", "favorites", "compare", "complist"] as Screen[]).map((s, i) => {
          const labels = ["Кабинет", "Избранное", "Сравнение", "Конкурс"];
          return (
            <button key={s} onClick={() => onNavigate(s)} style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", padding: "4px 10px", background: "transparent", color: "var(--color-ink-3)", border: "1.5px solid var(--color-border-soft)", cursor: "pointer" }}>
              {labels[i]}{s === "favorites" && profile.favorites.length > 0 ? ` (${profile.favorites.length})` : ""}
            </button>
          );
        })}
        {!authed && (
          <button onClick={onOpenLogin} style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "5px 12px", background: "var(--color-yellow-light)", color: "#92400E", border: "2px solid var(--color-yellow)", cursor: "pointer" }}>
            ВОЙТИ
          </button>
        )}
        <button
          onClick={onOpenProfile}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 12px", background: profile.saved ? "var(--color-violet)" : "var(--color-ink)", color: "white", border: "2px solid var(--color-border)", cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, letterSpacing: "0.05em" }}
        >
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg, #8B5CF6, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900 }}>👨🏻‍💻</div>
          {profile.saved ? `БАЛЛЫ: ${total}` : "МОЙ ПРОФИЛЬ"}
        </button>
      </div>
    </header>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ onNavigate, aiEnabled, onToggleAI, authed, onOpenLogin }: {
  onNavigate: (s: Screen) => void;
  aiEnabled: boolean; onToggleAI: () => void;
  authed: boolean; onOpenLogin: () => void;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--color-surface)", borderBottom: "2px solid var(--color-border)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", gap: 16, position: "sticky", top: 0, zIndex: 40 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, letterSpacing: "0.08em" }}>
          АБИТУ<span style={{ color: "var(--color-violet)" }}>РЕБЯТА</span>
          <span style={{ color: "var(--color-blue)" }}>_</span>
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <Toggle on={aiEnabled} onToggle={onToggleAI} label="БОТ-РЕБЯТА" />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, padding: "3px 10px", background: authed ? "var(--color-green-light)" : "var(--color-yellow-light)", border: `1.5px solid ${authed ? "var(--color-green)" : "var(--color-yellow)"}`, color: authed ? "#065F46" : "#92400E", fontWeight: 600 }}>
            {authed ? "✓ ВЫ ВОШЛИ" : "👤 ГОСТЕВОЙ РЕЖИМ"}
          </span>
          {!authed && (
            <button
              onClick={onOpenLogin}
              style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", padding: "8px 18px", background: "var(--color-ink)", color: "white", border: "2px solid var(--color-border)", cursor: "pointer" }}
            >
              ВОЙТИ / РЕГИСТРАЦИЯ
            </button>
          )}
        </div>
      </header>

      <div style={{ background: "var(--color-ink)", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 32px", position: "relative", overflow: "hidden", minHeight: 580 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(139,92,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.07) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: -80, right: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 65%)", pointerEvents: "none" }} />

        <HeroDecorations />

        <div style={{ position: "relative", textAlign: "center", maxWidth: 760, zIndex: 2 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-violet)", letterSpacing: "0.25em", marginBottom: 18, fontWeight: 600 }}>
            // УМНЫЙ НАВИГАТОР ДЛЯ АБИТУРИЕНТОВ v1.0
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px, 5.5vw, 60px)", fontWeight: 900, color: "white", margin: "0 0 14px", lineHeight: 1.08, letterSpacing: "0.05em" }}>
            АБИТУ<span style={{ color: "var(--color-violet)", textShadow: "0 0 20px rgba(139,92,246,0.6)" }}>РЕБЯТА</span>
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "#94A3B8", margin: "0 0 52px", lineHeight: 1.6 }}>
            Траектория твоего поступления: от «хочу» до «Я студент»
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, maxWidth: 680, margin: "0 auto" }}>
            {[
              { emoji: "📚", tag: "Я ЕЩЁ УЧУСЬ", title: "10–11 класс", desc: "Профориентационный тест по 4 IT-направлениям и подбор специальностей", cta: "ПРОЙТИ ТЕСТ →", color: "var(--color-violet)", screen: "quiz" as Screen },
              { emoji: "🎯", tag: "Я УЖЕ СДАЛ ЕГЭ", title: "Рассчитать шансы", desc: "Калькулятор баллов, квоты, БВИ, конкурсные списки и шансы поступления", cta: "ВВЕСТИ БАЛЛЫ →", color: "var(--color-blue)", screen: "dashboard" as Screen },
            ].map(c => (
              <button
                key={c.tag}
                onClick={() => onNavigate(c.screen)}
                style={{ background: c.color + "0d", border: `2px solid ${c.color}`, cursor: "pointer", padding: "30px 24px", textAlign: "left", transition: "all 0.15s" }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = c.color + "1e"; el.style.transform = "translate(-2px,-2px)"; el.style.boxShadow = `6px 6px 0 ${c.color}`; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = c.color + "0d"; el.style.transform = "none"; el.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: 42, marginBottom: 14 }}>{c.emoji}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: c.color, letterSpacing: "0.06em", marginBottom: 6 }}>{c.tag}</div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: 15, fontWeight: 700, color: "white", marginBottom: 8 }}>{c.title}</div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#94A3B8", margin: "0 0 18px", lineHeight: 1.55 }}>{c.desc}</p>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 10, color: c.color, letterSpacing: "0.1em" }}>{c.cta}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 44, marginTop: 60, flexWrap: "wrap" }}>
            {[{ n: "4", l: "IT-программы" }, { n: "24/7", l: "AI-навигатор" }, { n: "1 клик", l: "До поступления" }].map(s => (
              <div key={s.l} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-violet)", letterSpacing: "0.04em" }}>{s.n}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#64748B", marginTop: 4, letterSpacing: "0.08em" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz Screen ──────────────────────────────────────────────────────────────

interface QuizOption { text: string; weights: Record<Archetype, number>; }
interface QuizQuestion { q: string; hint?: string; options: QuizOption[]; }

function w(ai: number, swe: number, biz: number, hw: number): Record<Archetype, number> {
  return { ai, swe, biz, hw };
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    q: "Что тебе интереснее всего в IT?",
    hint: "Выбери то, что откликается сильнее всего",
    options: [
      { text: "Обучать нейросети и работать с данными", weights: w(2, 0, 0, 0) },
      { text: "Писать эффективный код и решать алгоритмические задачи", weights: w(0, 2, 0, 0) },
      { text: "Понимать, как IT помогает бизнесу зарабатывать", weights: w(0, 0, 2, 0) },
      { text: "Разбираться в железе, сетях и системах", weights: w(0, 0, 0, 2) },
    ],
  },
  {
    q: "Какой проект тебя вдохновляет?",
    options: [
      { text: "Голосовой ассистент или генератор изображений", weights: w(2, 0, 0, 0) },
      { text: "Высоконагруженный сервис на миллион пользователей", weights: w(0, 2, 0, 0) },
      { text: "Стартап, автоматизирующий бизнес-процессы", weights: w(0, 0, 2, 0) },
      { text: "Робот или встроенная система (IoT)", weights: w(0, 0, 0, 2) },
    ],
  },
  {
    q: "Как ты относишься к математике?",
    hint: "Честно!",
    options: [
      { text: "Обожаю линейную алгебру и статистику", weights: w(2, 1, 0, 0) },
      { text: "Люблю дискретную математику и алгоритмы", weights: w(0, 2, 0, 1) },
      { text: "Достаточно, чтобы считать метрики и юнит-экономику", weights: w(0, 0, 2, 0) },
      { text: "Больше интересует физика и электроника", weights: w(0, 0, 0, 2) },
    ],
  },
  {
  q: "В команде проекта ты обычно...",
  options: [
      { text: "Анализируешь данные, ищешь закономерности и работаешь с алгоритмами", weights: w(2, 0, 0, 0) },
      { text: "Пишешь логику программы, код и настраиваешь её работу", weights: w(0, 2, 0, 0) },
      { text: "Придумываешь концепцию, оформляешь презентацию и защищаешь идею", weights: w(0, 0, 2, 0) },
      { text: "Работаешь с железом, собираешь схемы и настраиваешь оборудование", weights: w(0, 0, 0, 2) },
    ],
  },
  {
    q: "Какой контент ты бы с радостью посмотрел?",
    options: [
      { text: "Про машинное обучение и нейросети", weights: w(2, 0, 0, 0) },
      { text: "Про алгоритмы и системный дизайн", weights: w(0, 2, 0, 0) },
      { text: "Про менеджмент продукта и стартапы", weights: w(0, 0, 2, 0) },
      { text: "Про компьютерные сети и архитектуру процессоров", weights: w(0, 0, 0, 2) },
    ],
  },
  {
    q: "Что важнее в будущей работе?",
    options: [
      { text: "Передовые исследования в области ИИ", weights: w(2, 0, 0, 0) },
      { text: "Чистый код и надёжные системы", weights: w(0, 2, 0, 0) },
      { text: "Влияние на бизнес-показатели компании", weights: w(0, 0, 2, 0) },
      { text: "Работа с реальным железом и низкоуровневыми системами", weights: w(0, 0, 0, 2) },
    ],
  },
  {
    q: "Твой любимый предмет в школе?",
    options: [
      { text: "Информатика + теория вероятностей", weights: w(2, 0, 0, 0) },
      { text: "Информатика + профильная математика", weights: w(0, 2, 0, 0) },
      { text: "Обществознание/экономика + математика", weights: w(0, 0, 2, 0) },
      { text: "Физика + информатика", weights: w(0, 0, 0, 2) },
    ],
  },
  {
    q: "Где ты видишь себя после вуза?",
    options: [
      { text: "Data Scientist / AI-инженер в исследовательской команде", weights: w(3, 0, 0, 0) },
      { text: "Software Engineer в продуктовой IT-компании", weights: w(0, 3, 0, 0) },
      { text: "Бизнес-аналитик / продакт-менеджер в IT", weights: w(0, 0, 3, 0) },
      { text: "Системный инженер / инженер по железу и сетям", weights: w(0, 0, 0, 3) },
    ],
  },
];

function QuizScreen({ onNavigate, topBarProps }: { onNavigate: (s: Screen, data?: unknown) => void; topBarProps: TopBarProps }) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<Archetype, number>>({ ai: 0, swe: 0, biz: 0, hw: 0 });
  const done = step >= QUIZ_QUESTIONS.length;
  const current = QUIZ_QUESTIONS[step];

  function pickAnswer(opt: QuizOption) {
    setScores(s => ({ ai: s.ai + opt.weights.ai, swe: s.swe + opt.weights.swe, biz: s.biz + opt.weights.biz, hw: s.hw + opt.weights.hw }));
    setStep(s => s + 1);
  }

  const ranked = [...SPECIALTIES].sort((a, b) => scores[b.archetype] - scores[a.archetype]);
  const top = ranked[0];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TopBar {...topBarProps} title="ПРОФОРИЕНТАЦИОННЫЙ ТЕСТ" onNavigate={onNavigate} />
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "40px 24px" }}>
        {!done ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-3)", fontWeight: 600, letterSpacing: "0.06em" }}>
                ВОПРОС {step + 1} / {QUIZ_QUESTIONS.length}
              </span>
              <div style={{ display: "flex", gap: 3 }}>
                {QUIZ_QUESTIONS.map((_, i) => (
                  <div key={i} style={{ width: 24, height: 4, background: i < step ? "var(--color-violet)" : i === step ? "var(--color-blue)" : "var(--color-border-soft)" }} />
                ))}
              </div>
            </div>

            <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: "36px 32px" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, marginBottom: 8, lineHeight: 1.3, letterSpacing: "0.03em" }}>{current.q}</h2>
              {current.hint ? <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-ink-3)", marginBottom: 24, marginTop: 4 }}>{current.hint}</p> : <div style={{ marginBottom: 24 }} />}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {current.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => pickAnswer(opt)}
                    style={{ textAlign: "left", padding: "13px 18px", background: "var(--color-bg)", border: "2px solid var(--color-border)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-ink)", fontWeight: 500, transition: "all 0.12s", display: "flex", alignItems: "center", gap: 12 }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--color-violet)"; el.style.background = "var(--color-violet-light)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--color-border)"; el.style.background = "var(--color-bg)"; }}
                  >
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-violet)", fontWeight: 800, minWidth: 20 }}>0{i + 1}</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: "48px 36px", textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-violet)", letterSpacing: "0.05em", marginBottom: 14 }}>АНАЛИЗ ЗАВЕРШЁН</h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 15, color: "var(--color-ink-2)", marginBottom: 4 }}>
              Твоё лучшее совпадение:
            </p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: "var(--color-ink)", marginBottom: 24 }}>
              {top.name} <span style={{ color: "var(--color-ink-3)", fontWeight: 600, fontSize: 13 }}>({top.uni})</span>
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, textAlign: "left" }}>
              {ranked.map((sp, i) => (
                <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: i === 0 ? "var(--color-violet-light)" : "var(--color-bg)", border: `1.5px solid ${i === 0 ? "var(--color-violet)" : "var(--color-border-soft)"}` }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: i === 0 ? "var(--color-violet)" : "var(--color-ink-3)" }}>#{i + 1}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600, flex: 1 }}>{sp.name}</span>
                  <Tag color={i === 0 ? "#8B5CF6" : "#64748B"}>совпадение {scores[sp.archetype]}</Tag>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => onNavigate("specialty", top.id)}
                style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", padding: "14px 32px", background: "var(--color-violet)", color: "white", border: "2px solid var(--color-border)", cursor: "pointer", boxShadow: "4px 4px 0 var(--color-border)" }}
              >
                ПЕРЕЙТИ К СПЕЦИАЛЬНОСТИ →
              </button>
              <CyberBtn variant="ghost" onClick={() => onNavigate("dashboard")}>ВСЕ ПРОГРАММЫ</CyberBtn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Specialty Card ────────────────────────────────────────────────────────────

function SpecialtyCard({
  sp, profile, onView, onAskRobot, favorite, onToggleFavorite, compareSelected, onToggleCompare,
}: {
  sp: Specialty; profile: Profile; onView: () => void; onAskRobot: () => void;
  favorite: boolean; onToggleFavorite: () => void;
  compareSelected: boolean; onToggleCompare: () => void;
}) {
  const total = effectiveTotal(profile);
  const chance = calcChance(sp, profile);
  const bvi = !!profile.bvi[sp.id];

  return (
    <div
      style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: "20px 22px", cursor: "pointer", transition: "all 0.12s" }}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "4px 4px 0 var(--color-border)"; el.style.transform = "translate(-2px,-2px)"; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.boxShadow = "none"; el.style.transform = "none"; }}
      onClick={onView}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)", fontWeight: 600 }}>{sp.code}</span>
            <ChanceBadge pct={chance} />
            {bvi && <Tag color="#10B981">🏅 БВИ</Tag>}
            {!bvi && profile.quota !== "none" && <Tag color="#8B5CF6">{QUOTA_LABELS[profile.quota]}</Tag>}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, letterSpacing: "0.03em", marginBottom: 3 }}>{sp.name}</div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-ink-3)" }}>{sp.uni}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)", marginBottom: 2 }}>Порог / Мои</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900 }}>
            <span style={{ color: "var(--color-ink-3)" }}>{profile.quota !== "none" ? sp.scoreQuota : sp.scoreGeneral}</span>
            <span style={{ color: "var(--color-border-soft)", margin: "0 3px" }}>/</span>
            <span style={{ color: total >= (profile.quota !== "none" ? sp.scoreQuota : sp.scoreGeneral) ? "var(--color-green)" : "var(--color-red)" }}>{total}</span>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--color-ink-2)", lineHeight: 1.5, marginBottom: 12 }}>
        {sp.desc}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {sp.grades.map(g => (
          <div key={g.level} style={{ flex: 1, textAlign: "center", background: "var(--color-bg)", border: "1.5px solid var(--color-border)", padding: "6px 4px" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-ink-3)", letterSpacing: "0.04em", marginBottom: 2 }}>{g.level}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "var(--color-green)" }}>{g.salary}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {sp.stack.map(t => <Tag key={t} color="#2563EB">{t}</Tag>)}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }} onClick={e => e.stopPropagation()}>
        <CyberBtn small variant={favorite ? "secondary" : "ghost"} onClick={onToggleFavorite}>{favorite ? "❤ В ИЗБРАННОМ" : "🤍 В ИЗБРАННОЕ"}</CyberBtn>
        <button
          onClick={onToggleCompare}
          style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, letterSpacing: "0.05em", padding: "5px 10px", background: compareSelected ? "var(--color-blue)" : "var(--color-bg)", color: compareSelected ? "white" : "var(--color-ink)", border: "2px solid var(--color-border)", cursor: "pointer" }}
        >
          {compareSelected ? "✓ ДЛЯ СРАВНЕНИЯ" : "⇄ СРАВНИТЬ"}
        </button>
        <CyberBtn small variant="blue" onClick={onAskRobot}>🤖 СПРОСИТЬ ИИ</CyberBtn>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardScreen({
  onNavigate, topBarProps, onAskRobot, profile, compareIds, onToggleCompare, onToggleFavorite,
}: {
  onNavigate: (s: Screen, data?: unknown) => void;
  topBarProps: TopBarProps;
  onAskRobot: () => void;
  profile: Profile;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const total = effectiveTotal(profile);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TopBar {...topBarProps} title="МОЙ КАБИНЕТ" onNavigate={onNavigate} />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px" }}>

        {profile.saved ? (
          <div style={{ background: "var(--color-ink)", border: "2px solid var(--color-border)", padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "white", letterSpacing: "0.06em" }}>📊 МОИ БАЛЛЫ:</div>
            {[{ l: "Рус", v: profile.rus || "0" }, { l: "Мат", v: profile.math || "0" }, { l: "Инф", v: profile.info || "0" }, { l: "ИД", v: "+" + profile.achievements }].map(s => (
              <div key={s.l} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#64748B" }}>{s.l}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900, color: "var(--color-violet)" }}>{s.v}</span>
              </div>
            ))}
            {profile.quota !== "none" && <Tag color="#8B5CF6">{QUOTA_LABELS[profile.quota]}</Tag>}
            <div style={{ marginLeft: "auto", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-violet)" }}>
              {total} <span style={{ fontSize: 12, color: "#64748B" }}>/ 310</span>
            </div>
            <button onClick={topBarProps.onOpenProfile} style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "6px 14px", background: "rgba(139,92,246,0.2)", color: "var(--color-violet)", border: "1.5px solid var(--color-violet)", cursor: "pointer" }}>
              ИЗМЕНИТЬ
            </button>
          </div>
        ) : (
          <div style={{ border: "2px dashed var(--color-violet)", padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-violet-light)", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: "var(--color-violet-dark)", letterSpacing: "0.05em", marginBottom: 2 }}>ВВЕДИ СВОИ БАЛЛЫ ЕГЭ</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-ink-2)" }}>Пока показываем ориентировочные демо-баллы. Сохрани свои — они применятся везде.</div>
            </div>
            <CyberBtn variant="secondary" onClick={topBarProps.onOpenProfile}>ЗАПОЛНИТЬ ПРОФИЛЬ →</CyberBtn>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span>💼 СПЕЦИАЛЬНОСТИ ДЛЯ ТЕБЯ</span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)" }}>Выбрано для сравнения: {compareIds.length}/2</span>
              <button onClick={() => onNavigate("compare")} style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", padding: "6px 14px", background: "var(--color-blue)", color: "white", border: "2px solid var(--color-border)", cursor: "pointer" }}>
                ⇄ СРАВНИТЬ ВЫБРАННЫЕ
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {SPECIALTIES.map(sp => (
              <SpecialtyCard
                key={sp.id}
                sp={sp}
                profile={profile}
                favorite={profile.favorites.includes(sp.id)}
                compareSelected={compareIds.includes(sp.id)}
                onView={() => onNavigate("specialty", sp.id)}
                onToggleFavorite={() => onToggleFavorite(sp.id)}
                onToggleCompare={() => onToggleCompare(sp.id)}
                onAskRobot={onAskRobot}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Избранные ─────────────────────────────────────────────────────────

function FavoritesScreen({
  onNavigate, topBarProps, onAskRobot, profile, compareIds, onToggleCompare, onToggleFavorite,
}: {
  onNavigate: (s: Screen, data?: unknown) => void;
  topBarProps: TopBarProps;
  onAskRobot: () => void;
  profile: Profile;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const list = SPECIALTIES.filter(sp => profile.favorites.includes(sp.id));

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TopBar {...topBarProps} title="ИЗБРАННОЕ" onNavigate={onNavigate} back="dashboard" />
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "28px 24px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 16 }}>❤ СОХРАНЁННЫЕ СПЕЦИАЛЬНОСТИ</div>
        {list.length === 0 ? (
          <div style={{ border: "2px dashed var(--color-border-soft)", padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🤍</div>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-ink-3)", marginBottom: 16 }}>
              Пока нет сохранённых программ. Нажми «В избранное» на карточке специальности, чтобы добавить.
            </p>
            <CyberBtn variant="secondary" onClick={() => onNavigate("dashboard")}>К СПИСКУ СПЕЦИАЛЬНОСТЕЙ</CyberBtn>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {list.map(sp => (
              <SpecialtyCard
                key={sp.id}
                sp={sp}
                profile={profile}
                favorite
                compareSelected={compareIds.includes(sp.id)}
                onView={() => onNavigate("specialty", sp.id)}
                onToggleFavorite={() => onToggleFavorite(sp.id)}
                onToggleCompare={() => onToggleCompare(sp.id)}
                onAskRobot={onAskRobot}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Специальность ─────────────────────────────────────────────────────────

function SpecialtyScreen({
  sp, onNavigate, topBarProps, onAskRobot, profile, onToggleFavorite, onGoCompare,
}: {
  sp: Specialty; onNavigate: (s: Screen) => void; topBarProps: TopBarProps; onAskRobot: () => void;
  profile: Profile; onToggleFavorite: (id: string) => void; onGoCompare: (id: string) => void;
}) {
  const [tab, setTab] = useState<"overview" | "olymp" | "jobs">("overview");
  const total = effectiveTotal(profile);
  const chance = calcChance(sp, profile);
  const bvi = !!profile.bvi[sp.id];
  const favorite = profile.favorites.includes(sp.id);

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)", paddingBottom: 120 }}>
      <TopBar {...topBarProps} title={sp.name.toUpperCase()} onNavigate={onNavigate} back="dashboard" />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "28px 24px" }}>

        <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", borderLeft: "6px solid var(--color-violet)", padding: "24px 28px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <Tag color="#8B5CF6">{sp.code}</Tag>
                <ChanceBadge pct={chance} />
                {sp.dorm && <Tag color="#10B981">🏠 Общежитие есть</Tag>}
                {bvi && <Tag color="#10B981">🏅 БВИ</Tag>}
                {!bvi && profile.quota !== "none" && <Tag color="#8B5CF6">{QUOTA_LABELS[profile.quota]}</Tag>}
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 900, letterSpacing: "0.04em", margin: "0 0 4px" }}>{sp.name}</h1>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-ink-2)", margin: "0 0 10px" }}>{sp.uni}</p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-ink-2)", lineHeight: 1.55, maxWidth: 500 }}>{sp.desc}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)", marginBottom: 2 }}>ЗП ВЫПУСКНИКОВ</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 900, color: "var(--color-green)", marginBottom: 12 }}>{sp.salary}</div>
              <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
                {sp.grades.map(g => (
                  <div key={g.level} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "5px 10px", background: "var(--color-bg)", border: "1.5px solid var(--color-border)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)" }}>{g.level}</span>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: "var(--color-green)" }}>{g.salary}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginTop: 20 }}>
            {[
              { l: "Бюджетных мест (общий + квоты)", v: `${sp.budgetGeneral} + ${sp.budgetQuota}` },
              { l: "Проходной балл", v: profile.quota !== "none" ? `${sp.scoreQuota} (квота)` : sp.scoreGeneral },
              { l: "Платное / год", v: `${(sp.paid / 1000).toFixed(0)} тыс. ₽` },
              { l: "Мои баллы (ЕГЭ+ИД)", v: total },
            ].map(s => (
              <div key={s.l} style={{ background: "var(--color-bg)", border: "2px solid var(--color-border)", padding: "12px 14px" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--color-ink-3)", marginBottom: 3, letterSpacing: "0.06em" }}>{s.l}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 900 }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "2px solid var(--color-border)", marginBottom: 16 }}>
          {(["overview", "olymp", "jobs"] as const).map((t, i) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", padding: "11px 22px", background: tab === t ? "var(--color-ink)" : "transparent", color: tab === t ? "white" : "var(--color-ink-3)", border: "none", borderRight: i < 2 ? "2px solid var(--color-border)" : "none", cursor: "pointer" }}>
              {t === "overview" ? "📋 ПРОГРАММА" : t === "olymp" ? "🏆 ОЛИМПИАДЫ" : "💼 КАРЬЕРА"}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: 22 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 14 }}>🔬 ИЗУЧАЕМЫЕ ПРЕДМЕТЫ</div>
              {sp.subjectsStudy.map((s, i, arr) => (
                <div key={s} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-surface-2)" : "none", alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-violet)", fontWeight: 700, width: 18 }}>{String(i + 1).padStart(2, "0")}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 13 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 12 }}>💻 ТЕХНОЛОГИЧЕСКИЙ СТЕК</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[...sp.stack, "Git", "Linux"].map(t => <Tag key={t} color="#2563EB">{t}</Tag>)}</div>
              </div>
              <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: 20 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 12 }}>📝 ЕГЭ ДЛЯ ПОСТУПЛЕНИЯ</div>
                {sp.subjects.map((s, i) => (
                  <div key={s} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: i < sp.subjects.length - 1 ? "1px solid var(--color-surface-2)" : "none", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-blue)", fontWeight: 700 }}>#{i + 1}</span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "olymp" && (
          <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: 22 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 18 }}>🏆 ОЛИМПИАДЫ ДЛЯ ПОСТУПЛЕНИЯ</div>
            {sp.olympiads.map((o, i) => (
              <div key={o.name} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 16, alignItems: "center", padding: "12px 0", borderBottom: i < sp.olympiads.length - 1 ? "1px solid var(--color-surface-2)" : "none" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 600 }}>{o.name}</span>
                <Tag color="#8B5CF6">{o.level}</Tag>
                <Tag color="#10B981">{o.bonus}</Tag>
              </div>
            ))}
          </div>
        )}

        {tab === "jobs" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {sp.careers.map(j => (
              <div key={j.role} style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: 18 }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, letterSpacing: "0.03em", marginBottom: 6 }}>{j.role}</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 900, color: "var(--color-green)", marginBottom: 8 }}>{j.salary}</div>
                <Tag color="#10B981">Спрос: {j.demand}</Tag>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <CyberBtn variant={favorite ? "secondary" : "ghost"} onClick={() => onToggleFavorite(sp.id)}>{favorite ? "❤ В ИЗБРАННОМ" : "🤍 В ИЗБРАННОЕ"}</CyberBtn>
          <CyberBtn variant="blue" onClick={() => onGoCompare(sp.id)}>⇄ СРАВНИТЬ С ДРУГОЙ СПЕЦИАЛЬНОСТЬЮ</CyberBtn>
          <CyberBtn variant="ghost" onClick={() => onNavigate("complist")}>📋 КОНКУРСНЫЙ СПИСОК</CyberBtn>
          <CyberBtn variant="secondary" onClick={onAskRobot}>🤖 СПРОСИТЬ ИИ</CyberBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Сравнение ───────────────────────────────────────────────────────────

function CompareScreen({ onNavigate, topBarProps, profile, compareIds, onSetCompareIds }: {
  onNavigate: (s: Screen) => void; topBarProps: TopBarProps; profile: Profile;
  compareIds: string[]; onSetCompareIds: (ids: string[]) => void;
}) {
  const idA = compareIds[0] || SPECIALTIES[0].id;
  const idB = compareIds[1] || SPECIALTIES[1].id;
  const A = SPECIALTIES.find(s => s.id === idA) || SPECIALTIES[0];
  const B = SPECIALTIES.find(s => s.id === idB) || SPECIALTIES[1];

  function pick(which: "a" | "b", id: string) {
    const next = which === "a" ? [id, idB] : [idA, id];
    onSetCompareIds(next[0] === next[1] ? (which === "a" ? [id, SPECIALTIES.find(s => s.id !== id)!.id] : [SPECIALTIES.find(s => s.id !== id)!.id, id]) : next);
  }

  const rows = [
    { label: "Название", a: A.name, b: B.name },
    { label: "Вуз", a: A.uni, b: B.uni },
    { label: "Проходной балл (общий)", a: String(A.scoreGeneral), b: String(B.scoreGeneral) },
    { label: "Проходной балл (квота)", a: String(A.scoreQuota), b: String(B.scoreQuota) },
    { label: "Бюджетных мест", a: `${A.budgetGeneral} + ${A.budgetQuota}`, b: `${B.budgetGeneral} + ${B.budgetQuota}` },
    { label: "Стоимость (год)", a: `${(A.paid / 1000).toFixed(0)} тыс. ₽`, b: `${(B.paid / 1000).toFixed(0)} тыс. ₽` },
    { label: "Общежитие", a: A.dorm ? "✅ Есть" : "❌ Нет", b: B.dorm ? "✅ Есть" : "❌ Нет" },
    { label: "ЗП выпускников", a: A.salary, b: B.salary },
    { label: "Мой шанс", a: `${calcChance(A, profile)}%`, b: `${calcChance(B, profile)}%` },
    { label: "Олимпиады", a: `${A.olympiads.length} направлений`, b: `${B.olympiads.length} направлений` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TopBar {...topBarProps} title="СРАВНЕНИЕ ПРОГРАММ" onNavigate={onNavigate} back="dashboard" />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>

        <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
          <select value={idA} onChange={e => pick("a", e.target.value)} style={{ flex: 1, minWidth: 200, padding: "10px 12px", border: "2px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--color-surface)" }}>
            {SPECIALTIES.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
          <select value={idB} onChange={e => pick("b", e.target.value)} style={{ flex: 1, minWidth: 200, padding: "10px 12px", border: "2px solid var(--color-border)", fontFamily: "var(--font-mono)", fontSize: 12, background: "var(--color-surface)" }}>
            {SPECIALTIES.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr" }}>
          <div style={{ background: "var(--color-bg)", border: "2px solid var(--color-border)", borderRight: "none", borderBottom: "none", padding: "18px 14px", display: "flex", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "var(--color-ink-3)" }}>КРИТЕРИЙ</span>
          </div>
          {[{ sp: A, stripe: "stripe-violet" }, { sp: B, stripe: "stripe-blue" }].map(({ sp, stripe }, ci) => (
            <div key={sp.id} className={stripe} style={{ padding: "18px 18px", border: "2px solid var(--color-border)", borderRight: ci === 1 ? "2px solid var(--color-border)" : "none" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.65)", letterSpacing: "0.1em", marginBottom: 3 }}>{sp.code}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, color: "white", letterSpacing: "0.04em" }}>{sp.name}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 3 }}>{sp.uni}</div>
            </div>
          ))}
        </div>

        {rows.map((row, i) => (
          <div key={row.label} style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr" }}>
            <div style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-bg)", border: "2px solid var(--color-border)", borderRight: "none", borderTop: "none", padding: "12px 14px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-ink-3)", letterSpacing: "0.03em" }}>{row.label}</span>
            </div>
            {[row.a, row.b].map((v, ci) => (
              <div key={ci} style={{ background: i % 2 === 0 ? "var(--color-surface)" : "var(--color-bg)", border: "2px solid var(--color-border)", borderRight: ci === 1 ? "2px solid var(--color-border)" : "none", borderTop: "none", padding: "12px 18px" }}>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, fontWeight: row.label.includes("шанс") ? 800 : 500, color: row.label.includes("шанс") ? "var(--color-green)" : "var(--color-ink)" }}>{v}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr" }}>
          <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", borderRight: "none", borderTop: "none", padding: "12px 14px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--color-ink-3)" }}>Технологии</span>
          </div>
          {[A, B].map((sp, i) => (
            <div key={sp.id} style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", borderRight: i === 1 ? "2px solid var(--color-border)" : "none", borderTop: "none", padding: "12px 18px" }}>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{sp.stack.map(t => <Tag key={t} color={i === 0 ? "#8B5CF6" : "#2563EB"}>{t}</Tag>)}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <CyberBtn variant="primary" onClick={() => onNavigate("dashboard")}>← ВЕРНУТЬСЯ К СПИСКУ</CyberBtn>
        </div>
      </div>
    </div>
  );
}

// ─── Конкурсный список ─────────────────────────────────────────────────────────

function CompListScreen({ onNavigate, topBarProps, profile, initialId }: {
  onNavigate: (s: Screen) => void; topBarProps: TopBarProps; profile: Profile; initialId: string;
}) {
  const [spId, setSpId] = useState(initialId);
  const [hidePhantoms, setHidePhantoms] = useState(false);
  const sp = SPECIALTIES.find(s => s.id === spId) || SPECIALTIES[0];

  const fullList = buildFullList(sp, profile);
  const budgetSeats = sp.budgetGeneral + sp.budgetQuota;
  const list = hidePhantoms ? fullList.filter(c => !c.isPhantom || c.isMe) : fullList;
  const myRealPos = list.findIndex(c => c.isMe) + 1;
  const inBudget = myRealPos > 0 && myRealPos <= budgetSeats;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <TopBar {...topBarProps} title="КОНКУРСНЫЙ СПИСОК" onNavigate={onNavigate} back="dashboard" />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "28px 24px" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {SPECIALTIES.map(s => (
            <button key={s.id} onClick={() => setSpId(s.id)} style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, letterSpacing: "0.04em", padding: "7px 12px", background: spId === s.id ? "var(--color-ink)" : "var(--color-surface)", color: spId === s.id ? "white" : "var(--color-ink-3)", border: "2px solid var(--color-border)", cursor: "pointer" }}>
              {s.name}
            </button>
          ))}
        </div>

        <div style={{ background: "var(--color-surface)", border: "2px solid var(--color-border)", padding: "18px 22px", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 4 }}>{sp.name} — {sp.uni}</div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[`🎓 Бюджет: ${budgetSeats} мест (${sp.budgetGeneral} общий + ${sp.budgetQuota} квоты)`, `👥 Всего заявок: ${fullList.length}`, "Обновлено: 16 сен 2026"].map(t => (
                <span key={t} style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-ink-3)" }}>{t}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => setHidePhantoms(!hidePhantoms)}
            style={{ background: hidePhantoms ? "var(--color-violet)" : "var(--color-ink)", border: "2px solid var(--color-border)", padding: "14px 18px", cursor: "pointer", textAlign: "center", boxShadow: "4px 4px 0 var(--color-border)", transition: "all 0.15s" }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", marginBottom: 3 }}>{hidePhantoms ? "● ВКЛЮЧЕНО" : "○ ВЫКЛЮЧЕНО"}</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 800, color: "white", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>👻 СКРЫТЬ ФАНТОМОВ</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>Реальные шансы</div>
          </button>
        </div>

        {hidePhantoms && myRealPos > 0 && (
          <div style={{ background: inBudget ? "var(--color-green)" : "var(--color-red)", border: "2px solid var(--color-border)", padding: "14px 22px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "4px 4px 0 var(--color-border)" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 900, color: "white", letterSpacing: "0.06em", marginBottom: 2 }}>🎯 ВАША РЕАЛЬНАЯ ПОЗИЦИЯ</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>{inBudget ? "Вы в зоне бюджета! Высокие шансы поступления." : "Пока не в зоне бюджета — нужно увеличить баллы, квоту или БВИ."}</div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 900, color: "white" }}>
              {myRealPos} <span style={{ fontSize: 14, opacity: 0.8 }}>из {list.length}</span>
            </div>
          </div>
        )}

        <div style={{ border: "2px solid var(--color-border)", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "38px 148px 100px 64px 54px 110px 82px 76px", minWidth: 720, background: "var(--color-ink)", padding: "9px 12px", gap: 6 }}>
            {["№", "№ ЗАЯВЛЕНИЯ", "СУММА БАЛЛОВ", "ЕГЭ", "ИД", "КАТЕГОРИЯ", "ПРИОРИТЕТ", "СОГЛАСИЕ"].map((h, hi) => (
              <div key={hi} style={{ fontFamily: "var(--font-display)", fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.07em" }}>{h}</div>
            ))}
          </div>

          {list.map((c, i) => {
            const isMe = !!c.isMe;
            const isPhantom = c.isPhantom && !isMe;
            // Разделитель ставим строго перед позицией №budgetSeats (индекс budgetSeats-1),
            // привязываясь к позиции в списке, а не к ссылке на объект — так после
            // сортировки строка-маркер всегда оказывается ровно перед 10-й позицией.
            const isBudgetLine = !hidePhantoms && i === budgetSeats - 1;
            return (
              <div key={c.snils + i}>
                {isBudgetLine && (
                  <div style={{ padding: "5px 12px", background: "#DCFCE7", borderTop: "2px dashed var(--color-green)", borderBottom: "2px dashed var(--color-green)", minWidth: 720 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 9, fontWeight: 800, color: "var(--color-green)", letterSpacing: "0.1em" }}>↓ ПОСЛЕДНЕЕ БЮДЖЕТНОЕ МЕСТО ({budgetSeats})</span>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "38px 148px 100px 64px 54px 110px 82px 76px", minWidth: 720, padding: "9px 12px", gap: 6, alignItems: "center", background: isMe ? "rgba(139,92,246,0.07)" : isPhantom ? "rgba(239,68,68,0.04)" : i % 2 === 0 ? "var(--color-surface)" : "var(--color-bg)", borderBottom: "1px solid var(--color-surface-2)", borderLeft: `4px solid ${isMe ? "var(--color-violet)" : isPhantom ? "rgba(239,68,68,0.3)" : "transparent"}` }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: isMe ? "var(--color-violet)" : "var(--color-ink-3)" }}>{hidePhantoms ? i + 1 : i + 1}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: isMe ? 800 : 400, color: isMe ? "var(--color-violet)" : "var(--color-ink)", display: "flex", alignItems: "center", gap: 5 }}>
                    {c.snils}
                    {isPhantom && !hidePhantoms && <Tag color="#EF4444">👻</Tag>}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 900, color: isMe ? "var(--color-violet)" : "var(--color-ink)" }}>{c.total}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>{c.ege}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: c.achievements > 0 ? "var(--color-blue)" : "var(--color-ink-3)" }}>+{c.achievements}</div>
                  <div>
                    {c.category === "Общий конкурс"
                      ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)" }}>—</span>
                      : <Tag color={CATEGORY_COLOR[c.category]}>{c.category}</Tag>}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: c.priority === 1 ? "var(--color-violet)" : "var(--color-ink-3)", fontWeight: c.priority === 1 ? 700 : 400 }}>
                    {c.priority === 1 ? "★ 1-й" : `${c.priority}-й`}
                  </div>
                  <div>
                    {isMe
                      ? <Tag color="#8B5CF6">ВЫ ✓</Tag>
                      : c.consent
                        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-green)", fontWeight: 700 }}>✓ Да</span>
                        : <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-ink-3)" }}>Нет</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 22 }}>
          <CyberBtn variant="primary" onClick={() => onNavigate("dashboard")}>← НАЗАД К КАБИНЕТУ</CyberBtn>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [specialtyId, setSpecialtyId] = useState<string>(SPECIALTIES[0].id);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [authed, setAuthed] = useState(false);
  const [guestUnlocked, setGuestUnlocked] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [gate, setGate] = useState<{ open: boolean; pending?: () => void }>({ open: false });
  const [compareIds, setCompareIds] = useState<string[]>([SPECIALTIES[0].id, SPECIALTIES[1].id]);

  function navigate(s: Screen, data?: unknown) {
    if (s === "specialty" && typeof data === "string") setSpecialtyId(data);
    setScreen(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function requireAuth(action: () => void) {
    if (authed || guestUnlocked) { action(); return; }
    setGate({ open: true, pending: action });
  }

  function handleLogin() {
    setAuthed(true);
    setLoginOpen(false);
  }

  function handleGateLogin() {
    const pending = gate.pending;
    setAuthed(true);
    setGate({ open: false });
    pending?.();
  }

  function handleGateDemo() {
    const pending = gate.pending;
    setProfile(pr => ({ ...pr, rus: "82", math: "91", info: "88", achievements: 5, saved: true }));
    setGuestUnlocked(true);
    setGate({ open: false });
    pending?.();
  }

  function toggleFavorite(id: string) {
    requireAuth(() => {
      setProfile(pr => ({
        ...pr,
        favorites: pr.favorites.includes(id) ? pr.favorites.filter(x => x !== id) : [...pr.favorites, id],
      }));
    });
  }

  function saveProfile(local: ProfileLocal) {
    requireAuth(() => {
      setProfile(pr => ({ ...pr, ...local, achievements: clampAchievements(local.achievements), saved: true }));
    });
  }

  function toggleCompareSelect(id: string) {
    setCompareIds(ids => {
      if (ids.includes(id)) return ids.filter(x => x !== id);
      if (ids.length >= 2) return [ids[1], id];
      return [...ids, id];
    });
  }

  function goCompareFrom(id: string) {
    setCompareIds(ids => (ids.includes(id) ? ids : [id, SPECIALTIES.find(s => s.id !== id)?.id || SPECIALTIES[0].id]));
    navigate("compare");
  }

  const topBarProps: TopBarProps = {
    aiEnabled,
    onToggleAI: () => setAiEnabled(v => !v),
    profile,
    onOpenProfile: () => setProfileOpen(true),
    authed,
    onOpenLogin: () => setLoginOpen(true),
  };

  function openRobot() {
    if (!aiEnabled) setAiEnabled(true);
    setAiOpen(true);
  }

  const currentSpecialty = SPECIALTIES.find(s => s.id === specialtyId) || SPECIALTIES[0];

  return (
    <>
      {screen === "home" && (
        <HomeScreen
          onNavigate={navigate}
          aiEnabled={aiEnabled}
          onToggleAI={() => setAiEnabled(v => !v)}
          authed={authed}
          onOpenLogin={() => setLoginOpen(true)}
        />
      )}
      {screen === "quiz" && <QuizScreen onNavigate={navigate} topBarProps={topBarProps} />}
      {screen === "dashboard" && (
        <DashboardScreen
          onNavigate={navigate}
          topBarProps={topBarProps}
          onAskRobot={openRobot}
          profile={profile}
          compareIds={compareIds}
          onToggleCompare={toggleCompareSelect}
          onToggleFavorite={toggleFavorite}
        />
      )}
      {screen === "favorites" && (
        <FavoritesScreen
          onNavigate={navigate}
          topBarProps={topBarProps}
          onAskRobot={openRobot}
          profile={profile}
          compareIds={compareIds}
          onToggleCompare={toggleCompareSelect}
          onToggleFavorite={toggleFavorite}
        />
      )}
      {screen === "specialty" && (
        <SpecialtyScreen
          sp={currentSpecialty}
          onNavigate={navigate}
          topBarProps={topBarProps}
          onAskRobot={openRobot}
          profile={profile}
          onToggleFavorite={toggleFavorite}
          onGoCompare={goCompareFrom}
        />
      )}
      {screen === "compare" && (
        <CompareScreen
          onNavigate={navigate}
          topBarProps={topBarProps}
          profile={profile}
          compareIds={compareIds}
          onSetCompareIds={setCompareIds}
        />
      )}
      {screen === "complist" && (
        <CompListScreen onNavigate={navigate} topBarProps={topBarProps} profile={profile} initialId={specialtyId} />
      )}

      {profileOpen && (
        <ProfilePanel
          profile={profile}
          authed={authed}
          guestUnlocked={guestUnlocked}
          onSave={s => { saveProfile(s); }}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {loginOpen && <LoginModal onLogin={handleLogin} onClose={() => setLoginOpen(false)} />}
      {gate.open && (
        <GuestGateModal
          onLogin={handleGateLogin}
          onDemo={handleGateDemo}
          onClose={() => setGate({ open: false })}
        />
      )}

      <AICopilot
        minimized={!aiOpen}
        onMinimize={() => setAiOpen(false)}
        onExpand={() => setAiOpen(true)}
        aiEnabled={aiEnabled}
        onToggleAI={() => setAiEnabled(false)}
        profile={profile}
      />
    </>
  );
}
