// functions.js — v0.1.27

// ─── I18N / THEME ───
function applyI18n() {
    localStorage.setItem('lang', currentLang);
    DOM.btnLangRu.classList.toggle('active', currentLang === 'ru');
    DOM.btnLangEn.classList.toggle('active', currentLang === 'en');
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        const val = t(key);
        if (!val) return;
        // If element has child elements (e.g. inputs inside labels), only update first text node
        const firstText = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (firstText) {
            firstText.textContent = val;
        } else if (!el.children.length) {
            el.textContent = val;
        }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        const val = t(key);
        if (val) el.placeholder = val;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.dataset.i18nTitle;
        const val = t(key);
        if (val) el.dataset.title = val;
    });
}

function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.dataset.theme = theme;
    DOM.btnThemeLight.classList.toggle('active', theme === 'light');
    DOM.btnThemeDark.classList.toggle('active', theme === 'dark');
}

// ─── TIMELINE ROWS ───
function syncTimelineRows() {
    // Remove rows for params with no keyframes; add rows for params with keyframes
    const keyedParams = new Set();
    keyframes.forEach(kf => Object.keys(kf.props).forEach(k => keyedParams.add(k)));

    // Remove rows not in keyedParams
    DOM.tlSidebar.querySelectorAll('.tl-row').forEach(el => {
        if (!keyedParams.has(el.dataset.param)) el.remove();
    });
    DOM.tracks.querySelectorAll('.tl-track-row').forEach(el => {
        if (!keyedParams.has(el.dataset.trackid)) el.remove();
    });

    // Sort rows in DOM to match stable layout order
    const sortedParams = [...keyedParams].sort((a, b) => ALL_KEYS_ORDER.indexOf(a) - ALL_KEYS_ORDER.indexOf(b));

    // Add or re-order rows
    sortedParams.forEach(key => {
        let label = DOM.tlSidebar.querySelector(`.tl-row[data-param="${key}"]`);
        if (!label) {
            label = document.createElement('div');
            label.className = 'tl-row';
            label.dataset.param = key;
            label.innerHTML = `<span>${PARAM_LABELS[key]}</span> <button type="button" class="tl-dot" data-param="${key}"></button>`;
            label.querySelector('.tl-dot').onclick = () => toggleParamKeyframe(key);
            DOM.tlSidebar.appendChild(label);
        } else {
            DOM.tlSidebar.appendChild(label);
        }

        let trackBg = DOM.tracks.querySelector(`.tl-track-row[data-trackid="${key}"]`);
        if (!trackBg) {
            trackBg = document.createElement('div');
            trackBg.className = 'tl-track-row';
            trackBg.dataset.trackid = key;
            DOM.tracks.appendChild(trackBg);
        } else {
            DOM.tracks.appendChild(trackBg);
        }
    });
}

function initTimelineTracks() {
    DOM.tlSidebar.innerHTML = '';
    DOM.tracks.querySelectorAll('.tl-track-row').forEach(el => el.remove());
    // Wire up sidebar dots in main sidebar
    document.querySelectorAll('.sidebar-dot').forEach(dot => {
        const key = dot.dataset.param;
        dot.onclick = () => toggleParamKeyframe(key);
    });
    syncTimelineRows();
    updateZoom();
}

function updateZoom() {
    const scale = parseFloat(DOM.zoom.value);
    const baseTrackWidth = 800;
    DOM.tracks.style.minWidth = (baseTrackWidth * scale) + 'px';
    const cell = 50 * scale;
    if (DOM.grid) {
        DOM.grid.style.background = `repeating-linear-gradient(90deg, transparent, transparent ${cell - 1}px, var(--grid-line-color) ${cell - 1}px, var(--grid-line-color) ${cell}px)`;
    }
}

// ─── PALETTE UI ───
function renderPaletteUI() {
    DOM.paletteCont.innerHTML = '';

    // Color blocks row
    const row = document.createElement('div');
    row.className = 'palette-blocks-row';

    currentPalette.forEach((color, index) => {
        const block = document.createElement('div');
        block.className = 'palette-block';
        block.style.background = color;
        block.title = color;

        const inp = document.createElement('input');
        inp.type = 'color';
        inp.value = color;
        inp.className = 'palette-color-inp';
        inp.addEventListener('input', (e) => {
            currentPalette[index] = e.target.value;
            block.style.background = e.target.value;
            block.title = e.target.value;
            if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('palette'); updateHighlights(); }
            applyStateToDOM(getCurrentFullState());
        });
        inp.addEventListener('change', () => {
            renderPaletteUI(); applyStateToDOM(getCurrentFullState());
        });
        block.addEventListener('click', () => inp.click());

        const del = document.createElement('button');
        del.type = 'button'; del.className = 'palette-block-del'; del.textContent = '×';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            currentPalette.splice(index, 1);
            if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('palette'); updateHighlights(); }
            renderPaletteUI(); applyStateToDOM(getCurrentFullState());
        });

        block.appendChild(inp);
        block.appendChild(del);
        row.appendChild(block);
    });

    DOM.paletteCont.appendChild(row);
}

// ─── FONT LIST UI ───
function renderFontListUI() {
    DOM.fontListCont.innerHTML = '';
    currentFontList.forEach((fontValue, index) => {
        const item = document.createElement('div'); item.className = 'font-list-item';

        // Mini font dropdown
        const wrapper = document.createElement('div'); wrapper.className = 'font-dropdown-wrapper font-list-dropdown-wrapper';
        const trigger = document.createElement('div'); trigger.className = 'font-dropdown-trigger font-list-trigger';
        // Find display name
        const matchOpt = Array.from(DOM.font.options).find(o => o.value === fontValue);
        const displayName = matchOpt ? matchOpt.textContent : fontValue;
        trigger.innerHTML = `
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; text-align: left;">${displayName}</span>
            <span class="font-dropdown-arrow">▼</span>
        `;
        trigger.title = fontValue;

        const panel = document.createElement('div'); panel.className = 'font-dropdown-panel font-list-panel';
        const searchRow = document.createElement('div'); searchRow.className = 'font-search-row';
        const searchInp = document.createElement('input'); searchInp.type = 'text'; searchInp.placeholder = t('paramFontSearch');
        searchInp.autocomplete = 'off';
        searchRow.appendChild(searchInp);
        panel.appendChild(searchRow);
        const optList = document.createElement('div'); optList.className = 'font-options-list';
        panel.appendChild(optList);

        function populateOpts(term) {
            optList.innerHTML = '';
            Array.from(DOM.font.options).forEach(opt => {
                if (term && !opt.textContent.toLowerCase().includes(term.toLowerCase())) return;
                const div = document.createElement('div');
                div.className = 'font-option' + (opt.value === fontValue ? ' selected' : '');
                div.dataset.value = opt.value; div.textContent = opt.textContent;
                div.setAttribute('tabindex', '0');
                div.onclick = () => {
                    currentFontList[index] = opt.value;
                    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('fontList'); }
                    panel.classList.remove('open'); trigger.classList.remove('open');
                    renderFontListUI(); applyStateToDOM(getCurrentFullState());
                };
                optList.appendChild(div);
            });
        }
        populateOpts('');

        searchInp.oninput = () => populateOpts(searchInp.value);

        trigger.onclick = (e) => {
            e.stopPropagation();
            const isOpen = panel.classList.contains('open');
            // Close all other panels
            document.querySelectorAll('.font-list-panel.open').forEach(p => p.classList.remove('open'));
            document.querySelectorAll('.font-list-trigger.open').forEach(t => t.classList.remove('open'));
            if (!isOpen) {
                panel.classList.add('open'); trigger.classList.add('open');
                searchInp.value = ''; populateOpts('');
                setTimeout(() => searchInp.focus(), 50);
            }
        };
        panel.addEventListener('click', e => e.stopPropagation());

        wrapper.appendChild(trigger); wrapper.appendChild(panel);

        const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = '×';
        btn.onclick = () => {
            currentFontList.splice(index, 1);
            if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('fontList'); }
            renderFontListUI(); applyStateToDOM(getCurrentFullState());
        };
        item.appendChild(wrapper); item.appendChild(btn);
        DOM.fontListCont.appendChild(item);
    });
}

// ─── GRADIENT UI ───
// stops: [{color:'#rrggbb', pos:0..1}, ...]  fraction: 0..1
function getGradientColor(stops, interp, fraction) {
    if (!stops || stops.length === 0) return '#000000';
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    if (fraction <= sorted[0].pos) return sorted[0].color;
    if (fraction >= sorted[sorted.length - 1].pos) return sorted[sorted.length - 1].color;
    for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (fraction >= a.pos && fraction <= b.pos) {
            if (interp === 'const') return a.color;
            if (b.pos === a.pos) return b.color;
            const t2 = (fraction - a.pos) / (b.pos - a.pos);
            return lerpColor(a.color, b.color, t2);
        }
    }
    return sorted[sorted.length - 1].color;
}

