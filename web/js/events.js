// events.js — v0.1.27 (native/WebView2)

// ─── TIMELINE RESIZE ───
let isResizingTL = false;
DOM.tlResizer.addEventListener('mousedown', () => { isResizingTL = true; document.body.style.cursor = 'ns-resize'; });
window.addEventListener('mousemove', (e) => {
    if (!isResizingTL) return;
    let newH = Math.max(150, Math.min(window.innerHeight - e.clientY, window.innerHeight - 100));
    DOM.timelinePanel.style.height = newH + 'px';
    DOM.sidebar.style.maxHeight = `calc(100vh - ${newH + 30}px)`;
});
window.addEventListener('mouseup', () => { isResizingTL = false; document.body.style.cursor = ''; });

// ─── SIDEBAR & UI TOGGLERS ───
DOM.btnToggleSidebar.addEventListener('click', () => {
    DOM.fileActionsStack.classList.toggle('hidden');
});

DOM.btnToggleUI.addEventListener('click', () => {
    document.body.classList.toggle('hide-ui');
});

DOM.zoom.addEventListener('input', updateZoom);

// ─── SETTINGS PANEL ───
DOM.settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    DOM.settingsPanel.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
    if (!DOM.settingsPanel.contains(e.target) && e.target !== DOM.settingsBtn) DOM.settingsPanel.classList.add('hidden');
    if (!DOM.ctxMenu.contains(e.target)) DOM.ctxMenu.style.display = 'none';
});

DOM.btnThemeLight.addEventListener('click', () => applyTheme('light'));
DOM.btnThemeDark.addEventListener('click', () => applyTheme('dark'));
DOM.btnLangRu.addEventListener('click', () => {
    currentLang = 'ru';
    applyI18n();
    syncTimelineRows();
});
DOM.btnLangEn.addEventListener('click', () => {
    currentLang = 'en';
    applyI18n();
    syncTimelineRows();
});

// ─── EASE PRESETS ───
[DOM.btnEaseLinear, DOM.btnEaseInOut, DOM.btnEaseConst].forEach(btn => {
    btn.addEventListener('click', () => {
        const easeKey = btn.dataset.ease;
        selectedKeyframes.forEach(sel => {
            const kf = keyframes.find(k => k.frame === sel.frame);
            if (kf) {
                if (!kf.easings) kf.easings = {};
                kf.easings[sel.prop] = easeKey;
            }
        });
        [DOM.btnEaseLinear, DOM.btnEaseInOut, DOM.btnEaseConst].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (selectedKeyframes.length > 0) { rebuildGSAPTimeline(); }
    });
});

// ─── PALETTE ───
document.getElementById('add-color-btn').addEventListener('click', () => {
    currentPalette.push('#000000');
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('palette'); updateHighlights(); }
    renderPaletteUI(); applyStateToDOM(getCurrentFullState());
});

// ─── SPACING RESET ───
DOM.resetSpacingBtn.addEventListener('click', (e) => {
    e.preventDefault();
    DOM.tracking.value = '2'; DOM.trackingNum.value = '2';
    DOM.spacing.value = '20'; DOM.spacingNum.value = '20';
    DOM.lineheight.value = '1.2'; DOM.lineheightNum.value = '1.2';
    applyStateToDOM(getCurrentFullState());
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('tracking'); dirtyProps.add('spacing'); dirtyProps.add('lineheight'); updateHighlights(); }
});

// ─── GRADIENT ───
DOM.gradientEnabled.addEventListener('change', () => {
    DOM.gradientSettings.style.display = DOM.gradientEnabled.checked ? 'block' : 'none';
    if (DOM.gradientEnabled.checked) {
        // Default stops if none exist
        const currentStops = getCurrentGradientState().stops;
        if (currentStops.length === 0) {
            const h1 = document.createElement('div');
            h1.className = 'gradient-stop-handle';
            h1.dataset.color = '#000000'; h1.dataset.pos = '0';
            h1.style.left = '0%'; h1.style.backgroundColor = '#000000';
            DOM.gradientStopsBar.appendChild(h1);
            const h2 = document.createElement('div');
            h2.className = 'gradient-stop-handle';
            h2.dataset.color = '#ffffff'; h2.dataset.pos = '1';
            h2.style.left = '100%'; h2.style.backgroundColor = '#ffffff';
            DOM.gradientStopsBar.appendChild(h2);
            renderGradientStopsUI();
        }
        requestAnimationFrame(() => {
            const isRadial = DOM.gradientType.value === 'radial';
            isRadial ? drawGradientRadialCanvas() : drawGradientAngleCanvas();
        });
    }
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyGradientStopKeys(); }
    applyStateToDOM(getCurrentFullState());
});

