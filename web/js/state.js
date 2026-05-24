// state.js — v0.1.6

// ───────── RUNTIME STATE ─────────
let keyframes = [];
let defaultState = {};
let masterTimeline = gsap.timeline({ paused: true });
let dirtyProps = new Set();
let isUpdatingUI = false;
let currentPalette = ['#ffffff', '#ff003c'];
let currentFontList = []; // список шрифтов для randomFont
let isLooping = false;
let selectedKeyframes = [];
let dragGroupData = null;
let selectData = null;
let isDraggingTime = false;
let isSeeking = false;
let currentTheme = localStorage.getItem('theme') || 'light'; // 'light' | 'dark'
let currentLang = localStorage.getItem('lang') || 'ru';     // 'ru' | 'en'

// ───────── KEY CATEGORIES ─────────
const ANIMATABLE_KEYS = [
    'tracking', 'spacing', 'lineheight', 'fontsize', 'boxW',
    'cText', 'cTextBg', 'cBg',
    'textReveal', 'randomHide',
    'sWordW', 'sWordRadius', 'sWordPadX', 'sCharW',
    'seedPattern', 'seed',
    'gradAngle', 'gradLx', 'gradLy',
    'gradCx', 'gradCy', 'gradCr',
    'gradStop0Color', 'gradStop0Pos', 'gradStop1Color', 'gradStop1Pos',
    'gradStop2Color', 'gradStop2Pos', 'gradStop3Color', 'gradStop3Pos',
    'gradStop4Color', 'gradStop4Pos', 'gradStop5Color', 'gradStop5Pos',
    'gradStop6Color', 'gradStop6Pos', 'gradStop7Color', 'gradStop7Pos'
];

const DISCRETE_KEYS = [
    'text', 'font', 'align', 'alignV', 'pattern',
    'sWord', 'sChar', 'remSpaces',
    'palette', 'revealMode', 'bgFit', 'wrapText',
    'randomFont', 'fontList',
    'textGradient'
];

const ALL_KEYS_ORDER = [...ANIMATABLE_KEYS, ...DISCRETE_KEYS];

// ───────── EASING PRESETS ─────────
// Хранится на каждом ключевом кадре: kf.easings = { prop: 'linear'|'easeInOut'|'const' }
const EASE_PRESETS = {
    linear:    'none',
    easeInOut: 'power2.inOut',
    const:     'steps(1)'   // резкий переход без интерполяции
};
const EASE_PRESET_LABELS = {
    ru: { linear: 'Линейный', easeInOut: 'Ease In Out', const: 'Резкий (Const)' },
    en: { linear: 'Linear',   easeInOut: 'Ease In Out', const: 'Constant' }
};