function lerpColor(hex1, hex2, t2) {
    const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
    const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
    const r = Math.max(0, Math.min(255, Math.round(r1 + (r2 - r1) * t2)));
    const g = Math.max(0, Math.min(255, Math.round(g1 + (g2 - g1) * t2)));
    const b = Math.max(0, Math.min(255, Math.round(b1 + (b2 - b1) * t2)));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function getCurrentGradientState() {
    // Returns the textGradient object from current DOM state
    const enabled = DOM.gradientEnabled.checked;
    const type = DOM.gradientType.value;
    const mode = DOM.gradientMode.value;
    const interp = document.getElementById('btn-grad-interp-linear').classList.contains('active') ? 'linear' : 'const';
    // Read stops from rendered UI (stored in dataset)
    const stops = [];
    DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle').forEach(h => {
        stops.push({ color: h.dataset.color, pos: parseFloat(h.dataset.pos) });
    });
    return { enabled, type, mode, interp, stops };
}

function dirtyGradientStopKeys() {
    const handles = DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle');
    handles.forEach((h, i) => {
        if (i < 8) {
            dirtyProps.add('gradStop' + i + 'Color');
            dirtyProps.add('gradStop' + i + 'Pos');
        }
    });
    dirtyProps.add('textGradient');
    updateHighlights();
}

function renderGradientStopsUI() {
    const grad = getCurrentGradientState();
    // Build CSS gradient preview on strip
    const sortedStops = [...grad.stops].sort((a, b) => a.pos - b.pos);
    if (sortedStops.length > 0) {
        const css = sortedStops.map(s => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(', ');
        DOM.gradientStrip.style.background = `linear-gradient(90deg, ${css})`;
    } else {
        DOM.gradientStrip.style.background = 'linear-gradient(90deg, #000, #fff)';
    }
    // Render handles
    DOM.gradientStopsBar.innerHTML = '';
    grad.stops.forEach((stop, idx) => {
        const handle = document.createElement('div');
        handle.className = 'gradient-stop-handle';
        handle.dataset.color = stop.color;
        handle.dataset.pos = stop.pos;
        handle.dataset.idx = idx;
        handle.style.left = (stop.pos * 100) + '%';
        handle.style.backgroundColor = stop.color;
        handle.title = stop.color;

        // Drag pos
        let dragging = false, startX = 0, startPos = 0;
        let pickerEl = null;

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            dragging = false; startX = e.clientX; startPos = parseFloat(handle.dataset.pos);
            handle.setPointerCapture(e.pointerId);
        });
        handle.addEventListener('pointermove', (e) => {
            if (e.buttons === 0) { dragging = false; return; }
            if (Math.abs(e.clientX - startX) > 3) dragging = true;
            if (!dragging) return;
            const barRect = DOM.gradientStopsBar.getBoundingClientRect();
            const newPos = Math.max(0, Math.min(1, startPos + (e.clientX - startX) / barRect.width));
            handle.dataset.pos = newPos;
            handle.style.left = (newPos * 100) + '%';
            // Update strip preview only — do NOT call renderGradientStopsUI (destroys handle, loses pointer capture)
            const allHandles = Array.from(DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle'));
            const stops = allHandles.map(h => ({ color: h.dataset.color, pos: parseFloat(h.dataset.pos) })).sort((a, b) => a.pos - b.pos);
            const css = stops.map(s => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(', ');
            DOM.gradientStrip.style.background = `linear-gradient(90deg, ${css})`;
        });
        handle.addEventListener('pointerup', () => {
            const wasDragging = dragging;
            dragging = false;
            if (wasDragging) {
                renderGradientStopsUI();
                if (!isUpdatingUI) {
                    updateUnkeyframedDefaults();
                    dirtyGradientStopKeys();
                }
                applyStateToDOM(getCurrentFullState());
            }
        });

        // Color picker on click (skipped if drag just happened)
        handle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dragging) return;
            if (pickerEl) { pickerEl.click(); return; }
            pickerEl = document.createElement('input'); pickerEl.type = 'color'; pickerEl.value = handle.dataset.color;
            pickerEl.style.position = 'absolute'; pickerEl.style.opacity = '0'; pickerEl.style.width = '0'; pickerEl.style.height = '0';
            handle.appendChild(pickerEl); pickerEl.click();
            pickerEl.addEventListener('pointerdown', ev => ev.stopPropagation());
            pickerEl.addEventListener('input', (ev) => {
                handle.dataset.color = ev.target.value;
                handle.style.backgroundColor = ev.target.value;
                handle.title = ev.target.value;
                const allHandles = Array.from(DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle'));
                const stops = allHandles.map(h => ({ color: h.dataset.color, pos: parseFloat(h.dataset.pos) })).sort((a, b) => a.pos - b.pos);
                const css = stops.map(s => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(', ');
                DOM.gradientStrip.style.background = `linear-gradient(90deg, ${css})`;
                if (!isUpdatingUI) {
                    updateUnkeyframedDefaults();
                    dirtyGradientStopKeys();
                }
                applyStateToDOM(getCurrentFullState());
            });
            pickerEl.addEventListener('change', () => {
                pickerEl.remove(); pickerEl = null;
                renderGradientStopsUI();
                applyStateToDOM(getCurrentFullState());
            });
        });

        // Right click remove
        handle.addEventListener('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            handle.remove();
            renderGradientStopsUI();
            if (!isUpdatingUI) {
                updateUnkeyframedDefaults();
                dirtyGradientStopKeys();
            }
            applyStateToDOM(getCurrentFullState());
        });

        DOM.gradientStopsBar.appendChild(handle);
    });
}

function drawGradientAngleCanvas() {
    const canvas = DOM.gradientAngleCanvas;
    if (!canvas) return;
    const w = Math.max(canvas.offsetWidth || canvas.width, 80);
    const h = Math.round(w * (window.innerHeight / window.innerWidth));
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const panelBg = getComputedStyle(document.documentElement).getPropertyValue('--panel-bg').trim() || '#eee';
    ctx.fillStyle = panelBg; ctx.fillRect(0, 0, w, h);

    const angle = isNaN(parseFloat(DOM.gradientAngle.value)) ? 90 : parseFloat(DOM.gradientAngle.value);
    const rad = angle * Math.PI / 180;
    // Draw gradient preview along angle
    const lx = isNaN(parseFloat(DOM.gradLx.value)) ? 50 : parseFloat(DOM.gradLx.value);
    const ly = isNaN(parseFloat(DOM.gradLy.value)) ? 50 : parseFloat(DOM.gradLy.value);
    const cx = (lx / 100) * w, cy = (ly / 100) * h;
    const rLen = Math.min(w, h) / 2 - 6;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const x1 = cx - dx * rLen, y1 = cy - dy * rLen;
    const x2 = cx + dx * rLen, y2 = cy + dy * rLen;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    // Use current gradient stops if available
    const stops = getCurrentGradientState().stops.sort((a, b) => a.pos - b.pos);
    if (stops.length >= 2) {
        stops.forEach(s => grad.addColorStop(s.pos, s.color));
    } else {
        grad.addColorStop(0, '#000'); grad.addColorStop(1, '#fff');
    }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);

    // Direction arrow
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    // Arrowhead
    const aLen = 8, aAng = 0.4;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - aLen * Math.cos(rad - aAng - Math.PI / 2), y2 - aLen * Math.sin(rad - aAng - Math.PI / 2));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - aLen * Math.cos(rad + aAng - Math.PI / 2), y2 - aLen * Math.sin(rad + aAng - Math.PI / 2));
    ctx.stroke();
    // Center draggable handle
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Degree label
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(angle + '°', 6, h - 6);
}