DOM.gradientType.addEventListener('change', () => {
    const isRadial = DOM.gradientType.value === 'radial';
    DOM.gradientLinearUI.style.display = isRadial ? 'none' : 'block';
    DOM.gradientRadialUI.style.display = isRadial ? 'block' : 'none';
    requestAnimationFrame(() => { isRadial ? drawGradientRadialCanvas() : drawGradientAngleCanvas(); });
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyGradientStopKeys(); }
    applyStateToDOM(getCurrentFullState());
});

DOM.gradientMode.addEventListener('change', () => {
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyGradientStopKeys(); }
    applyStateToDOM(getCurrentFullState());
});

document.getElementById('btn-grad-interp-linear').addEventListener('click', () => {
    document.getElementById('btn-grad-interp-linear').classList.add('active');
    document.getElementById('btn-grad-interp-const').classList.remove('active');
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyGradientStopKeys(); }
    applyStateToDOM(getCurrentFullState());
});
document.getElementById('btn-grad-interp-const').addEventListener('click', () => {
    document.getElementById('btn-grad-interp-const').classList.add('active');
    document.getElementById('btn-grad-interp-linear').classList.remove('active');
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyGradientStopKeys(); }
    applyStateToDOM(getCurrentFullState());
});

DOM.gradientAngle.addEventListener('input', () => {
    drawGradientAngleCanvas();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradAngle'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});

DOM.gradLx.addEventListener('input', () => {
    DOM.gradCx.value = DOM.gradLx.value;
    DOM.gradCxNum.value = DOM.gradLx.value;
    DOM.gradientRadialCanvas.dataset.cx = DOM.gradLx.value;
    drawGradientAngleCanvas();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradLx'); dirtyProps.add('gradCx'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});
DOM.gradLy.addEventListener('input', () => {
    DOM.gradCy.value = DOM.gradLy.value;
    DOM.gradCyNum.value = DOM.gradLy.value;
    DOM.gradientRadialCanvas.dataset.cy = DOM.gradLy.value;
    drawGradientAngleCanvas();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradLy'); dirtyProps.add('gradCy'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});
DOM.gradCx.addEventListener('input', () => {
    DOM.gradLx.value = DOM.gradCx.value;
    DOM.gradLxNum.value = DOM.gradCx.value;
    DOM.gradientRadialCanvas.dataset.cx = DOM.gradCx.value;
    drawGradientRadialCanvas();
    drawGradientAngleCanvas();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradCx'); dirtyProps.add('gradLx'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});
DOM.gradCy.addEventListener('input', () => {
    DOM.gradLy.value = DOM.gradCy.value;
    DOM.gradLyNum.value = DOM.gradCy.value;
    DOM.gradientRadialCanvas.dataset.cy = DOM.gradCy.value;
    drawGradientRadialCanvas();
    drawGradientAngleCanvas();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradCy'); dirtyProps.add('gradLy'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});
DOM.gradCr.addEventListener('input', () => {
    DOM.gradientRadialCanvas.dataset.cr = DOM.gradCr.value;
    drawGradientRadialCanvas();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradCr'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});

document.getElementById('add-gradient-stop-btn').addEventListener('click', () => {
    const stops = getCurrentGradientState().stops;
    const newPos = stops.length > 0 ? Math.min(1, stops[stops.length - 1].pos + 0.2) : 0.5;
    const h = document.createElement('div');
    h.className = 'gradient-stop-handle';
    h.dataset.color = '#888888'; h.dataset.pos = newPos;
    h.style.left = (newPos * 100) + '%'; h.style.backgroundColor = '#888888';
    DOM.gradientStopsBar.appendChild(h);
    renderGradientStopsUI();
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyGradientStopKeys(); }
    applyStateToDOM(getCurrentFullState());
});

// Angle canvas drag (three zones: center handle → move center, arrow tip → angle, rest → angle)
DOM.gradientAngleCanvas.addEventListener('pointerdown', function(e) {
    const rect = this.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const lx = isNaN(parseFloat(DOM.gradLx.value)) ? 50 : parseFloat(DOM.gradLx.value);
    const ly = isNaN(parseFloat(DOM.gradLy.value)) ? 50 : parseFloat(DOM.gradLy.value);
    const dotCx = (lx / 100) * w, dotCy = (ly / 100) * h;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const distCenter = Math.hypot(mx - dotCx, my - dotCy);

    const rLen = Math.min(w, h) / 2 - 6;
    const angleRad = (isNaN(parseFloat(DOM.gradientAngle.value)) ? 90 : parseFloat(DOM.gradientAngle.value)) * Math.PI / 180;
    const dx2 = Math.sin(angleRad), dy2 = -Math.cos(angleRad);
    const tipX = dotCx + dx2 * rLen, tipY = dotCy + dy2 * rLen;
    const distTip = Math.hypot(mx - tipX, my - tipY);

    const movingCenter = (distCenter < 12);

    const updateAngle = (ev) => {
        const nx = ev.clientX - rect.left, ny = ev.clientY - rect.top;
        if (movingCenter) {
            const newLx = Math.max(0, Math.min(100, (nx / w) * 100));
            const newLy = Math.max(0, Math.min(100, (ny / h) * 100));
            const strLx = Math.round(newLx).toString();
            const strLy = Math.round(newLy).toString();
            DOM.gradLx.value = strLx;
            DOM.gradLy.value = strLy;
            DOM.gradLxNum.value = strLx;
            DOM.gradLyNum.value = strLy;
            DOM.gradCx.value = strLx;
            DOM.gradCxNum.value = strLx;
            DOM.gradCy.value = strLy;
            DOM.gradCyNum.value = strLy;
            DOM.gradientRadialCanvas.dataset.cx = strLx;
            DOM.gradientRadialCanvas.dataset.cy = strLy;
            DOM.gradLx.dispatchEvent(new Event('input', { bubbles: true }));
            DOM.gradLy.dispatchEvent(new Event('input', { bubbles: true }));
            drawGradientAngleCanvas();
            if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradLx'); dirtyProps.add('gradLy'); dirtyProps.add('gradCx'); dirtyProps.add('gradCy'); updateHighlights(); }
        } else {
            // Angle from center point to cursor
            const x = nx - dotCx, y = ny - dotCy;
            let angle = Math.round(Math.atan2(y, x) * 180 / Math.PI + 90);
            if (angle < 0) angle += 360;
            DOM.gradientAngle.value = angle % 360;
            drawGradientAngleCanvas();
            if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradAngle'); }
        }
        applyStateToDOM(getCurrentFullState());
    };
    updateAngle(e);
    this.setPointerCapture(e.pointerId);
    this.addEventListener('pointermove', updateAngle);
    this.addEventListener('pointerup', () => this.removeEventListener('pointermove', updateAngle), { once: true });
});

// Radial canvas drag (center + radius handle)
DOM.gradientRadialCanvas.addEventListener('pointerdown', function(e) {
    const rect = this.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const cx = (parseFloat(this.dataset.cx || '50') / 100) * w;
    const cy2 = (parseFloat(this.dataset.cy || '50') / 100) * h;
    const cr = parseFloat(this.dataset.cr || '0.5');
    const rx = cx + cr * w * 0.5, ry = cy2;
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const distCenter = Math.hypot(mx - cx, my - cy2);
    const distRadius = Math.hypot(mx - rx, my - ry);
    const movingCenter = distCenter <= distRadius;

    const updateRadial = (ev) => {
        const nx = ev.clientX - rect.left, ny = ev.clientY - rect.top;
        if (movingCenter) {
            this.dataset.cx = Math.max(0, Math.min(100, (nx / w) * 100));
            this.dataset.cy = Math.max(0, Math.min(100, (ny / h) * 100));
        } else {
            const ncx = (parseFloat(this.dataset.cx || '50') / 100) * w;
            this.dataset.cr = Math.max(0.05, Math.min(2, (nx - ncx) / (w * 0.5)));
        }
        const newCx = Math.round(parseFloat(this.dataset.cx)).toString();
        const newCy = Math.round(parseFloat(this.dataset.cy)).toString();
        const newCr = parseFloat(this.dataset.cr).toFixed(2);
        
        DOM.gradCx.value = newCx;
        DOM.gradCxNum.value = newCx;
        DOM.gradCy.value = newCy;
        DOM.gradCyNum.value = newCy;
        DOM.gradCr.value = newCr;
        DOM.gradCrNum.value = newCr;
        DOM.gradLx.value = newCx;
        DOM.gradLxNum.value = newCx;
        DOM.gradLy.value = newCy;
        DOM.gradLyNum.value = newCy;
        drawGradientRadialCanvas();
        if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('gradCx'); dirtyProps.add('gradCy'); dirtyProps.add('gradCr'); dirtyProps.add('gradLx'); dirtyProps.add('gradLy'); updateHighlights(); }
        DOM.gradCx.dispatchEvent(new Event('input', { bubbles: true }));
        DOM.gradCy.dispatchEvent(new Event('input', { bubbles: true }));
        DOM.gradCr.dispatchEvent(new Event('input', { bubbles: true }));
    };
    updateRadial(e);
    this.setPointerCapture(e.pointerId);
    this.addEventListener('pointermove', updateRadial);
    this.addEventListener('pointerup', () => this.removeEventListener('pointermove', updateRadial), { once: true });
});

// ─── KEYFRAME ALL GRADIENT STOPS ───
const btnKeyAllStops = document.getElementById('btn-keyframe-all-stops');
if (btnKeyAllStops) {
    btnKeyAllStops.addEventListener('click', () => {
        masterTimeline.pause();
        const frame = parseInt(DOM.frameInput.value) || 0;
        const handles = DOM.gradientStopsBar.querySelectorAll('.gradient-stop-handle');
        handles.forEach((h, i) => {
            if (i >= 8) return;
            const colorKey = 'gradStop' + i + 'Color';
            const posKey = 'gradStop' + i + 'Pos';
            const colorVal = h.dataset.color || '#000000';
            const posVal = parseFloat(h.dataset.pos) || 0;
            // Toggle keyframe for each prop
            let existingKf = keyframes.find(k => k.frame === frame);
            const hasColorKey = existingKf && existingKf.props.hasOwnProperty(colorKey);
            const hasPosKey = existingKf && existingKf.props.hasOwnProperty(posKey);
            if (!existingKf) { existingKf = { frame, props: {}, easings: {} }; keyframes.push(existingKf); }
            existingKf.props[colorKey] = colorVal;
            existingKf.props[posKey] = posVal;
            if (!existingKf.easings) existingKf.easings = {};
            existingKf.easings[colorKey] = 'linear';
            existingKf.easings[posKey] = 'linear';
            dirtyProps.delete(colorKey);
            dirtyProps.delete(posKey);
        });
        updateUnkeyframedDefaults();
        cleanUpKeyframes(); syncTimelineRows(); drawKeyframesUI(); rebuildGSAPTimeline(); updateHighlights();
    });
}

// ─── RANDOM FONT ───
DOM.randomFont.addEventListener('change', () => {
    DOM.randomFontSection.style.display = DOM.randomFont.value !== 'none' ? 'block' : 'none';
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('randomFont'); updateHighlights(); }
    applyStateToDOM(getCurrentFullState());
});

document.getElementById('add-font-btn').addEventListener('click', () => {
    const firstOpt = DOM.font.options[0];
    const fontValue = firstOpt ? firstOpt.value : "'PT Sans', sans-serif";
    currentFontList.push(fontValue);
    if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add('fontList'); }
    renderFontListUI(); applyStateToDOM(getCurrentFullState());
});

// ─── RANGE SYNC ───
document.querySelectorAll('input[type="range"]').forEach(range => {
    const num = document.getElementById(range.id + '-num');
    if (num) {
        range.addEventListener('input', () => { num.value = range.value; });
        num.addEventListener('input', () => { range.value = num.value; });
    }
});

// ─── MAIN INPUT LISTENER ───
document.querySelectorAll('input:not(#timeline-frame):not(#ctrl-total-frames):not(#ctrl-fps):not(#ctx-value):not(#ctrl-zoom):not(#ctrl-font-search), select:not(#ctrl-font), textarea').forEach(el => {
    el.addEventListener('input', () => {
        applyStateToDOM(getCurrentFullState());
        if (isUpdatingUI) return;
        updateUnkeyframedDefaults();
        const key = el.closest('.trackable')?.dataset.key;
        if (key) { dirtyProps.add(key); updateHighlights(); }
    });
});

// ─── FPS / TOTAL FRAMES ───
DOM.fps.addEventListener('change', () => rebuildGSAPTimeline());
DOM.totalFrames.addEventListener('change', () => {
    masterTimeline.pause();
    drawKeyframesUI(); rebuildGSAPTimeline();
    jumpToFrame(parseInt(DOM.frameInput.value) || 0, false);
    updatePlaybackUI();
});

// ─── PLAYBACK ───
DOM.playBtn.addEventListener('click', togglePlayback);
DOM.playRevBtn.addEventListener('click', togglePlaybackRev);
DOM.loopBtn.addEventListener('click', () => {
    isLooping = !isLooping;
    DOM.loopBtn.classList.toggle('active-loop', isLooping);
    masterTimeline.repeat(isLooping ? -1 : 0);
});
DOM.goStartBtn.addEventListener('click', () => { masterTimeline.pause(); jumpToFrame(0); updatePlaybackUI(); });
DOM.goEndBtn.addEventListener('click', () => { masterTimeline.pause(); jumpToFrame(parseInt(DOM.totalFrames.value) || 300); updatePlaybackUI(); });
DOM.prevKfBtn.addEventListener('click', () => {
    masterTimeline.pause();
    const cf = parseInt(DOM.frameInput.value) || 0;
    const frames = getUniqueKfFrames().filter(f => f < cf);
    jumpToFrame(frames.length ? Math.max(...frames) : 0); updatePlaybackUI();
});
DOM.nextKfBtn.addEventListener('click', () => {
    masterTimeline.pause();
    const cf = parseInt(DOM.frameInput.value) || 0;
    const frames = getUniqueKfFrames().filter(f => f > cf);
    jumpToFrame(frames.length ? Math.min(...frames) : (parseInt(DOM.totalFrames.value) || 300)); updatePlaybackUI();
});
DOM.frameInput.addEventListener('change', () => { masterTimeline.pause(); jumpToFrame(parseInt(DOM.frameInput.value) || 0); updatePlaybackUI(); });

// ─── TIMELINE POINTER (seek + marquee select) ───
DOM.tracks.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.keyframe')) return;
    const tracksRect = DOM.tracks.getBoundingClientRect();
    if (e.shiftKey) {
        selectData = { startX: e.clientX - tracksRect.left, startY: e.clientY - tracksRect.top };
        Object.assign(DOM.selBox.style, { left: selectData.startX + 'px', top: selectData.startY + 'px', width: '0', height: '0', display: 'block' });
    } else {
        selectedKeyframes = []; syncKeyframeSelectionVisuals();
        isDraggingTime = true; masterTimeline.pause(); updatePlaybackUI(); clearDirtyAnimatedProps();
        const totalF = parseInt(DOM.totalFrames.value) || 300;
        jumpToFrame(Math.round(Math.max(0, Math.min((e.clientX - tracksRect.left) / tracksRect.width, 1)) * totalF));
    }
});

window.addEventListener('pointermove', (e) => {
    const tracksRect = DOM.tracks.getBoundingClientRect();
    if (selectData) {
        let cx = Math.max(0, Math.min(e.clientX - tracksRect.left, tracksRect.width));
        let cy = Math.max(0, Math.min(e.clientY - tracksRect.top, tracksRect.height));
        const sx = Math.min(selectData.startX, cx), sy = Math.min(selectData.startY, cy);
        Object.assign(DOM.selBox.style, { left: sx + 'px', top: sy + 'px', width: Math.abs(cx - selectData.startX) + 'px', height: Math.abs(cy - selectData.startY) + 'px' });
        const selRect = DOM.selBox.getBoundingClientRect();
        document.querySelectorAll('.keyframe').forEach(el => {
            const kr = el.getBoundingClientRect();
            const hit = !(selRect.right < kr.left || selRect.left > kr.right || selRect.bottom < kr.top || selRect.top > kr.bottom);
            const f = parseInt(el.dataset.frame), p = el.dataset.param;
            if (hit || selectedKeyframes.some(s => s.frame === f && s.prop === p)) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    } else if (isDraggingTime) {
        const totalF = parseInt(DOM.totalFrames.value) || 300;
        jumpToFrame(Math.round(Math.max(0, Math.min((e.clientX - tracksRect.left) / tracksRect.width, 1)) * totalF));
    }
});

window.addEventListener('pointerup', () => {
    if (selectData) {
        const selRect = DOM.selBox.getBoundingClientRect();
        document.querySelectorAll('.keyframe').forEach(el => {
            const kr = el.getBoundingClientRect();
            if (!(selRect.right < kr.left || selRect.left > kr.right || selRect.bottom < kr.top || selRect.top > kr.bottom)) {
                const f = parseInt(el.dataset.frame), p = el.dataset.param;
                if (!selectedKeyframes.some(s => s.frame === f && s.prop === p)) selectedKeyframes.push({ frame: f, prop: p });
            }
        });
        DOM.selBox.style.display = 'none'; selectData = null; syncKeyframeSelectionVisuals();
    }
    isDraggingTime = false;
});

// ─── EXPORT / IMPORT (WebView2 native dialogs via C#) ───

function _buildExportJson() {
    const exportDefault = { ...getCurrentFullState(), ...defaultState };
    const exportData = {
        version: '0.0.8',
        globalSettings: { seed: DOM.seed.value, fps: DOM.fps.value, totalFrames: DOM.totalFrames.value },
        defaultState: exportDefault,
        keyframes,
        currentFontList
    };
    return JSON.stringify(exportData, null, 2);
}

function _receiveFileContent(jsonString) {
    loadProjectData(jsonString);
}

DOM.exportBtn.addEventListener('click', () => {
    const jsonString = _buildExportJson();
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({ action: 'save', data: jsonString }));
    } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([jsonString], { type: 'application/json' }));
        a.download = 'minmotion.bmtp'; a.click();
    }
});

DOM.importBtn.addEventListener('click', () => {
    masterTimeline.pause();
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({ action: 'open' }));
    } else {
        DOM.fileImport.click();
    }
});

DOM.fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadProjectData(ev.target.result);
    reader.readAsText(file);
});

