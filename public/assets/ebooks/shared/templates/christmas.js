/**
 * Christmas Template - Magical Holiday Reading Experience
 * A non-obtrusive overlay that transforms the reading experience with gentle Christmas magic
 */

class ChristmasTemplate {
    constructor() {
        this.isActive = false;
        this.snowflakes = [];
        this.maxSnowflakes = 32; // Slightly denser snowfall
        this.fallMinDurationSec = 22;
        this.fallMaxDurationSec = 38;
        this.christmasColors = {
            evergreen: '#0f4c3a',
            mistletoe: '#1d6a46',
            hollyRed: '#b01730',
            snowWhite: '#faf9f7',
            silverMist: '#e3dede'
        };
        this.originalColors = {};
        this.currentElements = new Map();
        this.currentSnowDepth = 20;
        this._debug = /snowdebug=1/.test(window.location.search);
    }

    async activate() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('🎄 Activating Christmas template...');
        
        // Store original colors
        this.storeOriginalColors();
        
        // Apply Christmas magic
        // Optional atmospheric overlay disabled per updated guidance
        this.addGentleSnowfall();
        this.addChristmasSkyElements();
        this.addSubtleChristmasElements();
        this.updateColorPalette();
        this.addChristmasAmbientSounds();
        
        // Add template indicator
        document.body.classList.add('christmas-template');
    }

    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        console.log('🎄 Deactivating Christmas template...');
        
        // Remove all Christmas elements
        this.removeSnowfall();
        this.removeChristmasElements();
        this.restoreOriginalColors();
        
        // Remove template indicator
        document.body.classList.remove('christmas-template');
    }

    addChristmasSkyElements() {
        const existing = document.querySelector('.christmas-sky');
        if (existing) existing.remove();
        
        const sky = document.createElement('div');
        sky.className = 'christmas-sky';
        sky.innerHTML = `<div class="shooting-star"></div>`;
        const totalStars = 5;
        for (let i = 0; i < totalStars; i++) {
            const star = document.createElement('span');
            star.className = 'christmas-star';
            star.textContent = Math.random() > 0.5 ? '✦' : '✧';
            star.style.top = `${10 + Math.random() * 60}px`;
            star.style.left = `${Math.random() * 100}%`;
            const staggerDelay = (i * 2.4) + Math.random();
            star.style.animationDelay = `${staggerDelay}s`;
            star.style.animationDuration = `${10 + Math.random() * 4}s`;
            sky.appendChild(star);
        }
        document.body.appendChild(sky);
        this.currentElements.set('sky', sky);
    }

    addGentleSnowfall() {
        const existing = document.querySelector('.christmas-snowfall');
        if (existing) existing.remove();
        
        const snowContainer = document.createElement('div');
        snowContainer.className = 'christmas-snowfall';
        document.body.appendChild(snowContainer);
        this.currentElements.set('snowfall', snowContainer);

        // Create gentle snowflakes
        for (let i = 0; i < this.maxSnowflakes; i++) {
            this.createSnowflake(snowContainer);
        }

        if (this._debug) this.installSnowfallDiagnostics();
    }

    createSnowflake(container) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.innerHTML = ['❄', '❅', '❆', '⋄'][Math.floor(Math.random() * 4)];
        
        // Random positioning and timing
        const startPosition = Math.random() * 100;
        const fallDuration = this.fallMinDurationSec + Math.random() * (this.fallMaxDurationSec - this.fallMinDurationSec);
        const size = 0.8 + Math.random() * 1.4; // 0.8-2.2em
        const opacity = 0.45 + Math.random() * 0.4; // 0.45-0.85 opacity
        const horizontalDrift = Math.random() > 0.5 ? 60 : -60;
        const distance = this.computeSnowDistance();
        const delay = Math.random() * 8;

        snowflake.style.cssText = `
            left: ${startPosition}%;
            font-size: ${size}em;
            opacity: ${opacity};
            color: rgba(245, 220, 174, 0.95);
            text-shadow: 0 0 4px rgba(212, 175, 55, 0.4);
            --snow-drift: ${horizontalDrift}px;
            --snow-distance: ${distance};
            animation-duration: ${fallDuration}s;
            animation-delay: ${delay}s;
        `;
        
        container.appendChild(snowflake);
        this.snowflakes.push(snowflake);
    }

    addSubtleChristmasElements() {
        // Add gentle star twinkles to chapter symbols
        // Chapter symbol untouched to preserve placement
    }

    updateColorPalette() {
        const root = document.documentElement;
        
        root.style.setProperty('--accent-gold', this.christmasColors.hollyRed);
        root.style.setProperty('--accent-sage', this.christmasColors.evergreen);
        root.style.setProperty('--accent-wine', this.christmasColors.hollyRed);
        root.style.setProperty('--ink-secondary', '#1f2f27');
        root.style.setProperty('--christmas-accent-warm', this.christmasColors.hollyRed);
        root.style.setProperty('--christmas-accent-deep', this.christmasColors.evergreen);
        root.style.setProperty('--christmas-accent-wine', this.christmasColors.hollyRed);
        root.style.setProperty('--christmas-glow', 'rgba(176, 25, 47, 0.3)');
    }

    storeOriginalColors() {
        const root = document.documentElement;
        const computed = getComputedStyle(root);
        
        this.originalColors = {
            '--accent-gold': computed.getPropertyValue('--accent-gold'),
            '--accent-sage': computed.getPropertyValue('--accent-sage'),
            '--accent-wine': computed.getPropertyValue('--accent-wine'),
            '--ink-secondary': computed.getPropertyValue('--ink-secondary')
        };
    }

    restoreOriginalColors() {
        const root = document.documentElement;
        
        for (const [property, value] of Object.entries(this.originalColors)) {
            root.style.setProperty(property, value);
        }
        
        // Remove Christmas-specific properties
        root.style.removeProperty('--christmas-accent-warm');
        root.style.removeProperty('--christmas-accent-deep');
        root.style.removeProperty('--christmas-accent-wine');
        root.style.removeProperty('--christmas-glow');
    }

    addChristmasAmbientSounds() {
        // Enhance existing ambient sounds with very subtle Christmas bells
        if (window.ambientSoundscape) {
            // This would integrate with your existing ambient sound system
            console.log('🔔 Christmas ambient enhancement ready');
        }
    }

    handleSeasonDepthChange(depth) {
        if (!this.isActive) return;
        this.currentSnowDepth = depth;
        this.updateSnowfallDistance();
    }

    updateSnowfallDistance() {
        const distance = this.computeSnowDistance();
        if (!this.snowflakes.length) {
            this.refreshSnowfall();
            return;
        }
        this.snowflakes = this.snowflakes.filter(flake => {
            if (!flake || !flake.isConnected) return false;
            flake.style.setProperty('--snow-distance', distance);
            const duration = flake.style.animationDuration || '';
            const delay = flake.style.animationDelay || '';
            flake.style.animation = 'none';
            // force reflow to restart keyframes with the new distance
            void flake.offsetHeight;
            flake.style.animation = '';
            if (duration) flake.style.animationDuration = duration;
            if (delay) flake.style.animationDelay = delay;
            return true;
        });
    }

    refreshSnowfall() {
        let container = this.currentElements.get('snowfall');
        if (!container) {
            this.addGentleSnowfall();
            return;
        }
        container.innerHTML = '';
        this.snowflakes = [];
        for (let i = 0; i < this.maxSnowflakes; i++) {
            this.createSnowflake(container);
        }
        this.updateSnowfallDistance();
    }

    computeSnowDistance() {
        const clamped = Math.max(0, Math.min(100, Number(this.currentSnowDepth) || 0));
        const overshootRatio = 12 / 100;
        if (typeof window === 'undefined' || !window.innerHeight) {
            return `calc(${clamped}vh + 12vh)`;
        }
        const viewport = window.innerHeight;
        const distancePx = (viewport * clamped) / 100;
        const overshootPx = viewport * overshootRatio;
        return `${(distancePx + overshootPx).toFixed(2)}px`;
    }

    installSnowfallDiagnostics() {
        if (document.getElementById('snowfall-debug')) return;
        const pane = document.createElement('div');
        pane.id = 'snowfall-debug';
        pane.style.cssText = 'position:fixed;bottom:8px;right:8px;font:12px monospace;background:rgba(0,0,0,0.6);color:#fff;padding:6px 8px;border-radius:6px;z-index:9999;max-width:240px;line-height:1.3;';
        document.body.appendChild(pane);
        // Add visual guide lines
        const bottomLine = document.createElement('div');
        bottomLine.id = 'snow-bottom-line';
        bottomLine.style.cssText = 'position:fixed;left:0;right:0;height:2px;background:rgba(255,0,0,0.6);bottom:0;z-index:9998;pointer-events:none;';
        document.body.appendChild(bottomLine);
        const lowestLine = document.createElement('div');
        lowestLine.id = 'snow-lowest-line';
        lowestLine.style.cssText = 'position:fixed;left:0;right:0;height:2px;background:rgba(0,200,255,0.7);top:0;z-index:9998;pointer-events:none;';
        const lowestLabel = document.createElement('div');
        lowestLabel.style.cssText = 'position:fixed;right:8px;transform:translateY(-100%);font:11px monospace;color:#0cf;background:rgba(0,0,0,0.55);padding:2px 4px;border-radius:4px;z-index:9999;pointer-events:none;';
        lowestLabel.textContent = 'lowest: 0px';
        document.body.appendChild(lowestLine);
        document.body.appendChild(lowestLabel);
        const render = () => {
            if (!this.isActive) { pane.textContent = 'Snow inactive'; return; }
            const depthPx = window.innerHeight * (this.currentSnowDepth / 100);
            const active = this.snowflakes.length;
            // Compute lowest visible flake
            let lowest = -1;
            this.snowflakes.forEach(f => {
                const r = f.getBoundingClientRect();
                if (r.bottom > 0 && r.top < window.innerHeight) {
                    lowest = Math.max(lowest, Math.min(r.bottom, window.innerHeight));
                }
            });
            const lowestY = lowest < 0 ? 0 : Math.round(lowest);
            lowestLine.style.top = `${lowestY}px`;
            lowestLabel.style.top = `${lowestY}px`;
            lowestLabel.textContent = `lowest visible flake: ${lowestY}px`;
            pane.textContent = `Depth: ${this.currentSnowDepth}vh (${Math.round(depthPx)}px)\nActive flakes: ${active}/${this.snowflakes.length}`;
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    removeSnowfall() {
        const snowContainer = document.querySelector('.christmas-snowfall');
        if (snowContainer) {
            snowContainer.remove();
        }
        this.snowflakes = [];
        this.currentElements.delete('snowfall');
    }

    removeChristmasElements() {
        const elementsToRemove = [
            { selector: '.christmas-sky', key: 'sky' },
            { selector: '.christmas-snowfall', key: 'snowfall' }
        ];
        
        elementsToRemove.forEach(item => {
            const element = document.querySelector(item.selector);
            if (element) element.remove();
            if (item.key) {
                this.currentElements.delete(item.key);
            }
        });

        // Remove Christmas classes from existing elements
        document.querySelectorAll('.christmas-title-glow').forEach(el => {
            el.classList.remove('christmas-title-glow');
        });
        
        document.querySelectorAll('.christmas-symbol-twinkle').forEach(el => {
            el.classList.remove('christmas-symbol-twinkle');
        });
    }

    // Template switching API
    static async switch(templateName) {
        if (window.currentTemplate) {
            window.currentTemplate.deactivate();
        }

        if (templateName === 'christmas') {
            window.currentTemplate = new ChristmasTemplate();
            await window.currentTemplate.activate();
        } else {
            window.currentTemplate = null;
        }
    }
}

// Initialize Christmas template system
window.ChristmasTemplate = ChristmasTemplate;

// Auto-activate if it's December or Christmas season
const now = new Date();
const isChristmasSeason = now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() <= 6); // Dec or early Jan

if (isChristmasSeason) {
    console.log('🎄 Christmas season detected - template available');
}