function drawGradientRadialCanvas() {
    const canvas = DOM.gradientRadialCanvas;
    if (!canvas) return;
    const cw = canvas.offsetWidth || 120;
    const ch = Math.round(cw * (window.innerHeight / window.innerWidth));
    canvas.width = cw; canvas.height = ch;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cx = parseFloat(canvas.dataset.cx || '50') / 100 * w;
    const cy = parseFloat(canvas.dataset.cy || '50') / 100 * h;
    const cr = parseFloat(canvas.dataset.cr || '0.5');
    const rx = (cx + cr * w * 0.5), ry = cy;
    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--panel-bg') || '#eee';
    ctx.fillRect(0, 0, w, h);
    // Radius circle
    ctx.beginPath(); ctx.arc(cx, cy, cr * w * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1; ctx.stroke();
    // Center
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#333'; ctx.fill();
    // Radius handle
    ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();
}

// ─── STATE ───
function getCurrentFullState() {
    const rect = DOM.box.getBoundingClientRect();
    const gradState = getCurrentGradientState();
    const state = {
        text: DOM.text.value,
        font: DOM.font.value,
        tracking: parseFloat(DOM.tracking.value),
        spacing: parseFloat(DOM.spacing.value),
        lineheight: parseFloat(DOM.lineheight.value),
        bgFit: DOM.bgFit.checked,
        fontsize: parseFloat(DOM.fontsize.value),
        align: DOM.align.value,
        alignV: DOM.alignV.value,
        cText: DOM.cText.value,
        cTextBg: DOM.cTextBg.value,
        cStroke: DOM.cStroke.value,
        cBg: DOM.cBg.value,
        seed: parseFloat(DOM.seed.value),
        pattern: DOM.pattern.value,
        seedPattern: parseFloat(DOM.seedPattern.value),
        gradAngle: isNaN(parseFloat(DOM.gradientAngle.value)) ? 90 : parseFloat(DOM.gradientAngle.value),
        gradLx: isNaN(parseFloat(DOM.gradLx.value)) ? 50 : parseFloat(DOM.gradLx.value),
        gradLy: isNaN(parseFloat(DOM.gradLy.value)) ? 50 : parseFloat(DOM.gradLy.value),
        gradCx: isNaN(parseFloat(DOM.gradCx.value)) ? 50 : parseFloat(DOM.gradCx.value),
        gradCy: isNaN(parseFloat(DOM.gradCy.value)) ? 50 : parseFloat(DOM.gradCy.value),
        gradCr: isNaN(parseFloat(DOM.gradCr.value)) ? 0.5 : parseFloat(DOM.gradCr.value),
        sWord: DOM.sWord.checked,
        sWordW: parseFloat(DOM.sWordW.value),
        sWordRadius: parseFloat(DOM.sWordRadius.value),
        sWordPadX: parseFloat(DOM.sWordPadX.value),
        sChar: DOM.sChar.checked,
        sCharW: parseFloat(DOM.sCharW.value),
        remSpaces: DOM.remSpaces.checked,
        wrapText: DOM.wrapText.checked,
        boxW: rect.width,
        textReveal: parseFloat(DOM.textReveal.value),
        randomHide: parseFloat(DOM.randomHide.value),
        revealMode: DOM.revealMode.value,
        palette: [...currentPalette],
        randomFont: DOM.randomFont.value,
        fontList: [...currentFontList],
        textGradient: gradState
    };
    // Expand gradient stops into individual animatable keys
    for (let i = 0; i < 8; i++) {
        if (i < gradState.stops.length) {
            state['gradStop' + i + 'Color'] = gradState.stops[i].color;
            state['gradStop' + i + 'Pos'] = gradState.stops[i].pos;
        } else {
            state['gradStop' + i + 'Color'] = '#000000';
            state['gradStop' + i + 'Pos'] = 0;
        }
    }
    return state;
}

function updateUnkeyframedDefaults() {
    const currentState = getCurrentFullState();
    ANIMATABLE_KEYS.forEach(key => { if (!keyframes.some(kf => kf.props.hasOwnProperty(key))) defaultState[key] = currentState[key]; });
    DISCRETE_KEYS.forEach(key => { if (!keyframes.some(kf => kf.props.hasOwnProperty(key))) defaultState[key] = currentState[key]; });
}

function syncUI(state) {
    isUpdatingUI = true;
    if (state.text !== undefined) DOM.text.value = state.text;
    if (state.font !== undefined) {
        DOM.font.value = state.font;
        const fontLabel = document.getElementById('font-dropdown-label');
        const fontOptsList = document.getElementById('font-options-list');
        if (fontLabel && fontOptsList) {
            const selOpt = DOM.font.options[DOM.font.selectedIndex];
            if (selOpt) fontLabel.textContent = selOpt.textContent;
            fontOptsList.querySelectorAll('.font-option').forEach(el => {
                el.classList.toggle('selected', el.dataset.value === state.font);
            });
        }
    }
    if (state.tracking !== undefined) { DOM.tracking.value = state.tracking; DOM.trackingNum.value = state.tracking; }
    if (state.spacing !== undefined) { DOM.spacing.value = state.spacing; DOM.spacingNum.value = state.spacing; }
    if (state.lineheight !== undefined) { DOM.lineheight.value = state.lineheight; DOM.lineheightNum.value = state.lineheight; }
    if (state.bgFit !== undefined) DOM.bgFit.checked = state.bgFit;
    if (state.fontsize !== undefined) { DOM.fontsize.value = state.fontsize; DOM.fontsizeNum.value = state.fontsize; }
    if (state.align !== undefined) DOM.align.value = state.align;
    if (state.alignV !== undefined) DOM.alignV.value = state.alignV;
    if (state.cText !== undefined) { DOM.cText.value = state.cText; if (DOM.cTextHex) DOM.cTextHex.value = state.cText; }
    if (state.cTextBg !== undefined) { DOM.cTextBg.value = state.cTextBg; if (DOM.cTextBgHex) DOM.cTextBgHex.value = state.cTextBg; }
    if (state.cStroke !== undefined) { DOM.cStroke.value = state.cStroke; if (DOM.cStrokeHex) DOM.cStrokeHex.value = state.cStroke; }
    if (state.cBg !== undefined) { DOM.cBg.value = state.cBg; if (DOM.cBgHex) DOM.cBgHex.value = state.cBg; }
    if (state.seed !== undefined) { DOM.seed.value = state.seed; if (DOM.seedNum) DOM.seedNum.value = state.seed; }
    if (state.pattern !== undefined) DOM.pattern.value = state.pattern;
    if (state.seedPattern !== undefined) { DOM.seedPattern.value = state.seedPattern; DOM.seedPatternNum.value = state.seedPattern; }
    let needRedrawAngle = false;
    let needRedrawRadial = false;
    if (state.gradAngle !== undefined) { DOM.gradientAngle.value = state.gradAngle; needRedrawAngle = true; }
    if (state.gradLx !== undefined) { DOM.gradLx.value = state.gradLx; DOM.gradLxNum.value = state.gradLx; needRedrawAngle = true; }
    if (state.gradLy !== undefined) { DOM.gradLy.value = state.gradLy; DOM.gradLyNum.value = state.gradLy; needRedrawAngle = true; }
    if (state.gradCx !== undefined) { DOM.gradCx.value = state.gradCx; DOM.gradCxNum.value = state.gradCx; DOM.gradientRadialCanvas.dataset.cx = state.gradCx; needRedrawRadial = true; }
    if (state.gradCy !== undefined) { DOM.gradCy.value = state.gradCy; DOM.gradCyNum.value = state.gradCy; DOM.gradientRadialCanvas.dataset.cy = state.gradCy; needRedrawRadial = true; }
    if (state.gradCr !== undefined) { DOM.gradCr.value = state.gradCr; DOM.gradCrNum.value = state.gradCr; DOM.gradientRadialCanvas.dataset.cr = state.gradCr; needRedrawRadial = true; }
    if (needRedrawAngle) drawGradientAngleCanvas();
    if (needRedrawRadial) drawGradientRadialCanvas();
    if (state.sWord !== undefined) DOM.sWord.checked = state.sWord;
    if (state.sWordW !== undefined) { DOM.sWordW.value = state.sWordW; DOM.sWordWNum.value = state.sWordW; }
    if (state.sWordRadius !== undefined) { DOM.sWordRadius.value = state.sWordRadius; DOM.sWordRadiusNum.value = state.sWordRadius; }
    if (state.sWordPadX !== undefined) { DOM.sWordPadX.value = state.sWordPadX; DOM.sWordPadXNum.value = state.sWordPadX; }
    if (state.sChar !== undefined) DOM.sChar.checked = state.sChar;
    if (state.sCharW !== undefined) { DOM.sCharW.value = state.sCharW; DOM.sCharWNum.value = state.sCharW; }
    if (state.remSpaces !== undefined) DOM.remSpaces.checked = state.remSpaces;
    if (state.wrapText !== undefined) DOM.wrapText.checked = state.wrapText;
    if (state.textReveal !== undefined) { DOM.textReveal.value = state.textReveal; DOM.textRevealNum.value = state.textReveal; }
    if (state.randomHide !== undefined) { DOM.randomHide.value = state.randomHide; DOM.randomHideNum.value = state.randomHide; }
    if (state.revealMode !== undefined) DOM.revealMode.value = state.revealMode;
    if (state.randomFont !== undefined) {
        DOM.randomFont.value = state.randomFont;
        DOM.randomFontSection.style.display = (state.randomFont !== 'none') ? 'block' : 'none';
    }
    if (state.fontList && JSON.stringify(currentFontList) !== JSON.stringify(state.fontList)) {
        currentFontList = [...state.fontList];
        renderFontListUI();
    }
    if (state.palette && JSON.stringify(currentPalette) !== JSON.stringify(state.palette)) {
        currentPalette = [...state.palette];
        renderPaletteUI();
    }
    if (state.textGradient !== undefined) {
        const g = state.textGradient;
        DOM.gradientEnabled.checked = g.enabled;
        DOM.gradientSettings.style.display = g.enabled ? 'block' : 'none';
        if (g.type !== undefined) DOM.gradientType.value = g.type;
        if (g.mode !== undefined) DOM.gradientMode.value = g.mode;
        if (g.type === 'radial') {
            DOM.gradientLinearUI.style.display = 'none';
            DOM.gradientRadialUI.style.display = 'block';
            drawGradientRadialCanvas();
        } else {
            DOM.gradientLinearUI.style.display = 'block';
            DOM.gradientRadialUI.style.display = 'none';
            drawGradientAngleCanvas();
        }
        const btnLin = document.getElementById('btn-grad-interp-linear');
        const btnConst = document.getElementById('btn-grad-interp-const');
        if (btnLin && btnConst) {
            btnLin.classList.toggle('active', g.interp !== 'const');
            btnConst.classList.toggle('active', g.interp === 'const');
        }
        // Rebuild stops UI from state
        DOM.gradientStopsBar.innerHTML = '';
        if (g.stops) {
            g.stops.forEach(stop => {
                const h = document.createElement('div');
                h.className = 'gradient-stop-handle';
                h.dataset.color = stop.color; h.dataset.pos = stop.pos;
                h.style.left = (stop.pos * 100) + '%';
                h.style.backgroundColor = stop.color;
                DOM.gradientStopsBar.appendChild(h);
            });
        }
        renderGradientStopsUI();
    }
    // Apply individual gradStop keys (from animation proxy)
    let stopsNeedRebuild = false;
    for (let i = 0; i < 8; i++) {
        const colorKey = 'gradStop' + i + 'Color';
        const posKey = 'gradStop' + i + 'Pos';
        const hasStopKeys = keyframes.some(kf => kf.props.hasOwnProperty(colorKey) || kf.props.hasOwnProperty(posKey));
        if (hasStopKeys && (state[colorKey] !== undefined || state[posKey] !== undefined)) {
            const handles = DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle');
            if (i < handles.length) {
                const h = handles[i];
                if (state[colorKey] !== undefined) { h.dataset.color = state[colorKey]; h.style.backgroundColor = state[colorKey]; h.title = state[colorKey]; }
                if (state[posKey] !== undefined) { h.dataset.pos = state[posKey]; h.style.left = (parseFloat(state[posKey]) * 100) + '%'; }
                stopsNeedRebuild = true;
            }
        }
    }
    if (stopsNeedRebuild) {
        const allHandles = Array.from(DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle'));
        const stops = allHandles.map(h => ({ color: h.dataset.color, pos: parseFloat(h.dataset.pos) })).sort((a, b) => a.pos - b.pos);
        const css = stops.map(s => `${s.color} ${(s.pos * 100).toFixed(1)}%`).join(', ');
        DOM.gradientStrip.style.background = `linear-gradient(90deg, ${css})`;
        if (DOM.gradientType.value === 'radial') drawGradientRadialCanvas();
        else drawGradientAngleCanvas();
    }
    isUpdatingUI = false;
}

// ─── KEYFRAMES ───
function cleanUpKeyframes() {
    let merged = [];
    keyframes.forEach(kf => {
        let existing = merged.find(m => m.frame === kf.frame);
        if (existing) {
            Object.assign(existing.props, kf.props);
            if (kf.easings) existing.easings = Object.assign(existing.easings || {}, kf.easings);
        } else if (Object.keys(kf.props).length > 0) {
            merged.push({ frame: kf.frame, props: { ...kf.props }, easings: { ...(kf.easings || {}) } });
        }
    });
    merged.forEach(kf => {
        if (kf.easings) {
            Object.keys(kf.easings).forEach(prop => {
                if (!kf.props.hasOwnProperty(prop)) delete kf.easings[prop];
            });
        }
    });
    keyframes = merged.sort((a, b) => a.frame - b.frame);
}

function toggleParamKeyframe(paramKey) {
    masterTimeline.pause();
    const frame = parseInt(DOM.frameInput.value) || 0;
    const existingKfIndex = keyframes.findIndex(k => k.frame === frame);
    const state = getCurrentFullState();
    const hasKey = existingKfIndex !== -1 && keyframes[existingKfIndex].props.hasOwnProperty(paramKey);
    
    let isModified = dirtyProps.has(paramKey);
    if (hasKey && !isModified) {
        const kfVal = keyframes[existingKfIndex].props[paramKey];
        if (state[paramKey] !== kfVal) {
            isModified = true;
        }
    }

    if (hasKey && !isModified) {
        delete keyframes[existingKfIndex].props[paramKey];
        if (keyframes[existingKfIndex].easings) delete keyframes[existingKfIndex].easings[paramKey];
    } else {
        let targetKf;
        if (existingKfIndex !== -1) targetKf = keyframes[existingKfIndex];
        else { targetKf = { frame, props: {}, easings: {} }; keyframes.push(targetKf); }
        targetKf.props[paramKey] = state[paramKey];
        if (!targetKf.easings) targetKf.easings = {};
        // Default ease for new keyframe: linear
        if (!targetKf.easings[paramKey]) targetKf.easings[paramKey] = 'linear';
    }
    dirtyProps.delete(paramKey);
    cleanUpKeyframes(); syncTimelineRows(); drawKeyframesUI(); rebuildGSAPTimeline(); updateHighlights();
}

function syncKeyframeSelectionVisuals() {
    document.querySelectorAll('.keyframe').forEach(el => {
        const f = parseInt(el.dataset.frame), p = el.dataset.param;
        el.classList.toggle('selected', selectedKeyframes.some(s => s.frame === f && s.prop === p));
    });
    // Update ease preset buttons to reflect selection
    if (selectedKeyframes.length > 0) {
        const firstSel = selectedKeyframes[0];
        const kf = keyframes.find(k => k.frame === firstSel.frame);
        const ease = kf && kf.easings ? (kf.easings[firstSel.prop] || 'linear') : 'linear';
        DOM.btnEaseLinear.classList.toggle('active', ease === 'linear');
        DOM.btnEaseInOut.classList.toggle('active', ease === 'easeInOut');
        DOM.btnEaseConst.classList.toggle('active', ease === 'const');
    } else {
        DOM.btnEaseLinear.classList.add('active');
        DOM.btnEaseInOut.classList.remove('active');
        DOM.btnEaseConst.classList.remove('active');
    }
}

function drawKeyframesUI() {
    document.querySelectorAll('.keyframe').forEach(el => el.remove());
    const totalF = parseInt(DOM.totalFrames.value) || 300;

    keyframes.forEach(kf => {
        Object.keys(kf.props).forEach(prop => {
            const trackRow = DOM.tracks.querySelector(`.tl-track-row[data-trackid="${prop}"]`);
            if (!trackRow) return;

            const kfEl = document.createElement('div');
            kfEl.className = 'keyframe';
            kfEl.dataset.param = prop;
            kfEl.dataset.frame = kf.frame;
            kfEl.style.left = (kf.frame / totalF * 100) + '%';
            kfEl.title = `${t('tlFrame')} ${kf.frame} | ${PARAM_LABELS[prop]}${t('kfTooltipSuffix')}`;

            if (selectedKeyframes.some(s => s.frame === kf.frame && s.prop === prop)) kfEl.classList.add('selected');

            kfEl.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                masterTimeline.pause(); updatePlaybackUI();
                const isSelected = selectedKeyframes.some(s => s.frame === kf.frame && s.prop === prop);
                if (!isSelected) {
                    if (!e.shiftKey && !e.ctrlKey) selectedKeyframes = [];
                    selectedKeyframes.push({ frame: kf.frame, prop });
                    syncKeyframeSelectionVisuals();
                }
                dragGroupData = {
                    startMouseX: e.clientX,
                    trackWidth: trackRow.getBoundingClientRect().width,
                    initialKfs: selectedKeyframes.map(s => {
                        const origKf = keyframes.find(k => k.frame === s.frame);
                        return { originalFrame: s.frame, prop: s.prop, val: origKf.props[s.prop], ease: origKf.easings ? origKf.easings[s.prop] : 'linear' };
                    })
                };
                kfEl.setPointerCapture(e.pointerId);
            });

            kfEl.addEventListener('pointermove', (e) => {
                if (!dragGroupData) return;
                let deltaFrames = Math.round(((e.clientX - dragGroupData.startMouseX) / dragGroupData.trackWidth) * totalF);
                const minFrame = Math.min(...dragGroupData.initialKfs.map(k => k.originalFrame));
                const maxFrame = Math.max(...dragGroupData.initialKfs.map(k => k.originalFrame));
                if (minFrame + deltaFrames < 0) deltaFrames = -minFrame;
                if (maxFrame + deltaFrames > totalF) deltaFrames = totalF - maxFrame;
                dragGroupData.initialKfs.forEach(item => {
                    const newF = item.originalFrame + deltaFrames;
                    const el = document.querySelector(`.keyframe[data-param="${item.prop}"][data-frame="${item.originalFrame}"]`);
                    if (el) el.style.left = (newF / totalF * 100) + '%';
                });
                const mainNewFrame = kf.frame + deltaFrames;
                if (mainNewFrame >= 0 && mainNewFrame <= totalF) jumpToFrame(mainNewFrame, false);
            });

            kfEl.addEventListener('pointerup', (e) => {
                if (!dragGroupData) return;
                kfEl.releasePointerCapture(e.pointerId);
                let deltaFrames = Math.round(((e.clientX - dragGroupData.startMouseX) / dragGroupData.trackWidth) * totalF);
                const minFrame = Math.min(...dragGroupData.initialKfs.map(k => k.originalFrame));
                const maxFrame = Math.max(...dragGroupData.initialKfs.map(k => k.originalFrame));
                if (minFrame + deltaFrames < 0) deltaFrames = -minFrame;
                if (maxFrame + deltaFrames > totalF) deltaFrames = totalF - maxFrame;

                if (deltaFrames !== 0) {
                    dragGroupData.initialKfs.forEach(item => {
                        const oldKf = keyframes.find(k => k.frame === item.originalFrame);
                        if (oldKf) { delete oldKf.props[item.prop]; if (oldKf.easings) delete oldKf.easings[item.prop]; }
                    });
                    const newSelection = [];
                    dragGroupData.initialKfs.forEach(item => {
                        const targetFrame = item.originalFrame + deltaFrames;
                        let targetKf = keyframes.find(k => k.frame === targetFrame);
                        if (!targetKf) { targetKf = { frame: targetFrame, props: {}, easings: {} }; keyframes.push(targetKf); }
                        targetKf.props[item.prop] = item.val;
                        if (!targetKf.easings) targetKf.easings = {};
                        targetKf.easings[item.prop] = item.ease || 'linear';
                        newSelection.push({ frame: targetFrame, prop: item.prop });
                    });
                    selectedKeyframes = newSelection;
                }
                dragGroupData = null;
                cleanUpKeyframes(); syncTimelineRows(); drawKeyframesUI(); rebuildGSAPTimeline();
                jumpToFrame(parseInt(DOM.frameInput.value) || 0, true);
            });

            kfEl.addEventListener('contextmenu', (e) => {
                e.preventDefault(); e.stopPropagation();
                const val = kf.props[prop];
                DOM.ctxTitle.textContent = `${PARAM_LABELS[prop]} (${t('tlFrame')} ${kf.frame})`;
                DOM.ctxValue.value = val;
                DOM.ctxMenu.style.display = 'flex';
                DOM.ctxMenu.style.visibility = 'hidden';
                DOM.ctxMenu.style.visibility = 'visible';
                let topPos = e.clientY;
                if (topPos + DOM.ctxMenu.getBoundingClientRect().height > window.innerHeight) topPos = e.clientY - DOM.ctxMenu.getBoundingClientRect().height;
                DOM.ctxMenu.style.left = e.clientX + 'px'; DOM.ctxMenu.style.top = topPos + 'px';
                DOM.ctxSave.onclick = () => {
                    let newVal = DOM.ctxValue.value;
                    if (typeof val === 'number') newVal = parseFloat(newVal);
                    kf.props[prop] = newVal; DOM.ctxMenu.style.display = 'none';
                    cleanUpKeyframes(); drawKeyframesUI(); rebuildGSAPTimeline(); updateHighlights();
                    applyStateToDOM(getCurrentFullState());
                };
                DOM.ctxDel.onclick = () => {
                    delete kf.props[prop]; if (kf.easings) delete kf.easings[prop];
                    DOM.ctxMenu.style.display = 'none';
                    cleanUpKeyframes(); syncTimelineRows(); drawKeyframesUI(); rebuildGSAPTimeline(); updateHighlights();
                };
            });

            trackRow.appendChild(kfEl);
        });
    });
}