// ───────── TRANSLATIONS ─────────
const TRANSLATIONS = {
    ru: {
        // Header
        appName: 'MINMOTION',
        btnOpen: '📂 ОТКРЫТЬ',
        btnSave: '💾 СОХРАНИТЬ',
        hideUI: 'СКРЫТЬ UI [H]',
        tlShowHide: 'ТАЙМЛАЙН [ВКЛ/ВЫКЛ]',
        btnSettings: '⚙',

        // Custom tooltips & extra keys
        btnToggleSidebarTitle: 'Скрыть/показать кнопки файлов',
        btnFullscreenTitle: 'Полный экран',
        btnToggleUITitle: 'Скрыть/показать интерфейс [H]',
        btnSettingsTitle: 'Настройки',
        btnExportVideo: '🎬 ЭКСПОРТ',
        btnExportVideoTitle: 'Экспорт видео',
        modalExportTitle: '🎬 ЭКСПОРТ ВИДЕО',
        modalStartFrame: 'НАЧАЛЬНЫЙ КАДР',
        modalEndFrame: 'КОНЕЧНЫЙ КАДР',
        modalFormat: 'ФОРМАТ',
        modalResolution: 'РАЗРЕШЕНИЕ',
        modalResScreen: 'ЭКРАН',
        modalResCustom: 'СВОЁ',
        modalBtnRender: '▶ РЕНДЕР',
        modalBtnCancel: 'ОТМЕНА',
        modalScreenSuffix: 'экран',
        radialCenterRadius: '● Центр / ○ Радиус',
        kfTooltipSuffix: '\n(ПКМ - изменить)',
        errFrameOrder: 'Начальный кадр должен быть меньше конечного',

        // Settings panel
        settingsTitle: 'НАСТРОЙКИ',
        themeLabel: 'ТЕМА',
        themeLight: 'СВЕТЛАЯ',
        themeDark: 'ТЁМНАЯ',
        langLabel: 'ЯЗЫК',

        // Groups
        groupMain: 'ОСНОВНОЕ',
        groupTypo: 'ТИПОГРАФИКА',
        groupColor: 'ЦВЕТ И ФОН',
        groupStroke: 'ОБВОДКА И ГРАНИЦЫ',
        groupGradient: 'ГРАДИЕНТ ТЕКСТА',
        groupRandomFont: 'СЛУЧАЙНЫЙ ШРИФТ',

        // Params
        paramText: 'Текст',
        paramReveal: 'Раскрытие (0–100%)',
        paramRevealMode: 'Режим',
        paramRevealModeChar: 'Символы',
        paramRevealModeWord: 'Слова',
        paramRevealModeLine: 'Абзацы',
        paramRandomHide: 'Случайное скрытие (0–100%)',
        paramFont: 'Шрифт',
        paramFontSearch: 'Поиск шрифта...',
        paramFontLoad: '🔤',
        paramFontsize: 'Размер шрифта',
        paramTracking: 'Трекинг',
        paramSpacing: 'Межсловный интервал',
        paramLineheight: 'Межстрочный интервал',
        paramBgFit: 'Адаптивный фон строки',
        paramResetSpacing: 'СБРОСИТЬ ОТСТУПЫ',
        paramAlignH: 'Выравнивание (гор.)',
        paramAlignV: 'Выравнивание (верт.)',
        paramAlignCenter: 'По центру',
        paramAlignLeft: 'Слева',
        paramAlignRight: 'Справа',
        paramAlignJustify: 'По ширине',
        paramAlignVCenter: 'По центру',
        paramAlignVTop: 'Сверху',
        paramAlignVBottom: 'Снизу',

        paramCText: 'Цвет текста',
        paramCTextBg: 'Фон слова',
        paramCStroke: 'Цвет обводки',
        paramCBg: 'Фон холста',
        paramPattern: 'Паттерн (Фон)',
        paramPatternNone: 'Нет',
        paramPatternOdd: 'Нечётные',
        paramPatternEven: 'Чётные',
        paramPatternEvery3: 'Каждое третье',
        paramPatternRandom: 'Случайно (Сид)',
        paramSeedPattern: 'Сид паттерна',
        paramSeedStatic: 'Сид случайностей',
        paramPalette: 'Палитра выделения',
        paramAddColor: '+ ДОБАВИТЬ ЦВЕТ',

        paramSBlock: 'Обводка границ блока',
        paramSWord: 'Обводка слов',
        paramSWordW: 'Толщина (слова)',
        paramSChar: 'Обводка символов',
        paramSCharW: 'Толщина (символы)',
        paramSWordRadius: 'Скругление (слова)',
        paramSWordPadX: 'Отступ по горизонтали (слова)',
        paramRemSpaces: 'Без пробелов',
        paramWrapText: 'Перенос текста',

        // Gradient
        paramGradientEnabled: 'Включить градиент',
        paramGradientType: 'Тип',
        paramGradientTypeLinear: 'Линейный',
        paramGradientTypeRadial: 'Радиальный',
        paramGradientMode: 'Применить к',
        paramGradientModeWords: 'Словам',
        paramGradientModeChars: 'Символам',
        paramGradientInterp: 'Интерполяция',
        paramGradientInterpLinear: 'Плавная',
        paramGradientInterpConst: 'Резкая',
        paramGradientAddStop: '+ ДОБАВИТЬ ЦВЕТ',
        paramGradientKeyAll: '● ЗАПИСАТЬ ВСЕ ФЛАГИ',

        // Random font
        paramRandomFontMode: 'Случайный шрифт',
        paramRandomFontNone: 'Нет',
        paramRandomFontWords: 'По словам',
        paramRandomFontChars: 'По символам',
        paramRandomFontAddFont: '+ ДОБАВИТЬ ШРИФТ',

        // Timeline
        tlFrame: 'Кадр:',
        tlTotal: 'Всего:',
        tlFps: 'FPS:',
        tlZoom: 'Зум:',

        // Context menu
        ctxParam: 'Параметр',
        ctxValue: 'Значение:',
        ctxSave: '✓ СОХРАНИТЬ',
        ctxDelete: 'УДАЛИТЬ',

        // Easing presets
        easeLinear: 'Линейный',
        easeInOut: 'Ease In Out',
        easeConst: 'Резкий',

        // Errors
        errLoadFile: 'Ошибка чтения файла проекта!',
        errFontAPI: 'Не поддерживается браузером.'
    },
    en: {
        appName: 'MINMOTION',
        btnOpen: '📂 OPEN',
        btnSave: '💾 SAVE',
        hideUI: 'HIDE UI [H]',
        tlShowHide: 'TIMELINE [SHOW/HIDE]',
        btnSettings: '⚙',

        // Custom tooltips & extra keys
        btnToggleSidebarTitle: 'Show/hide file buttons',
        btnFullscreenTitle: 'Fullscreen',
        btnToggleUITitle: 'Show/hide interface [H]',
        btnSettingsTitle: 'Settings',
        btnExportVideo: '🎬 EXPORT',
        btnExportVideoTitle: 'Export video',
        modalExportTitle: '🎬 EXPORT VIDEO',
        modalStartFrame: 'START FRAME',
        modalEndFrame: 'END FRAME',
        modalFormat: 'FORMAT',
        modalResolution: 'RESOLUTION',
        modalResScreen: 'SCREEN',
        modalResCustom: 'CUSTOM',
        modalBtnRender: '▶ RENDER',
        modalBtnCancel: 'CANCEL',
        modalScreenSuffix: 'screen',
        radialCenterRadius: '● Center / ○ Radius',
        kfTooltipSuffix: '\n(RMB - edit)',
        errFrameOrder: 'Start frame must be less than end frame',

        settingsTitle: 'SETTINGS',
        themeLabel: 'THEME',
        themeLight: 'LIGHT',
        themeDark: 'DARK',
        langLabel: 'LANGUAGE',

        groupMain: 'MAIN',
        groupTypo: 'TYPOGRAPHY',
        groupColor: 'COLOR & BG',
        groupStroke: 'STROKE & BORDERS',
        groupGradient: 'TEXT GRADIENT',
        groupRandomFont: 'RANDOM FONT',

        paramText: 'Text',
        paramReveal: 'Reveal (0–100%)',
        paramRevealMode: 'Mode',
        paramRevealModeChar: 'Characters',
        paramRevealModeWord: 'Words',
        paramRevealModeLine: 'Paragraphs',
        paramRandomHide: 'Random Hide (0–100%)',
        paramFont: 'Font',
        paramFontSearch: 'Search font...',
        paramFontLoad: '🔤',
        paramFontsize: 'Font Size',
        paramTracking: 'Tracking',
        paramSpacing: 'Word Spacing',
        paramLineheight: 'Line Height',
        paramBgFit: 'Adaptive Line BG',
        paramResetSpacing: 'RESET SPACING',
        paramAlignH: 'Alignment (H)',
        paramAlignV: 'Alignment (V)',
        paramAlignCenter: 'Center',
        paramAlignLeft: 'Left',
        paramAlignRight: 'Right',
        paramAlignJustify: 'Justify',
        paramAlignVCenter: 'Center',
        paramAlignVTop: 'Top',
        paramAlignVBottom: 'Bottom',

        paramCText: 'Text Color',
        paramCTextBg: 'Word BG',
        paramCStroke: 'Stroke Color',
        paramCBg: 'Canvas BG',
        paramPattern: 'Pattern (BG)',
        paramPatternNone: 'None',
        paramPatternOdd: 'Odd',
        paramPatternEven: 'Even',
        paramPatternEvery3: 'Every 3rd',
        paramPatternRandom: 'Random (Seed)',
        paramSeedPattern: 'Pattern Seed',
        paramSeedStatic: 'Random Seed',
        paramPalette: 'Selection Palette',
        paramAddColor: '+ ADD COLOR',

        paramSBlock: 'Block Border Stroke',
        paramSWord: 'Word Stroke',
        paramSWordW: 'Thickness (words)',
        paramSChar: 'Char Stroke',
        paramSCharW: 'Thickness (chars)',
        paramSWordRadius: 'Roundness (words)',
        paramSWordPadX: 'Padding H (words)',
        paramRemSpaces: 'Remove Spaces',
        paramWrapText: 'Word Wrap',

        paramGradientEnabled: 'Enable Gradient',
        paramGradientType: 'Type',
        paramGradientTypeLinear: 'Linear',
        paramGradientTypeRadial: 'Radial',
        paramGradientMode: 'Apply to',
        paramGradientModeWords: 'Words',
        paramGradientModeChars: 'Characters',
        paramGradientInterp: 'Interpolation',
        paramGradientInterpLinear: 'Smooth',
        paramGradientInterpConst: 'Constant',
        paramGradientAddStop: '+ ADD COLOR',
        paramGradientKeyAll: '● KEYFRAME ALL FLAGS',

        paramRandomFontMode: 'Random Font',
        paramRandomFontNone: 'None',
        paramRandomFontWords: 'By Words',
        paramRandomFontChars: 'By Characters',
        paramRandomFontAddFont: '+ ADD FONT',

        tlFrame: 'Frame:',
        tlTotal: 'Total:',
        tlFps: 'FPS:',
        tlZoom: 'Zoom:',

        ctxParam: 'Parameter',
        ctxValue: 'Value:',
        ctxSave: '✓ SAVE',
        ctxDelete: 'DELETE',

        easeLinear: 'Linear',
        easeInOut: 'Ease In Out',
        easeConst: 'Constant',

        errLoadFile: 'Error reading project file!',
        errFontAPI: 'Not supported by browser.'
    }
};

