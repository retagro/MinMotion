/**
 * MinMotion Animation Engine — v0.1.0
 * 
 * A robust, lightweight, clean-room, custom vanilla-JS animation engine.
 * Fully replaces GSAP Tween/Timeline API subset used in MinMotion:
 * - Timeline orchestration with absolute start times.
 * - Interpolation of numeric targets on proxy objects.
 * - Basic easing presets: linear, easeInOut, and constant step.
 * - Compatibility interface mapping to "gsap.timeline".
 */

(function(global) {
    'use strict';

    // ─── EASING FUNCTIONS ───
    const Easing = {
        linear: t => t,
        none: t => t,
        easeInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        'power2.inOut': t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        'steps(1)': t => t < 1.0 ? 0 : 1,
        const: t => t < 1.0 ? 0 : 1
    };

    // ─── TWEEN INTERPOLATOR CLASS ───
    class MinMotionTween {
        constructor(target, from, to, startTime, duration, ease) {
            this.target = target;
            this.from = from;
            this.to = to;
            this.startTime = startTime;
            this.duration = duration;
            this.ease = ease;
            this.easeFunc = typeof ease === 'function' ? ease : (Easing[ease] || Easing.linear);
        }

        evaluate(time) {
            if (!this.target) return;

            let ratio = 1;
            if (this.duration > 0) {
                ratio = (time - this.startTime) / this.duration;
                if (ratio < 0) ratio = 0;
                if (ratio > 1) ratio = 1;
            }

            const easedRatio = this.easeFunc(ratio);

            for (const key in this.to) {
                const startVal = this.from[key];
                const endVal = this.to[key];
                
                if (typeof startVal === 'number' && typeof endVal === 'number') {
                    this.target[key] = startVal + (endVal - startVal) * easedRatio;
                } else {
                    // Step/discrete transition for non-numeric types
                    this.target[key] = easedRatio >= 1.0 ? endVal : startVal;
                }
            }
        }
    }

    // ─── TIMELINE ENGINE CLASS ───
    class MinMotionTimeline {
        constructor(config = {}) {
            this._paused = config.paused !== undefined ? config.paused : true;
            this._reversed = false;
            this._time = 0;
            this._repeat = 0; // 0 = play once, -1 = repeat indefinitely
            this._tweens = [];
            this._callbacks = {};
            this._duration = 0;
            this._lastTime = null;
            this._tick = this._tick.bind(this);
        }

        clear() {
            this.pause();
            this._tweens = [];
            this._callbacks = {};
            this._time = 0;
            this._duration = 0;
            return this;
        }

        pause() {
            if (!this._paused) {
                this._paused = true;
                this._lastTime = null;
                this._triggerCallback('onPause');
                this._triggerCallback('onUpdate');
            }
            return this;
        }

        play() {
            const d = this.duration();
            if (this._reversed && this._time <= 0) {
                this._time = d;
            } else if (!this._reversed && this._time >= d) {
                this._time = 0;
            }

            if (this._paused) {
                this._paused = false;
                this._triggerCallback('onPlay');
                this._startTicker();
            }
            return this;
        }

        reverse() {
            this.reversed(true);
            this.play();
            return this;
        }

        time(val) {
            if (val !== undefined) {
                this.seek(val, false);
                return this;
            }
            return this._time;
        }

        repeat(val) {
            if (val !== undefined) {
                this._repeat = val;
                return this;
            }
            return this._repeat;
        }

        reversed(val) {
            if (val !== undefined) {
                const changed = this._reversed !== val;
                this._reversed = val;
                if (changed && !this._paused) {
                    this._lastTime = performance.now();
                }
                return this;
            }
            return this._reversed;
        }

        isActive() {
            return !this._paused;
        }

        restart() {
            this._reversed = false;
            this.seek(0, false);
            this.play();
            return this;
        }

        eventCallback(name, callback) {
            if (callback !== undefined) {
                this._callbacks[name] = callback;
                return this;
            }
            return this._callbacks[name];
        }

        _triggerCallback(name) {
            if (typeof this._callbacks[name] === 'function') {
                try {
                    this._callbacks[name]();
                } catch (err) {
                    console.error(`Error in timeline callback ${name}:`, err);
                }
            }
        }

        _startTicker() {
            this._lastTime = performance.now();
            requestAnimationFrame(this._tick);
        }

        _tick(now) {
            if (this._paused) {
                this._lastTime = null;
                return;
            }

            const delta = (now - this._lastTime) / 1000;
            this._lastTime = now;

            let nextTime = this._time;
            if (this._reversed) {
                nextTime -= delta;
            } else {
                nextTime += delta;
            }

            const maxDur = this.duration();
            let finished = false;
            let reversedFinished = false;

            if (!this._reversed) {
                if (nextTime >= maxDur) {
                    if (this._repeat === -1) {
                        nextTime = maxDur > 0 ? (nextTime % maxDur) : 0;
                    } else {
                        nextTime = maxDur;
                        finished = true;
                        this._paused = true;
                    }
                }
            } else {
                if (nextTime <= 0) {
                    if (this._repeat === -1) {
                        nextTime = maxDur > 0 ? (maxDur + (nextTime % maxDur)) : 0;
                    } else {
                        nextTime = 0;
                        reversedFinished = true;
                        this._paused = true;
                    }
                }
            }

            this.seek(nextTime, false);

            if (finished) {
                this._triggerCallback('onComplete');
            } else if (reversedFinished) {
                this._triggerCallback('onReverseComplete');
            }

            if (!this._paused) {
                requestAnimationFrame(this._tick);
            } else {
                this._lastTime = null;
            }
        }

        to(target, vars, position = 0) {
            const duration = vars.duration !== undefined ? vars.duration : 0;
            const ease = vars.ease || 'none';
            const from = {};
            const to = {};
            for (const key in vars) {
                if (key === 'duration' || key === 'ease') continue;
                from[key] = target[key] !== undefined ? target[key] : vars[key];
                to[key] = vars[key];
            }
            const tween = new MinMotionTween(target, from, to, position, duration, ease);
            this._tweens.push(tween);
            this._tweens.sort((a, b) => a.startTime - b.startTime);
            return this;
        }

        fromTo(target, fromVars, toVars, position = 0) {
            const duration = toVars.duration !== undefined ? toVars.duration : 0;
            const ease = toVars.ease || 'none';
            const from = {};
            const to = {};
            for (const key in toVars) {
                if (key === 'duration' || key === 'ease') continue;
                from[key] = fromVars[key];
                to[key] = toVars[key];
            }
            const tween = new MinMotionTween(target, from, to, position, duration, ease);
            this._tweens.push(tween);
            this._tweens.sort((a, b) => a.startTime - b.startTime);
            return this;
        }

        set(target, vars, position = 0) {
            const from = {};
            const to = {};
            for (const key in vars) {
                from[key] = vars[key];
                to[key] = vars[key];
            }
            const tween = new MinMotionTween(target, from, to, position, 0, 'none');
            this._tweens.push(tween);
            this._tweens.sort((a, b) => a.startTime - b.startTime);
            return this;
        }

        duration() {
            let max = this._duration;
            for (const tween of this._tweens) {
                const end = tween.startTime + tween.duration;
                if (end > max) {
                    max = end;
                }
            }
            return max;
        }

        seek(time, suppressEvents = false) {
            this._time = Math.max(0, Math.min(this.duration(), time));

            // Evaluate all tweens in chronological order up to current time
            for (const tween of this._tweens) {
                if (this._time >= tween.startTime) {
                    tween.evaluate(this._time);
                }
            }

            if (!suppressEvents) {
                this._triggerCallback('onUpdate');
            }
            return this;
        }
    }

    // ─── GSAP COMPATIBILITY INTERFACE ───
    global.gsap = {
        timeline(config) {
            return new MinMotionTimeline(config);
        }
    };

    // Expose classes to global namespace as well
    global.MinMotionTimeline = MinMotionTimeline;
    global.MinMotionTween = MinMotionTween;

})(typeof window !== 'undefined' ? window : this);