function updateHighlights() {
    const frame = parseInt(DOM.frameInput.value) || 0;
    const activeKf = keyframes.find(k => k.frame === frame);

    DOM.trackables.forEach(el => {
        el.classList.remove('is-dirty', 'is-in-keyframe');
        const key = el.dataset.key;
        if (dirtyProps.has(key)) el.classList.add('is-dirty');
        if (activeKf && activeKf.props.hasOwnProperty(key)) el.classList.add('is-in-keyframe');
    });

    document.querySelectorAll('.keyframe').forEach(el => {
        const elFrame = parseInt(el.dataset.frame), elParam = el.dataset.param;
        const isModified = (elFrame === frame) && dirtyProps.has(elParam);
        el.classList.toggle('active', (elFrame === frame) && !isModified);
        el.classList.toggle('modified', isModified);
    });

    document.querySelectorAll('.tl-dot').forEach(dot => {
        const key = dot.dataset.param;
        const hasKey = activeKf && activeKf.props.hasOwnProperty(key);
        const isDirty = dirtyProps.has(key);
        dot.classList.remove('active', 'dirty', 'modified');
        if (hasKey && !isDirty) { dot.classList.add('active'); dot.textContent = '✖'; }
        else if (hasKey && isDirty) { dot.classList.add('modified'); dot.textContent = '⟳'; }
        else if (!hasKey && isDirty) { dot.classList.add('dirty'); dot.textContent = '+'; }
        else { dot.textContent = ''; }
    });
}