// ───────── PARAM LABELS (локализованные) ─────────
const PARAM_LABELS_I18N = {
    ru: {
        text: 'Текст', font: 'Шрифт', tracking: 'Трекинг', spacing: 'Межсловный интервал',
        lineheight: 'Межстрочный интервал', bgFit: 'Адаптивный фон строки', fontsize: 'Размер шрифта',
        align: 'Выравнивание (гор.)', alignV: 'Выравнивание (верт.)',
        cText: 'Цвет текста', cTextBg: 'Фон слова', cStroke: 'Цвет обводки', cBg: 'Фон холста',
        pattern: 'Паттерн', sBlock: 'Обводка блока', sWord: 'Обводка слов',
        sWordW: 'Толщина обводки слов', sWordRadius: 'Скругление (слова)',
        sWordPadX: 'Отступ гор. (слова)', sChar: 'Обводка символов', sCharW: 'Толщина обводки символов',
        remSpaces: 'Без пробелов', palette: 'Палитра', boxW: 'Ширина блока',
        textReveal: 'Раскрытие текста', randomHide: 'Случайное скрытие',
        revealMode: 'Режим раскрытия', wrapText: 'Перенос текста',
        seedPattern: 'Сид паттерна', seed: 'Сид случайностей',
        randomFont: 'Случайный шрифт', fontList: 'Список шрифтов',
        textGradient: 'Градиент текста',
        gradAngle: 'Угол градиента', gradLx: 'Центр X (лин.)', gradLy: 'Центр Y (лин.)',
        gradCx: 'Центр X (рад.)', gradCy: 'Центр Y (рад.)', gradCr: 'Радиус (рад.)',
        gradStop0Color: 'Цвет флага 0', gradStop0Pos: 'Позиция флага 0',
        gradStop1Color: 'Цвет флага 1', gradStop1Pos: 'Позиция флага 1',
        gradStop2Color: 'Цвет флага 2', gradStop2Pos: 'Позиция флага 2',
        gradStop3Color: 'Цвет флага 3', gradStop3Pos: 'Позиция флага 3',
        gradStop4Color: 'Цвет флага 4', gradStop4Pos: 'Позиция флага 4',
        gradStop5Color: 'Цвет флага 5', gradStop5Pos: 'Позиция флага 5',
        gradStop6Color: 'Цвет флага 6', gradStop6Pos: 'Позиция флага 6',
        gradStop7Color: 'Цвет флага 7', gradStop7Pos: 'Позиция флага 7'
    },
    en: {
        text: 'Text', font: 'Font', tracking: 'Tracking', spacing: 'Word Spacing',
        lineheight: 'Line Height', bgFit: 'Adaptive Line BG', fontsize: 'Font Size',
        align: 'Alignment (H)', alignV: 'Alignment (V)',
        cText: 'Text Color', cTextBg: 'Word BG', cStroke: 'Stroke Color', cBg: 'Canvas BG',
        pattern: 'Pattern', sBlock: 'Block Border', sWord: 'Word Stroke',
        sWordW: 'Word Stroke Width', sWordRadius: 'Roundness (words)',
        sWordPadX: 'Padding H (words)', sChar: 'Char Stroke', sCharW: 'Char Stroke Width',
        remSpaces: 'Remove Spaces', palette: 'Palette', boxW: 'Block Width',
        textReveal: 'Text Reveal', randomHide: 'Random Hide',
        revealMode: 'Reveal Mode', wrapText: 'Word Wrap',
        seedPattern: 'Pattern Seed', seed: 'Random Seed',
        randomFont: 'Random Font', fontList: 'Font List',
        textGradient: 'Text Gradient',
        gradAngle: 'Gradient Angle', gradLx: 'Center X (lin.)', gradLy: 'Center Y (lin.)',
        gradCx: 'Center X (rad.)', gradCy: 'Center Y (rad.)', gradCr: 'Radius (rad.)',
        gradStop0Color: 'Flag 0 Color', gradStop0Pos: 'Flag 0 Pos',
        gradStop1Color: 'Flag 1 Color', gradStop1Pos: 'Flag 1 Pos',
        gradStop2Color: 'Flag 2 Color', gradStop2Pos: 'Flag 2 Pos',
        gradStop3Color: 'Flag 3 Color', gradStop3Pos: 'Flag 3 Pos',
        gradStop4Color: 'Flag 4 Color', gradStop4Pos: 'Flag 4 Pos',
        gradStop5Color: 'Flag 5 Color', gradStop5Pos: 'Flag 5 Pos',
        gradStop6Color: 'Flag 6 Color', gradStop6Pos: 'Flag 6 Pos',
        gradStop7Color: 'Flag 7 Color', gradStop7Pos: 'Flag 7 Pos'
    }
};

function PARAM_LABELS_get(key) {
    return (PARAM_LABELS_I18N[currentLang] || PARAM_LABELS_I18N.ru)[key] || key;
}

// Совместимость — единый объект для старого кода
const PARAM_LABELS = new Proxy({}, {
    get(_, key) { return PARAM_LABELS_get(key); }
});

// ───────── UTILS ─────────
function mulberry32(a) {
    return function() {
        let t = a += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

function t(key) {
    return (TRANSLATIONS[currentLang] || TRANSLATIONS.ru)[key] || key;
}