// ─── KEYBOARD ───
document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if ((e.code === 'Space' || e.key === ' ') && !isInput) { e.preventDefault(); togglePlayback(); }
    if (e.key.toLowerCase() === 'h' && !isInput) document.body.classList.toggle('hide-ui');
    if ((e.code === 'Delete' || e.code === 'Backspace') && !isInput && selectedKeyframes.length > 0) {
        selectedKeyframes.forEach(sk => {
            const kf = keyframes.find(k => k.frame === sk.frame);
            if (kf) { delete kf.props[sk.prop]; if (kf.easings) delete kf.easings[sk.prop]; }
        });
        selectedKeyframes = [];
        cleanUpKeyframes(); syncTimelineRows(); drawKeyframesUI(); rebuildGSAPTimeline(); updateHighlights();
    }
});

// ─── LABEL TRACKABLE CLICK FIX ───
document.querySelectorAll('label.trackable').forEach(label => {
    label.addEventListener('click', (e) => {
        if (!e.target.closest('input,textarea,select,button,a')) e.preventDefault();
    });
});

// ─── FONT DROPDOWN ───
const fontDropdownTrigger = document.getElementById('font-dropdown-trigger');
const fontDropdownPanel = document.getElementById('font-dropdown-panel');
const fontDropdownLabel = document.getElementById('font-dropdown-label');
const fontOptionsList = document.getElementById('font-options-list');