// ─── APPLY STATE TO DOM ───
function applyStateToDOM(state) {
    let wrapper = DOM.box.querySelector('.text-wrapper');
    const currentRaw = wrapper ? wrapper.dataset.rawText : null;
    const currentRem = wrapper ? wrapper.dataset.remSpaces : null;
    const needsRebuild = !wrapper || currentRaw !== state.text || currentRem !== String(state.remSpaces);

    if (needsRebuild) {
        DOM.box.innerHTML = '<div class="text-wrapper" style="width:100%;"></div>';
        wrapper = DOM.box.querySelector('.text-wrapper');
        wrapper.dataset.rawText = state.text;
        wrapper.dataset.remSpaces = String(state.remSpaces);

        const paragraphs = state.text.split('\n');
        paragraphs.forEach(pText => {
            const pDiv = document.createElement('div'); pDiv.className = 'paragraph';
            const words = pText.split(/\s+/).filter(w => w.length > 0);
            words.forEach((word, wIndex) => {
                const wSpan = document.createElement('span'); wSpan.className = 'word';
                word.split('').forEach(char => {
                    const cSpan = document.createElement('span'); cSpan.className = 'char'; cSpan.textContent = char;
                    wSpan.appendChild(cSpan);
                });
                if (!state.remSpaces && wIndex < words.length - 1) {
                    const sp = document.createElement('span'); sp.className = 'char is-space'; sp.textContent = ' '; wSpan.appendChild(sp);
                }
                pDiv.appendChild(wSpan);
            });
            wrapper.appendChild(pDiv);
        });
    }

    wrapper = DOM.box.querySelector('.text-wrapper');
    DOM.box.style.justifyContent = state.alignV;
    DOM.canvas.style.backgroundColor = state.cBg;
//    DOM.box.style.border = '2px dashed #999';
    DOM.box.style.width = '100vw'; DOM.box.style.setProperty('height', '100vh', 'important');
    DOM.box.style.resize = 'none'; DOM.box.style.overflow = 'hidden';

    wrapper.style.fontFamily = state.font;
    wrapper.style.fontSize = state.fontsize + 'px';
    wrapper.style.lineHeight = state.lineheight.toString();
    wrapper.style.textAlign = state.align;
    Array.from(wrapper.children).forEach(p => p.style.textAlignLast = state.align === 'justify' ? 'justify' : 'auto');
    wrapper.style.wordSpacing = state.remSpaces ? '0px' : state.spacing + 'px';
    wrapper.style.whiteSpace = state.wrapText ? 'pre-wrap' : 'nowrap';

    // Seeds: seedPattern for highlight RNG, seed (animatable) for hide/randomFont RNG
    const staticSeed = Math.round(state.seed != null ? state.seed : (parseInt(DOM.seed.value) || 0));
    const patternSeed = Math.round(state.seedPattern || 0);
    const rngHighlight = mulberry32(patternSeed + 1234);
    const rngHide = mulberry32(staticSeed + 5678);
    const rngFont = mulberry32(staticSeed + 9999);

    let totalChars = 0, totalWords = 0, totalP = wrapper.children.length;
    wrapper.querySelectorAll('.paragraph').forEach(p => {
        totalWords += p.querySelectorAll('.word').length;
        totalChars += p.querySelectorAll('.char').length;
    });

    const revealRatio = state.textReveal / 100;
    const randomHideRatio = state.randomHide / 100;
    let pCounter = 0, wCounter = 0, cCounter = 0;

    wrapper.style.display = state.textReveal === 0 ? 'none' : 'block';
    const verticalPadding = state.bgFit ? Math.max(0, (state.lineheight - 1) / 2) : 0;

    // Gradient setup — rebuild stops from individual animatable keys (full replace)
    let grad = state.textGradient ? { ...state.textGradient } : { enabled: false, stops: [] };
    if (grad.enabled) {
        const rebuilt = [];
        const numStops = (grad.stops && grad.stops.length) || 0;
        for (let i = 0; i < numStops; i++) {
            const colorKey = 'gradStop' + i + 'Color';
            const posKey = 'gradStop' + i + 'Pos';
            const hasStopKeys = keyframes.some(kf => kf.props.hasOwnProperty(colorKey) || kf.props.hasOwnProperty(posKey));
            if (hasStopKeys && state[colorKey] !== undefined && state[posKey] !== undefined) {
                rebuilt.push({ color: state[colorKey], pos: parseFloat(state[posKey]) });
            } else if (grad.stops && i < grad.stops.length) {
                rebuilt.push(grad.stops[i]);
            }
        }
        grad.stops = rebuilt;
    }
    const gradEnabled = grad && grad.enabled && grad.stops && grad.stops.length >= 1;
    const gradTotal = gradEnabled ? (grad.mode === 'words' ? totalWords : totalChars) : 0;

    // ─── Pre-compute gradient fractions by screen position ───
    // Collect rects for all words/chars if gradient is enabled
    let gradFracWords = null, gradFracChars = null;
    if (gradEnabled) {

        function computeFracsForElements(elements) {
            const rects = elements.map(el => el.getBoundingClientRect());
            const canvasRect = DOM.canvas.getBoundingClientRect();

            if (grad.type === 'radial') {
                // Radial: distance from center (no rotation — moved to gradCx/gradCy animation)
                const rcx = state.gradCx != null ? state.gradCx : 50;
                const rcy = state.gradCy != null ? state.gradCy : 50;
                const rcr = state.gradCr != null ? state.gradCr : 0.5;
                const ocx = canvasRect.left + (rcx / 100) * canvasRect.width;
                const ocy = canvasRect.top + (rcy / 100) * canvasRect.height;
                const maxR = rcr * Math.max(canvasRect.width, canvasRect.height);
                return rects.map(r => {
                    const ecx = r.left + r.width / 2, ecy = r.top + r.height / 2;
                    const dist = Math.hypot(ecx - ocx, ecy - ocy);
                    return maxR > 0 ? Math.min(1, dist / maxR) : 0;
                });
            }

            // Linear: project elements onto the gradient axis, but center the axis at gradLx/gradLy
            const lx = state.gradLx != null ? state.gradLx : 50;
            const ly = state.gradLy != null ? state.gradLy : 50;
            const originX = canvasRect.left + (lx / 100) * canvasRect.width;
            const originY = canvasRect.top + (ly / 100) * canvasRect.height;
            // The gradient goes from -halfLen to +halfLen along the direction vector
            const halfLen = Math.max(canvasRect.width, canvasRect.height);
            const effectiveAngleRad = (state.gradAngle || 90) * Math.PI / 180;
            const edx = Math.sin(effectiveAngleRad), edy = -Math.cos(effectiveAngleRad);
            const projections = rects.map(r => {
                const ecx = r.left + r.width / 2, ecy = r.top + r.height / 2;
                return (ecx - originX) * edx + (ecy - originY) * edy;
            });
            // Map [-halfLen, +halfLen] to [0, 1] — center is 0.5
            return projections.map(p => Math.max(0, Math.min(1, 0.5 + p / (halfLen * 2))));
        }

        if (grad.mode === 'words') {
            const wordEls = Array.from(wrapper.querySelectorAll('.word'));
            gradFracWords = computeFracsForElements(wordEls);
        } else {
            const charEls = Array.from(wrapper.querySelectorAll('.char'));
            gradFracChars = computeFracsForElements(charEls);
        }
    }

    let gradWordIdx = 0, gradCharIdx = 0;

    Array.from(wrapper.children).forEach(pDiv => {
        const pVisible = (pCounter / Math.max(1, totalP)) <= revealRatio + 0.001;
        const pRndHide = state.randomHide > 0 && rngHide() < randomHideRatio;
        pDiv.style.display = state.revealMode === 'line' && !pVisible ? 'none' : 'block';
        pDiv.style.visibility = state.revealMode === 'line' && pRndHide ? 'hidden' : '';

        Array.from(pDiv.children).forEach(node => {
            if (!node.classList.contains('word')) return;
            const wVisible = (wCounter / Math.max(1, totalWords)) <= revealRatio + 0.001;
            const wRndHide = state.randomHide > 0 && rngHide() < randomHideRatio;

            // Pattern highlight
            let highlight = false;
            if (state.pattern === 'odd' && wCounter % 2 === 0) highlight = true;
            if (state.pattern === 'even' && wCounter % 2 !== 0) highlight = true;
            if (state.pattern === 'every3' && (wCounter + 1) % 3 === 0) highlight = true;
            if (state.pattern === 'random' && rngHighlight() > 0.5) highlight = true;

            // Palette: distribute by word fraction across palette (random pattern picks random palette color)
            let bgColor = state.cTextBg;
            if (state.palette.length > 0) {
                const n = state.palette.length;
                let paletteColor;
                if (state.pattern === 'random' && highlight) {
                    paletteColor = state.palette[Math.min(n - 1, Math.floor(rngHighlight() * n))];
                } else {
                    const frac = totalWords > 1 ? wCounter / (totalWords - 1) : 0;
                    paletteColor = state.palette[Math.min(n - 1, Math.floor(frac * n))];
                }
                bgColor = highlight ? paletteColor : state.cTextBg;
            }

            // Gradient overrides bg per-word (using screen-space fraction)
            if (gradEnabled && grad.mode === 'words') {
                const frac = gradFracWords ? (gradFracWords[gradWordIdx] ?? 0) : 0;
                bgColor = getGradientColor(grad.stops, grad.interp, frac);
                gradWordIdx++;
            }

            let wordColor = state.cText;

            // Random font — mix with main font
            let wordFont = state.font;
            if (state.randomFont !== 'none' && state.fontList && state.fontList.length > 0) {
                if (state.randomFont === 'words') {
                    const pool = [state.font, ...state.fontList];
                    const fi = Math.floor(rngFont() * pool.length);
                    wordFont = pool[fi];
                }
            }

            const hasCharGradient = gradEnabled && grad.mode === 'chars';
            node.style.backgroundColor = hasCharGradient ? 'transparent' : bgColor;
            node.style.backgroundImage = 'none';
            node.style.color = wordColor;
            node.style.fontFamily = wordFont;
            node.style.transition = 'border-radius 0.2s ease, padding 0.2s ease';
            
            const boxHeight = (state.bgFit ? state.lineheight : 1) * state.fontsize;
            const borderWordW = state.sWord ? state.sWordW : 0;
            const borderRadiusVal = `${state.sWordRadius * (boxHeight / 2 + borderWordW)}px`;
            node.style.borderRadius = borderRadiusVal;
            node.style.paddingLeft = hasCharGradient ? '0px' : `${state.sWordPadX * state.fontsize}px`;
            node.style.paddingRight = hasCharGradient ? '0px' : `${state.sWordPadX * state.fontsize}px`;
            node.style.paddingTop = `${verticalPadding}em`;
            node.style.paddingBottom = `${verticalPadding}em`;

            let isWordFullyHidden = false;
            if (state.revealMode === 'word' && !wVisible) isWordFullyHidden = true;
            if (state.revealMode === 'line' && !pVisible) isWordFullyHidden = true;
            const firstCharVisible = (cCounter / Math.max(1, totalChars)) <= revealRatio + 0.001;
            if (state.revealMode === 'char' && !firstCharVisible) isWordFullyHidden = true;

            node.style.border = state.sWord && !isWordFullyHidden && !(state.revealMode === 'word' && wRndHide)
                ? `${state.sWordW}px solid ${state.cStroke}` : 'none';
            node.style.display = state.revealMode === 'word' && !wVisible ? 'none' : 'inline';
            node.style.visibility = state.revealMode === 'word' && wRndHide ? 'hidden' : '';

            const cSpans = Array.from(node.querySelectorAll('.char'));
            cSpans.forEach((cSpan, idx) => {
                const cVisible = (cCounter / Math.max(1, totalChars)) <= revealRatio + 0.001;
                const cRndHide = state.randomHide > 0 && rngHide() < randomHideRatio;
                const isSpace = cSpan.classList.contains('is-space');
                const isCharFullyHidden = !cVisible && state.revealMode === 'char';

                cSpan.style.paddingTop = `${verticalPadding}em`;
                cSpan.style.paddingBottom = `${verticalPadding}em`;
                cSpan.style.transition = 'none';
                if (!isSpace) cSpan.style.letterSpacing = state.tracking + 'px';

                // Gradient per-char — apply to background (screen-space fraction)
                if (gradEnabled && grad.mode === 'chars') {
                    const frac = gradFracChars ? (gradFracChars[gradCharIdx] ?? 0) : 0;
                    cSpan.style.backgroundColor = getGradientColor(grad.stops, grad.interp, frac);
                    gradCharIdx++;
                } else {
                    cSpan.style.backgroundColor = '';
                }

                if (hasCharGradient) {
                    const borderCharW = state.sChar ? state.sCharW : 0;
                    const borderRadiusCharVal = `${state.sWordRadius * (boxHeight / 2 + borderCharW)}px`;
                    cSpan.style.paddingLeft = (idx === 0) ? `${state.sWordPadX * state.fontsize}px` : '0px';
                    cSpan.style.paddingRight = (idx === cSpans.length - 1) ? `${state.sWordPadX * state.fontsize}px` : '0px';
                    cSpan.style.borderTopLeftRadius = (idx === 0) ? borderRadiusCharVal : '0px';
                    cSpan.style.borderBottomLeftRadius = (idx === 0) ? borderRadiusCharVal : '0px';
                    cSpan.style.borderTopRightRadius = (idx === cSpans.length - 1) ? borderRadiusCharVal : '0px';
                    cSpan.style.borderBottomRightRadius = (idx === cSpans.length - 1) ? borderRadiusCharVal : '0px';
                } else {
                    cSpan.style.paddingLeft = '';
                    cSpan.style.paddingRight = '';
                    cSpan.style.borderTopLeftRadius = '';
                    cSpan.style.borderBottomLeftRadius = '';
                    cSpan.style.borderTopRightRadius = '';
                    cSpan.style.borderBottomRightRadius = '';
                }
                cSpan.style.color = '';

                // Random font per-char — mix with main font
                if (state.randomFont === 'chars' && state.fontList && state.fontList.length > 0) {
                    const pool = [state.font, ...state.fontList];
                    const fi = Math.floor(rngFont() * pool.length);
                    cSpan.style.fontFamily = pool[fi];
                } else {
                    cSpan.style.fontFamily = '';
                }

                cSpan.style.border = state.sChar && !isCharFullyHidden && !(state.revealMode === 'char' && cRndHide)
                    ? `${state.sCharW}px solid ${state.cStroke}` : 'none';
                if (state.revealMode === 'char') {
                    cSpan.style.display = cVisible ? 'inline' : 'none';
                    cSpan.style.visibility = cRndHide ? 'hidden' : '';
                } else {
                    cSpan.style.display = 'inline'; cSpan.style.visibility = '';
                }
                cCounter++;
            });
            wCounter++;
        });
        pCounter++;
    });

    // Adapt line height if needed
    const sampleWord = Array.from(wrapper.querySelectorAll('.word')).find(w => w.style.display !== 'none' && w.getBoundingClientRect().height > 0);
    if (sampleWord) {
        const wordRect = sampleWord.getBoundingClientRect();
        const expectedLH = state.lineheight * state.fontsize;
        if (wordRect.height > expectedLH + 1) wrapper.style.lineHeight = ((wordRect.height / state.fontsize) + 0.01).toFixed(3);
    }
}

// ─── PLAYBACK ───
function updatePlaybackUI() {
    if (masterTimeline.isActive()) {
        if (masterTimeline.reversed()) {
            DOM.playBtn.innerHTML = '▶'; DOM.playBtn.disabled = true;
            DOM.playRevBtn.innerHTML = '⏸'; DOM.playRevBtn.disabled = false;
        } else {
            DOM.playBtn.innerHTML = '⏸'; DOM.playBtn.disabled = false;
            DOM.playRevBtn.innerHTML = '◀'; DOM.playRevBtn.disabled = true;
        }
    } else {
        DOM.playBtn.innerHTML = '▶'; DOM.playBtn.disabled = false;
        DOM.playRevBtn.innerHTML = '◀'; DOM.playRevBtn.disabled = false;
    }
}

function rebuildGSAPTimeline() {
    const fps = parseInt(DOM.fps.value) || 30;
    const totalF = parseInt(DOM.totalFrames.value) || 300;
    const currentFrame = Math.round((masterTimeline.time() || 0) * fps);

    masterTimeline.clear(); masterTimeline.pause();
    masterTimeline.repeat(isLooping ? -1 : 0);

    const uiState = getCurrentFullState();
    const combinedDefault = { ...uiState, ...defaultState };
    const proxy = { ...combinedDefault };

    masterTimeline.to({}, { duration: totalF / fps }, 0);

    ANIMATABLE_KEYS.forEach(prop => {
        const propKfs = keyframes.filter(kf => kf.props.hasOwnProperty(prop)).sort((a, b) => a.frame - b.frame);
        if (propKfs.length > 0) {
            masterTimeline.set(proxy, { [prop]: propKfs[0].props[prop] }, 0);
            let prevFrame = propKfs[0].frame;
            for (let i = 1; i < propKfs.length; i++) {
                const kf = propKfs[i];
                const durFrames = kf.frame - prevFrame;
                // Per-keyframe ease: the ease of the destination keyframe
                const easeKey = kf.easings ? (kf.easings[prop] || 'linear') : 'linear';
                const gsapEase = EASE_PRESETS[easeKey] || 'none';
                if (durFrames > 0) {
                    masterTimeline.fromTo(proxy,
                        { [prop]: propKfs[i - 1].props[prop] },
                        { [prop]: kf.props[prop], duration: durFrames / fps, ease: gsapEase },
                        prevFrame / fps
                    );
                } else {
                    masterTimeline.set(proxy, { [prop]: kf.props[prop] }, prevFrame / fps);
                }
                prevFrame = kf.frame;
            }
        } else {
            masterTimeline.set(proxy, { [prop]: combinedDefault[prop] }, 0);
        }
    });

    function interpolateTextGradients(gradA, gradB, t) {
        if (!gradA || !gradB) return gradA || gradB;
        const result = { ...gradB, ...gradA };
        result.stops = [];
        const lenA = gradA.stops ? gradA.stops.length : 0;
        const lenB = gradB.stops ? gradB.stops.length : 0;
        const maxLen = Math.max(lenA, lenB);
        for (let i = 0; i < maxLen; i++) {
            const stopA = gradA.stops && gradA.stops[Math.min(i, lenA - 1)];
            const stopB = gradB.stops && gradB.stops[Math.min(i, lenB - 1)];
            if (stopA && stopB) {
                const interpolatedColor = lerpColor(stopA.color, stopB.color, t);
                const interpolatedPos = stopA.pos + (stopB.pos - stopA.pos) * t;
                result.stops.push({ color: interpolatedColor, pos: interpolatedPos });
            } else if (stopA) {
                result.stops.push(stopA);
            } else if (stopB) {
                result.stops.push(stopB);
            }
        }
        return result;
    }

    // Named update function so it can be called explicitly (e.g. during export frame jump)
    function _applyTimelineState(overrideFrame) {
        const tlTime = masterTimeline.time();
        const cFrame = overrideFrame !== undefined ? overrideFrame : Math.round(tlTime * fps);
        const combinedState = { ...getCurrentFullState() };

        DISCRETE_KEYS.forEach(key => {
            if (!dirtyProps.has(key)) {
                const propKfs = keyframes.filter(kf => kf.props.hasOwnProperty(key)).sort((a, b) => a.frame - b.frame);
                if (propKfs.length > 0) {
                    if (key === 'textGradient') {
                        const prevKf = [...propKfs].reverse().find(kf => kf.frame <= cFrame);
                        const nextKf = propKfs.find(kf => kf.frame > cFrame);
                        if (prevKf && nextKf) {
                            const gradA = prevKf.props[key];
                            const gradB = nextKf.props[key];
                            const easeKey = nextKf.easings ? (nextKf.easings[key] || 'linear') : 'linear';
                            const interpMode = gradB && gradB.interp;
                            if (interpMode !== 'const' && easeKey !== 'const') {
                                const totalFrames = nextKf.frame - prevKf.frame;
                                const currentFrames = cFrame - prevKf.frame;
                                let tVal = totalFrames > 0 ? (currentFrames / totalFrames) : 0;
                                if (easeKey === 'easeInOut') {
                                    tVal = tVal < 0.5 ? 4 * tVal * tVal * tVal : 1 - Math.pow(-2 * tVal + 2, 3) / 2;
                                }
                                combinedState[key] = interpolateTextGradients(gradA, gradB, tVal);
                            } else {
                                combinedState[key] = prevKf.props[key];
                            }
                        } else {
                            combinedState[key] = prevKf ? prevKf.props[key] : propKfs[0].props[key];
                        }
                    } else {
                        const activeKf = [...propKfs].reverse().find(kf => kf.frame <= cFrame);
                        combinedState[key] = activeKf ? activeKf.props[key] : propKfs[0].props[key];
                    }
                } else { combinedState[key] = combinedDefault[key]; }
            }
        });

        function isColorProp(key) {
            return key === 'cText' || key === 'cTextBg' || key === 'cBg' || key === 'cStroke' || 
                   (key.startsWith('gradStop') && key.endsWith('Color'));
        }

        ANIMATABLE_KEYS.forEach(k => {
            if (!dirtyProps.has(k)) {
                const propKfs = keyframes.filter(kf => kf.props.hasOwnProperty(k)).sort((a, b) => a.frame - b.frame);
                if (propKfs.length > 0 && isColorProp(k)) {
                    const prevKf = [...propKfs].reverse().find(kf => kf.frame <= cFrame);
                    const nextKf = propKfs.find(kf => kf.frame > cFrame);
                    if (prevKf && nextKf) {
                        const valA = prevKf.props[k];
                        const valB = nextKf.props[k];
                        const easeKey = nextKf.easings ? (nextKf.easings[k] || 'linear') : 'linear';
                        if (easeKey !== 'const' && valA && valB) {
                            const totalFrames = nextKf.frame - prevKf.frame;
                            const currentFrames = cFrame - prevKf.frame;
                            let tVal = totalFrames > 0 ? (currentFrames / totalFrames) : 0;
                            if (easeKey === 'easeInOut') {
                                tVal = tVal < 0.5 ? 4 * tVal * tVal * tVal : 1 - Math.pow(-2 * tVal + 2, 3) / 2;
                            }
                            combinedState[k] = lerpColor(valA, valB, tVal);
                        } else {
                            combinedState[k] = prevKf.props[k];
                        }
                    } else {
                        combinedState[k] = prevKf ? prevKf.props[k] : propKfs[0].props[k];
                    }
                } else {
                    combinedState[k] = keyframes.some(kf => kf.props.hasOwnProperty(k)) ? proxy[k] : combinedDefault[k];
                }
            }
        });

        syncUI(combinedState); applyStateToDOM(combinedState);
        if (!isDraggingTime) {
            DOM.frameInput.value = cFrame;
            DOM.playhead.style.left = (cFrame / totalF * 100) + '%';
            updateHighlights();
        }
    }

    // Expose for export frame jumping
    window._applyTimelineState = _applyTimelineState;

    masterTimeline.eventCallback('onUpdate', () => _applyTimelineState());

    masterTimeline.eventCallback('onComplete', updatePlaybackUI);
    masterTimeline.eventCallback('onReverseComplete', () => {
        if (isLooping && !isSeeking && !isDraggingTime) masterTimeline.time(totalF / fps).reverse();
        else updatePlaybackUI();
    });
    masterTimeline.eventCallback('onPause', updatePlaybackUI);
    masterTimeline.eventCallback('onPlay', updatePlaybackUI);

    masterTimeline.seek(currentFrame / fps, false);
    updatePlaybackUI();
}