function openFontDropdown() {
    fontDropdownTrigger.classList.add('open'); fontDropdownPanel.classList.add('open');
    DOM.fontSearch.value = ''; filterFontOptions('');
    setTimeout(() => DOM.fontSearch.focus(), 50);
}
function closeFontDropdown() { fontDropdownTrigger.classList.remove('open'); fontDropdownPanel.classList.remove('open'); }
function filterFontOptions(term) {
    fontOptionsList.querySelectorAll('.font-option').forEach(opt => {
        opt.classList.toggle('hidden', !opt.textContent.toLowerCase().includes(term.toLowerCase()));
    });
}
function selectFontOption(value, label) {
    DOM.font.value = value;
    if (DOM.font.value !== value) {
        const opt = document.createElement('option'); opt.value = value; opt.textContent = label;
        DOM.font.appendChild(opt); DOM.font.value = value;
    }
    fontDropdownLabel.textContent = label;
    fontOptionsList.querySelectorAll('.font-option').forEach(el => el.classList.toggle('selected', el.dataset.value === value));
    closeFontDropdown();
    DOM.font.dispatchEvent(new Event('input', { bubbles: true }));
}

fontDropdownTrigger.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    fontDropdownPanel.classList.contains('open') ? closeFontDropdown() : openFontDropdown();
});
document.addEventListener('click', (e) => { if (!e.target.closest('.font-dropdown-wrapper')) closeFontDropdown(); });
fontDropdownPanel.addEventListener('click', (e) => e.stopPropagation());
DOM.fontSearch.addEventListener('input', (e) => filterFontOptions(e.target.value));
fontOptionsList.addEventListener('click', (e) => {
    e.stopPropagation();
    const opt = e.target.closest('.font-option');
    if (opt && !opt.classList.contains('hidden')) selectFontOption(opt.dataset.value, opt.textContent);
});
DOM.fontSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeFontDropdown(); return; }
    if (e.key === 'Enter') { const first = fontOptionsList.querySelector('.font-option:not(.hidden)'); if (first) selectFontOption(first.dataset.value, first.textContent); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); const vis = [...fontOptionsList.querySelectorAll('.font-option:not(.hidden)')]; if (vis.length) vis[0].focus(); }
});
fontOptionsList.addEventListener('keydown', (e) => {
    const vis = [...fontOptionsList.querySelectorAll('.font-option:not(.hidden)')];
    const idx = vis.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (idx < vis.length - 1) vis[idx + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (idx > 0) vis[idx - 1].focus(); else DOM.fontSearch.focus(); }
    if (e.key === 'Enter') { e.preventDefault(); const opt = document.activeElement.closest('.font-option'); if (opt) selectFontOption(opt.dataset.value, opt.textContent); }
    if (e.key === 'Escape') closeFontDropdown();
});
fontOptionsList.querySelectorAll('.font-option').forEach(opt => opt.setAttribute('tabindex', '0'));

DOM.font.addEventListener('input', () => {
    applyStateToDOM(getCurrentFullState());
    if (isUpdatingUI) return;
    updateUnkeyframedDefaults();
    const hasFontKfs = keyframes.some(kf => kf.props.hasOwnProperty('font'));
    if (hasFontKfs) {
        dirtyProps.add('font');
    }
    rebuildGSAPTimeline();
    updateHighlights();
});

function rebuildFontDropdownOptions() {
    const currentValue = DOM.font.value;
    fontOptionsList.innerHTML = '';
    Array.from(DOM.font.options).forEach(opt => {
        const div = document.createElement('div');
        div.className = 'font-option' + (opt.value === currentValue ? ' selected' : '');
        div.dataset.value = opt.value; div.textContent = opt.textContent; div.setAttribute('tabindex', '0');
        fontOptionsList.appendChild(div);
    });
    const selOpt = DOM.font.options[DOM.font.selectedIndex];
    if (selOpt) fontDropdownLabel.textContent = selOpt.textContent;
}

async function loadSystemFonts() {
    if (!('queryLocalFonts' in window)) return;
    try {
        const oldVal = DOM.font.value;
        const fonts = await window.queryLocalFonts();
        DOM.font.innerHTML = '';
        [...new Set(fonts.map(f => f.family))].sort().forEach(f => {
            const opt = document.createElement('option'); opt.value = `"${f}", sans-serif`; opt.textContent = f; DOM.font.appendChild(opt);
        });
        if (oldVal) {
            DOM.font.value = oldVal;
            if (DOM.font.value !== oldVal) {
                let label = oldVal.replace(/['"]/g, '').split(',')[0].trim();
                const opt = document.createElement('option'); opt.value = oldVal; opt.textContent = label;
                DOM.font.appendChild(opt);
                DOM.font.value = oldVal;
            }
        }
        rebuildFontDropdownOptions();
    } catch (err) {}
}

window._receiveSystemFonts = function(fontsArray) {
    if (!Array.isArray(fontsArray) || fontsArray.length === 0) return;
    try {
        const oldVal = DOM.font.value;
        DOM.font.innerHTML = '';
        [...new Set(fontsArray)].sort().forEach(f => {
            const opt = document.createElement('option'); opt.value = `"${f}", sans-serif`; opt.textContent = f; DOM.font.appendChild(opt);
        });
        if (oldVal) {
            DOM.font.value = oldVal;
            if (DOM.font.value !== oldVal) {
                let label = oldVal.replace(/['"]/g, '').split(',')[0].trim();
                const opt = document.createElement('option'); opt.value = oldVal; opt.textContent = label;
                DOM.font.appendChild(opt);
                DOM.font.value = oldVal;
            }
        }
        rebuildFontDropdownOptions();
        renderFontListUI();
    } catch (err) {}
};

// ─── HEX INPUT SYNC ───
[
    { color: DOM.cText,    hex: DOM.cTextHex,    key: 'cText' },
    { color: DOM.cTextBg,  hex: DOM.cTextBgHex,  key: 'cTextBg' },
    { color: DOM.cStroke,  hex: DOM.cStrokeHex,  key: 'cStroke' },
    { color: DOM.cBg,      hex: DOM.cBgHex,      key: 'cBg' },
].forEach(({ color, hex, key }) => {
    color.addEventListener('input', () => { hex.value = color.value; });
    hex.addEventListener('input', () => {
        const v = hex.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            color.value = v;
            applyStateToDOM(getCurrentFullState());
            if (!isUpdatingUI) { updateUnkeyframedDefaults(); dirtyProps.add(key); updateHighlights(); }
        }
    });
});

// ─── FULLSCREEN ───
DOM.fullscreenBtn.addEventListener('click', () => {
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({ action: 'toggleFullscreen' }));
    }
});

// ─── VIDEO EXPORT ───
let _exportUseScreen = true;

function _openExportModal() {
    const totalF = parseInt(DOM.totalFrames.value) || 300;
    const fps    = parseInt(DOM.fps.value) || 30;
    DOM.expStartFrame.value = 0;
    DOM.expEndFrame.value   = totalF;
    DOM.expFps.value        = fps;
    DOM.expEndFrame.max     = totalF;
    DOM.expStartFrame.max   = totalF;

    DOM.expWidth.value  = screen.width;
    DOM.expHeight.value = screen.height;
    _exportUseScreen = true;
    DOM.expResScreen.classList.add('active');
    DOM.expResCustom.classList.remove('active');
    DOM.expResCustomRow.style.display = 'none';
    DOM.expResInfo.textContent = `${screen.width} × ${screen.height} (${t('modalScreenSuffix')})`;

    DOM.expSettingsSection.style.display = 'block';
    DOM.exportModalOverlay.style.display = 'flex';
}

function _closeExportModal() {
    DOM.exportModalOverlay.style.display = 'none';
}

DOM.exportVideoBtn.addEventListener('click', _openExportModal);
DOM.expBtnCancelModal.addEventListener('click', _closeExportModal);

DOM.expResScreen.addEventListener('click', () => {
    _exportUseScreen = true;
    DOM.expResScreen.classList.add('active');
    DOM.expResCustom.classList.remove('active');
    DOM.expResCustomRow.style.display = 'none';
    DOM.expResInfo.textContent = `${screen.width} × ${screen.height} (${t('modalScreenSuffix')})`;
});

DOM.expResCustom.addEventListener('click', () => {
    _exportUseScreen = false;
    DOM.expResCustom.classList.add('active');
    DOM.expResScreen.classList.remove('active');
    DOM.expResCustomRow.style.display = 'flex';
    DOM.expResInfo.textContent = '';
});

DOM.expBtnStart.addEventListener('click', () => {
    const startFrame = parseInt(DOM.expStartFrame.value) || 0;
    let   endFrame   = parseInt(DOM.expEndFrame.value)   || 300;
    const fps        = Math.max(1, parseInt(DOM.expFps.value) || 30);
    const format     = DOM.expFormat.value;
    const width      = _exportUseScreen ? screen.width  : (parseInt(DOM.expWidth.value)  || screen.width);
    const height     = _exportUseScreen ? screen.height : (parseInt(DOM.expHeight.value) || screen.height);
    const totalF     = parseInt(DOM.totalFrames.value) || 300;

    endFrame = Math.min(endFrame, totalF);
    if (startFrame >= endFrame) { alert(t('errFrameOrder')); return; }

    clearDirtyAnimatedProps();
    rebuildGSAPTimeline();

    _closeExportModal();

    document.body.classList.add('rendering');

    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({ action: 'enterRenderFullscreen' }));
    }

    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage(JSON.stringify({
            action: 'startExport',
            startFrame, endFrame, fps, format, width, height
        }));
    }
});

function _exportJumpFrame(frame) {
    const fps = parseInt(DOM.fps.value) || 30;
    const totalF = parseInt(DOM.totalFrames.value) || 300;

    masterTimeline.pause();
    isSeeking = true;
    masterTimeline.seek(frame / fps, false);
    isSeeking = false;

    DOM.frameInput.value = frame;
    DOM.playhead.style.left = (frame / totalF * 100) + '%';

    if (typeof window._applyTimelineState === 'function') {
        window._applyTimelineState(frame);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (window.chrome && window.chrome.webview) {
                window.chrome.webview.postMessage(JSON.stringify({ action: 'frameCapture', frame }));
            }
        });
    });
}

function _exportProgress(jsonStr) {
    let msg;
    try { msg = JSON.parse(jsonStr); } catch { return; }

    if (msg.action === 'exportDone') {
        document.body.classList.remove('rendering');
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(JSON.stringify({ action: 'exitRenderFullscreen' }));
        }
    }
}

// ─── INIT ───
applyI18n();
applyTheme(currentTheme);
renderPaletteUI();
renderFontListUI();
loadSystemFonts();