function jumpToFrame(frame, doUpdate = true) {
    const totalF = parseInt(DOM.totalFrames.value) || 300;
    const fps = parseInt(DOM.fps.value) || 30;
    DOM.frameInput.value = frame;
    DOM.playhead.style.left = (frame / totalF * 100) + '%';
    if (doUpdate) { isSeeking = true; masterTimeline.seek(frame / fps, false); isSeeking = false; }
    updateHighlights();
}

function clearDirtyAnimatedProps() {
    const animatedProps = new Set();
    keyframes.forEach(kf => Object.keys(kf.props).forEach(k => animatedProps.add(k)));
    animatedProps.forEach(k => dirtyProps.delete(k));
}

function togglePlayback() {
    const wasActive = masterTimeline.isActive() && !masterTimeline.reversed();
    if (dirtyProps.size > 0) { clearDirtyAnimatedProps(); rebuildGSAPTimeline(); }
    if (wasActive) { masterTimeline.pause(); }
    else {
        const totalF = parseInt(DOM.totalFrames.value) || 300, fps = parseInt(DOM.fps.value) || 30;
        if (!isLooping && Math.round(masterTimeline.time() * fps) >= totalF) masterTimeline.restart();
        else { masterTimeline.reversed(false); masterTimeline.play(); }
    }
    updatePlaybackUI();
}

function togglePlaybackRev() {
    const wasActiveRev = masterTimeline.isActive() && masterTimeline.reversed();
    if (dirtyProps.size > 0) { clearDirtyAnimatedProps(); rebuildGSAPTimeline(); }
    if (wasActiveRev) { masterTimeline.pause(); }
    else {
        const totalF = parseInt(DOM.totalFrames.value) || 300, fps = parseInt(DOM.fps.value) || 30;
        if (masterTimeline.time() === 0) masterTimeline.time(totalF / fps);
        masterTimeline.reverse();
    }
    updatePlaybackUI();
}

function getUniqueKfFrames() { return [...new Set(keyframes.map(k => k.frame))].sort((a, b) => a - b); }

// ─── PROJECT I/O ───
function loadProjectData(jsonString) {
    masterTimeline.pause();
    try {
        const data = JSON.parse(jsonString);
        if (data.globalSettings) {
            if (data.globalSettings.seed !== undefined) DOM.seed.value = data.globalSettings.seed;
            DOM.fps.value = data.globalSettings.fps || 30;
            DOM.totalFrames.value = data.globalSettings.totalFrames || 300;
        }

        let fullLoadedState = { ...getCurrentFullState(), ...(data.defaultState || {}) };
        if (fullLoadedState.cText && fullLoadedState.cStroke === undefined) fullLoadedState.cStroke = fullLoadedState.cText;

        defaultState = { ...fullLoadedState };
        syncUI(defaultState);
        applyStateToDOM(defaultState);

        keyframes = (data.keyframes || []).map(kf => {
            if (kf.time !== undefined) return { frame: Math.round(kf.time * (parseInt(DOM.fps.value) || 30)), props: kf.props || {}, easings: kf.easings || {} };
            if (kf.props) {
                if (kf.props.boxH !== undefined) delete kf.props.boxH;
                if (kf.props.boxSize !== undefined) { kf.props.boxW = kf.props.boxSize; delete kf.props.boxSize; }
                if (kf.props.cText && kf.props.cStroke === undefined) kf.props.cStroke = kf.props.cText;
                // Remove deprecated global ease/manualSize keys
                delete kf.props.ease; delete kf.props.manualSize; delete kf.props.hideBoxUI;
            } else {
                kf.props = {};
            }
            return { frame: kf.frame, props: kf.props, easings: kf.easings || {} };
        });

        dirtyProps.clear(); selectedKeyframes = [];

        if (keyframes.length > 0) currentPalette = [...(keyframes[keyframes.length - 1].props.palette || defaultState.palette || ['#ffffff', '#ff003c'])];
        else if (defaultState.palette) currentPalette = [...defaultState.palette];

        if (data.currentFontList) currentFontList = [...data.currentFontList];

        renderPaletteUI(); renderFontListUI();
        cleanUpKeyframes(); syncTimelineRows(); drawKeyframesUI(); rebuildGSAPTimeline();
        jumpToFrame(0); DOM.fileImport.value = '';
    } catch (err) { alert(t('errLoadFile')); console.error(err); }
}
