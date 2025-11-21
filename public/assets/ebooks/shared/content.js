// Load content from JSON
let contentData = null;
let app = null;
const favoritesState = {
    selected: new Set(),
    favoritesMode: false,
    previousScroll: 0,
    previouslyInactiveChapters: [],
    toggleBtn: null
};
const FAVORITES_STORAGE_KEY = 'luxe_read_favorites';
const presetArchiveSlug = typeof window !== 'undefined' && window.__LUXE_ARCHIVE_SLUG__
  ? String(window.__LUXE_ARCHIVE_SLUG__)
  : null;
const pathStreamId = getStreamIdFromPath();
const requestedArchiveSlug = getRequestedArchiveSlug() || presetArchiveSlug;
const activeSlug = pathStreamId || requestedArchiveSlug;
const contentSourcePath = resolveContentSourcePath({
    archiveSlug: requestedArchiveSlug,
    streamId: pathStreamId,
    activeSlug
});
if (typeof window !== 'undefined') {
    window.__LUXE_ARCHIVE_SLUG__ = activeSlug;
}

const buttonAudio = (() => {
    const SOUND_LIBRARY = {
        default: { type: 'triangle', frequency: 520, duration: 0.09, gain: 0.05 },
        'splash-enter': { sequence: [{ frequency: 420, duration: 0.12 }, { frequency: 620, duration: 0.2 }], gain: 0.06 },
        'font-up': { frequency: 640, duration: 0.08 },
        'font-down': { frequency: 360, duration: 0.08 },
        'font-weight': { frequency: 480, type: 'sine', duration: 0.12 },
        'bookmark-set': { frequency: 330, type: 'square', duration: 0.15 },
        'bookmark-clear': { frequency: 240, type: 'square', duration: 0.12 },
        'bookmark-go': { frequency: 520, duration: 0.18 },
        'sound-on': { frequency: 590, type: 'triangle', duration: 0.18 },
        'sound-off': { frequency: 380, type: 'triangle', duration: 0.14 },
        'sound-variant': { frequency: 700, duration: 0.1 },
        'toc-toggle': { frequency: 430, duration: 0.12 },
        'toc-link': { frequency: 520, duration: 0.1 },
        'chapter-cover': { frequency: 400, duration: 0.15 },
        'chapter-open': { frequency: 560, duration: 0.18 },
        'nav-up': { frequency: 650, duration: 0.14 },
        'nav-down': { frequency: 420, duration: 0.14 },
        'favorite-add': { frequency: 760, duration: 0.08 },
        'favorite-remove': { frequency: 300, duration: 0.11 },
        'favorite-mode': { sequence: [{ frequency: 540, duration: 0.12 }, { frequency: 720, duration: 0.16 }], gain: 0.06 },
        'favorite-mode-exit': { frequency: 320, duration: 0.2 },
        'save': { sequence: [{ frequency: 520, duration: 0.12 }, { frequency: 660, duration: 0.16 }], gain: 0.07 },
        'paragraph-hover': { type: 'sine', frequency: 360, slideTo: 520, duration: 0.12, gain: 0.035 }
    };
    
    return {
        context: null,
        masterGain: null,
        SOUND_LIBRARY,
        ensureContext() {
            if (typeof window === 'undefined') return false;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return false;
            if (!this.context) {
                this.context = new AudioCtx();
                this.masterGain = this.context.createGain();
                this.masterGain.gain.value = 0.08;
                this.masterGain.connect(this.context.destination);
            }
            if (this.context.state === 'suspended') {
                this.context.resume();
            }
            return true;
        },
        play(name, overrides = {}) {
            if (!this.ensureContext()) return;
            const preset = this.SOUND_LIBRARY[name] || this.SOUND_LIBRARY.default;
            const config = { ...preset, ...overrides };
            if (config.sequence) {
                let delay = 0;
                config.sequence.forEach(segment => {
                    const merged = { ...config, ...segment };
                    delete merged.sequence;
                    merged.delay = delay;
                    this.triggerTone(merged);
                    delay += segment.duration;
                });
            } else {
                this.triggerTone(config);
            }
        },
        triggerTone({ frequency = 520, type = 'triangle', duration = 0.12, gain = 0.05, delay = 0, slideTo }) {
            const ctx = this.context;
            const startTime = ctx.currentTime + delay;
            const endTime = startTime + duration;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(frequency, startTime);
            if (slideTo) {
                osc.frequency.linearRampToValueAtTime(slideTo, endTime);
            }
            gainNode.gain.setValueAtTime(Math.max(0.0001, gain), startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(endTime);
        }
    };
})();

function attachButtonSound(element, soundKey) {
    if (!element) return;
    element.addEventListener('pointerdown', () => buttonAudio.play(soundKey));
}

function showToast(message) {
    const existing = document.querySelector('.bookmark-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'bookmark-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('visible'), 10);
    setTimeout(() => {
        notification.classList.remove('visible');
        setTimeout(() => notification.remove(), 800);
    }, 3000);
}

function updateTooltip(element, text, options = {}) {
    if (!element) return;
    if (window.tooltipManager) {
        window.tooltipManager.set(element, text, options);
        return;
    }
    if (typeof text === 'string' && text.trim().length) {
        element.setAttribute('data-tooltip', text);
        if (options.placement) {
            element.setAttribute('data-tooltip-placement', options.placement);
        }
        const ariaValue = options.hasOwnProperty('ariaLabel') ? options.ariaLabel : text;
        if (ariaValue === null) {
            element.removeAttribute('aria-label');
        } else if (ariaValue) {
            element.setAttribute('aria-label', ariaValue);
        }
    } else {
        element.removeAttribute('data-tooltip');
    }
}

fetch(contentSourcePath)
    .then(response => response.json())
    .then(data => {
        contentData = data;
        const vibeName = data && data.metadata ? data.metadata.vibe : null;
        applyVibeTemplate(vibeName);
        initSplash();
    })
    .catch(error => console.error('Error loading content:', error));

function initSplash() {
    const enterButton = document.getElementById('enter-experience');
    const splash = document.getElementById('splash-screen');
    const container = document.getElementById('luxe-read-container');
    attachButtonSound(enterButton, 'splash-enter');
    
    enterButton.addEventListener('click', () => {
        splash.classList.add('hidden');
        
        setTimeout(() => {
            splash.style.display = 'none';
            container.style.transition = 'opacity 1s ease';
            container.style.opacity = '1';
            initApp();
        }, 1000);
    });
}

function applyVibeTemplate(vibeName) {
    if (!vibeName || !window.vibeManager) return;
    window.vibeManager.applyVibe(vibeName);
}

function initChapterNavigator() {
    const nav = document.getElementById('chapter-nav');
    if (!nav || !contentData) return;
    
    const upBtn = nav.querySelector('[data-direction="up"]');
    const downBtn = nav.querySelector('[data-direction="down"]');
    if (!upBtn || !downBtn) return;

    const syncNavTooltips = () => {
        const inFavorites = favoritesState && favoritesState.favoritesMode;
        const upText = inFavorites ? 'Previous Favorite' : 'Previous Chapter';
        const downText = inFavorites ? 'Next Favorite' : 'Next Chapter';
        // Using tooltip panels now - update via tooltipPanelManager if needed
        if (window.tooltipPanelManager) {
            window.tooltipPanelManager.updateTooltipText(upBtn, upText);
            window.tooltipPanelManager.updateTooltipText(downBtn, downText);
        }
    };

    const getCurrentIndex = () => {
        const ids = getChapterIds();
        if (!ids.length) return { ids, index: -1 };
        const fallbackId = ids[0];
        const currentId = (window.luxeRead && window.luxeRead.currentChapterId) || fallbackId;
        let index = ids.indexOf(currentId);
        if (index === -1) index = 0;
        return { ids, index };
    };
    
    const updateStates = () => {
        syncNavTooltips();
        if (favoritesState && favoritesState.favoritesMode) {
            const favorites = getFavoriteNodes();
            const currentIndex = getCurrentFavoriteIndex(favorites);
            // Nav buttons are always active now
            upBtn.disabled = false;
            downBtn.disabled = false;
            return;
        }
        // Nav buttons are always active now
        upBtn.disabled = false;
        downBtn.disabled = false;
    };
    
    const moveToDirection = (direction) => {
        buttonAudio.play(direction === 'up' ? 'nav-up' : 'nav-down');
        if (favoritesState && favoritesState.favoritesMode) {
            navigateBetweenFavorites(direction);
            updateStates();
            return;
        }
        const { ids, index } = getCurrentIndex();
        if (!ids.length || index === -1) {
            // Fallback: scroll to top or bottom of page
            const scrollTarget = direction === 'up' ? 0 : document.documentElement.scrollHeight;
            window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
            return;
        }
        
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        // If there's no chapter in the target direction, scroll to top/bottom
        if ((direction === 'up' && targetIndex < 0) || (direction === 'down' && targetIndex >= ids.length)) {
            const scrollTarget = direction === 'up' ? 0 : document.documentElement.scrollHeight;
            window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
            return;
        }
        
        const targetChapterId = ids[targetIndex];
        setActiveTOCLink(targetChapterId);
        
        navigateToChapterById(targetChapterId).then(() => {
            reinforceChapterIndicator(targetChapterId);
            updateStates();
        });
    };
    
    upBtn.addEventListener('click', () => moveToDirection('up'));
    downBtn.addEventListener('click', () => moveToDirection('down'));
    
    window.addEventListener('scroll', () => {
        window.requestAnimationFrame(updateStates);
    }, { passive: true });
    
    updateStates();
}

// Initialize the app
function initApp() {
    if (!contentData) {
        console.error('Content not loaded');
        return;
    }
    app = new LuxeRead(contentData);
    window.luxeRead = app; // Make accessible globally
    initFontControls();
    initSoundControls();
    initTOC();
    initChapterNavigator();
    initModeIndicator();
    initBookmark();
    initFavoritesSystem();
    initButtonAudioDelegates();
    
    // Initialize template system
    initTemplateSystem();
}

function getRequestedArchiveSlug() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('title');
    if (slug && /^[a-z0-9-]+$/i.test(slug)) {
        return slug.toLowerCase();
    }
    return null;
}

function resolveContentSourcePath({ archiveSlug, streamId, activeSlug }) {
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    const onEbookRoute = /\/ebooks\//i.test(path);
    if (streamId && onEbookRoute) {
        return `../${streamId}/content.json`;
    }
    if (archiveSlug) {
        return `titles/entries/${archiveSlug}/content.json`;
    }
    if (activeSlug) {
        return `titles/entries/${activeSlug}/content.json`;
    }
    return 'content.json';
}

function getStreamIdFromPath() {
    if (typeof window === 'undefined') {
        return null;
    }
    const path = window.location.pathname || '';
    const match = path.match(/\/ebooks\/([a-f0-9]{24})(?:\/$|$)/i);
    if (match && match[1]) {
        return match[1].toLowerCase();
    }
    return null;
}

function getChapterIds() {
    if (!contentData || !contentData.chapters) return [];
    return contentData.chapters.map(chapter => chapter.id);
}

function setActiveTOCLink(chapterId) {
    const links = document.querySelectorAll('.toc-chapter-link');
    links.forEach(link => {
        if (link.dataset.chapterId === chapterId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function reinforceChapterIndicator(chapterId) {
    if (!window.luxeRead) return;
    window.luxeRead.currentChapterId = chapterId;
    const symbol = window.luxeRead.chapterSymbols ? window.luxeRead.chapterSymbols[chapterId] : '◆';
    const chapterTitle = window.luxeRead.chapterTitles ? window.luxeRead.chapterTitles[chapterId] || '' : '';
    
    if (window.luxeRead.chapterSymbolEl) {
        window.luxeRead.chapterSymbolEl.textContent = symbol;
    }
    if (window.luxeRead.chapterTitleEl) {
        window.luxeRead.chapterTitleEl.textContent = chapterTitle;
        window.luxeRead.chapterTitleEl.style.opacity = '0.5';
    }
}

function navigateToChapterById(chapterId) {
    return new Promise((resolve) => {
        if (!chapterId) {
            resolve();
            return;
        }
        
        const canControlPrompt = window.luxeRead && typeof window.luxeRead.setChapterPromptSuspended === 'function';
        if (canControlPrompt) {
            window.luxeRead.setChapterPromptSuspended(true);
        }
        
        let cleanupDone = false;
        let arrivalCheck = null;
        let fallbackTimer = null;
        
        const finish = () => {
            if (cleanupDone) return;
            cleanupDone = true;
            if (arrivalCheck) {
                window.removeEventListener('scroll', arrivalCheck);
            }
            if (fallbackTimer) {
                clearTimeout(fallbackTimer);
            }
            if (canControlPrompt) {
                window.luxeRead.setChapterPromptSuspended(false);
            }
            resolve();
        };
        
        const interlude = document.querySelector(`.chapter-interlude[data-target-chapter="${chapterId}"]`);
        let scrollTarget = null;
        if (interlude && window.getComputedStyle(interlude).display !== 'none') {
            scrollTarget = interlude;
        } else {
            scrollTarget = document.getElementById(chapterId);
        }
        
        if (!scrollTarget) {
            finish();
            return;
        }
        
        window.scrollTo({
            top: window.pageYOffset,
            behavior: 'instant'
        });
        
        requestAnimationFrame(() => {
            const rect = scrollTarget.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const targetTop = rect.top + scrollTop;
            
            window.scrollTo({
                top: targetTop,
                behavior: 'smooth'
            });
            
            arrivalCheck = () => {
                const current = window.pageYOffset || document.documentElement.scrollTop;
                if (Math.abs(current - targetTop) < 5) {
                    finish();
                }
            };
            
            window.addEventListener('scroll', arrivalCheck, { passive: true });
            fallbackTimer = setTimeout(finish, 3000);
        });
    });
}

// Mode indicator - scroll to top on click
function initModeIndicator() {
    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator) {
        attachButtonSound(modeIndicator, 'toc-link');
        modeIndicator.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Font size controls
function initFontControls() {
    const decreaseBtn = document.getElementById('font-decrease');
    const increaseBtn = document.getElementById('font-increase');
    let currentSize = 1.5; // Default 1.5rem
    const minSize = 1.0;
    const maxSize = 2.5;
    const step = 0.1;
    
    attachButtonSound(decreaseBtn, 'font-down');
    attachButtonSound(increaseBtn, 'font-up');
    
    function updateFontSize() {
        const targetScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        // Get the element that's currently visible at the top of viewport
        const elementAtTop = document.elementFromPoint(window.innerWidth / 2, 100);
        const topOffset = elementAtTop ? elementAtTop.getBoundingClientRect().top : 0;
        
        // Change font sizes using CSS custom property for instant batch update
        document.documentElement.style.setProperty('--dynamic-font-size', `${currentSize}rem`);
        
        // Maintain the same element at the same visual position
        if (elementAtTop) {
            const newTopOffset = elementAtTop.getBoundingClientRect().top;
            const scrollDiff = newTopOffset - topOffset;
            window.scrollTo({ top: targetScroll + scrollDiff, behavior: 'instant' });
        }
    }
    
    decreaseBtn.addEventListener('click', () => {
        if (currentSize > minSize) {
            currentSize = Math.max(minSize, currentSize - step);
            updateFontSize();
        }
    });
    
    increaseBtn.addEventListener('click', () => {
        if (currentSize < maxSize) {
            currentSize = Math.min(maxSize, currentSize + step);
            updateFontSize();
        }
    });
    
    // Font weight toggle with crossfade
    const weightToggle = document.getElementById('font-weight-toggle');
    let currentWeight = 300; // Default light
    attachButtonSound(weightToggle, 'font-weight');
    
    weightToggle.addEventListener('click', () => {
        const paragraphs = document.querySelectorAll('.content-canvas .paragraph');
        const newWeight = currentWeight === 300 ? 400 : 300;
        
        // Fade out current text
        paragraphs.forEach(p => {
            p.style.transition = 'opacity 0.6s ease';
            p.style.opacity = '0';
        });
        
        // Crossfade: change weight midway and fade in
        setTimeout(() => {
            paragraphs.forEach(p => {
                p.style.fontWeight = newWeight;
            });
            
            // Fade in with new weight
            setTimeout(() => {
                paragraphs.forEach(p => {
                    p.style.opacity = '1';
                });
            }, 50);
        }, 300);
        
        // Update state
        currentWeight = newWeight;
        weightToggle.dataset.weight = newWeight === 400 ? 'regular' : 'light';
        // Using tooltip panels now - update via tooltipPanelManager
        if (window.tooltipPanelManager) {
            window.tooltipPanelManager.updateTooltipText(weightToggle, newWeight === 400 ? 'Light weight' : 'Regular weight');
        }
        buttonAudio.play('font-weight');
    });
}

// Sound controls with variants
function initSoundControls() {
    const soundToggle = document.getElementById('sound-toggle');
    const variantBtns = document.querySelectorAll('.sound-variant-btn');
    if (!soundToggle) return;
    let currentVariant = 1;

    const refreshSoundToggleTooltip = () => {
        const isPlaying = soundToggle.dataset.playing === 'true';
        soundToggle.setAttribute('aria-pressed', String(isPlaying));
        const label = isPlaying ? 'Mute sound' : 'Play sound';
        soundToggle.setAttribute('aria-label', label);
        // Using tooltip panels now - update via tooltipPanelManager
        if (window.tooltipPanelManager) {
            window.tooltipPanelManager.updateTooltipText(soundToggle, label);
        }
    };

    const refreshVariantTooltips = () => {
        if (!variantBtns.length) return;
        variantBtns.forEach(btn => {
            const label = btn.dataset.variantLabel || `Variant ${btn.dataset.variant}`;
            const isActive = btn.classList.contains('active');
            const text = isActive ? `${label} ambience (active)` : `${label} ambience`;
            // Using tooltip panels now - update via tooltipPanelManager
            if (window.tooltipPanelManager) {
                window.tooltipPanelManager.updateTooltipText(btn, text);
            }
            btn.setAttribute('aria-pressed', String(isActive));
        });
    };
    
    // Toggle sound on/off
    soundToggle.addEventListener('click', () => {
        // Initialize AudioContext on first user interaction (browser requirement)
        if (!app.soundscape.audioContext) {
            app.soundscape.init();
        }
        
        if (app.soundscape.isPlaying) {
            app.soundscape.fadeOut();
            soundToggle.dataset.playing = 'false';
        } else {
            app.soundscape.start('manuscript', currentVariant);
            soundToggle.dataset.playing = 'true';
        }
        const isPlaying = soundToggle.dataset.playing === 'true';
        refreshSoundToggleTooltip();
        buttonAudio.play(isPlaying ? 'sound-on' : 'sound-off');
    });
    
    // Switch between sound variants
    variantBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentVariant = parseInt(btn.dataset.variant);
            
            // Initialize AudioContext on first user interaction (browser requirement)
            if (!app.soundscape.audioContext) {
                app.soundscape.init();
            }
            
            // Update active state
            variantBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Start or restart sound with new variant
            if (app.soundscape.isPlaying) {
                app.soundscape.fadeOut(500);
                setTimeout(() => {
                    app.soundscape.start('manuscript', currentVariant);
                    soundToggle.dataset.playing = 'true';
                    refreshSoundToggleTooltip();
                }, 600);
            } else {
                // Start sound if not already playing
                app.soundscape.start('manuscript', currentVariant);
                soundToggle.dataset.playing = 'true';
                refreshSoundToggleTooltip();
            }
            
            buttonAudio.play('sound-variant', { frequency: 420 + currentVariant * 70 });
            refreshVariantTooltips();
        });
    });
    
    refreshSoundToggleTooltip();
    refreshVariantTooltips();
}

// Table of Contents
function initTOC() {
    const tocMenu = document.getElementById('toc-menu');
    const tocControl = document.getElementById('toc-control');
    const tocToggle = document.getElementById('toc-toggle');
    const soundControl = document.getElementById('sound-control');
    const fontControls = document.querySelector('.font-controls');
    attachButtonSound(tocToggle, 'toc-toggle');
    
    // Populate TOC with chapters
    if (contentData && contentData.chapters) {
        contentData.chapters.forEach((chapter, index) => {
            const link = document.createElement('button');
            link.className = 'toc-chapter-link';
            link.textContent = chapter.title;
            link.dataset.chapterId = chapter.id;
            
            // Stagger animation delay for cascading effect
            link.style.animationDelay = `${index * 0.05}s`;
            
            link.addEventListener('click', (e) => {
                e.stopPropagation();
                setActiveTOCLink(chapter.id);
                
                navigateToChapterById(chapter.id).then(() => {
                    reinforceChapterIndicator(chapter.id);
                });
            });
            
            tocMenu.appendChild(link);
            attachButtonSound(link, 'toc-link');
        });
    }
    
    // Manage extended hover area
    let hoverTimeout;
    
    const enableExtendedHover = () => {
        clearTimeout(hoverTimeout);
        tocControl.classList.add('extended-hover');
    };
    
    const disableExtendedHover = () => {
        hoverTimeout = setTimeout(() => {
            tocControl.classList.remove('extended-hover');
        }, 300);
    };
    
    // Enable extended hover when hovering on button
    tocControl.addEventListener('mouseenter', enableExtendedHover);
    
    // Disable extended hover when leaving the control area
    tocControl.addEventListener('mouseleave', disableExtendedHover);
    
    // Also disable when clicking a chapter
    tocMenu.addEventListener('click', (e) => {
        if (e.target.classList.contains('toc-chapter-link')) {
            disableExtendedHover();
        }
    });
}

// Bookmark functionality
function initBookmark() {
    const bookmarkBtn = document.getElementById('bookmark-btn');
    if (!bookmarkBtn) return;
    const archiveSlug = window.__LUXE_ARCHIVE_SLUG__ || 'latest';
    const AUTO_BOOKMARK_KEY = `luxe_read_auto_bookmark_${archiveSlug}`;
    let autoBookmarkTimer = null;
    let hasScrolledSinceLoad = false;
    let autoTrackingEnabled = false;
    
    // Cookie helpers
    function setCookie(name, value, days) {
        const expires = new Date();
        expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
        document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
    }
    
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }
    
    function deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
    }

    function saveAutoBookmark(position, { force = false } = {}) {
        if (typeof window === 'undefined' || !window.localStorage) return;
        if (!Number.isFinite(position)) return;
        if (!force && (!autoTrackingEnabled || !hasScrolledSinceLoad)) return;
        try {
            window.localStorage.setItem(AUTO_BOOKMARK_KEY, JSON.stringify({
                position: Math.max(0, Math.floor(position)),
                timestamp: Date.now()
            }));
            refreshBookmarkTooltip();
        } catch (error) {
            console.warn('Unable to save auto bookmark', error);
        }
    }

    function getAutoBookmarkPosition() {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        try {
            const raw = window.localStorage.getItem(AUTO_BOOKMARK_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (parsed && Number.isFinite(parsed.position)) {
                return parsed.position;
            }
        } catch (error) {
            console.warn('Unable to parse auto bookmark', error);
        }
        return null;
    }

    function hasManualBookmark() {
        return !!getCookie('luxeread_bookmark');
    }

    function hasAnyBookmark() {
        return hasManualBookmark() || getAutoBookmarkPosition() !== null;
    }

    function refreshBookmarkTooltip() {
        const manualSaved = hasManualBookmark();
        const hasResume = hasAnyBookmark();
    bookmarkBtn.classList.toggle('has-bookmark', manualSaved);
    bookmarkBtn.classList.toggle('active', manualSaved);
        
        // Update panel visibility
        if (bookmarkPanel) {
            const slideOption = bookmarkPanel.querySelector('.slide-option');
            if (slideOption) {
                slideOption.classList.toggle('hidden', !hasResume);
            }
        }
    }
    
    // Create Bookmark Panel
    const bookmarkPanel = document.createElement('div');
    bookmarkPanel.className = 'bookmark-panel';
    
    const saveOption = document.createElement('button');
    saveOption.className = 'bookmark-panel-option save-option';
    const saveText = document.createElement('span');
    saveText.textContent = 'Save Bookmark';
    saveOption.appendChild(saveText);
    saveOption.addEventListener('click', (e) => {
        e.stopPropagation();
        hideBookmarkPanel();
        // Trigger save bookmark action
        saveSingleBookmark();
    });
    
    const slideOption = document.createElement('button');
    slideOption.className = 'bookmark-panel-option slide-option';
    const slideText = document.createElement('span');
    slideText.textContent = 'Go to Bookmark';
    slideOption.appendChild(slideText);
    slideOption.addEventListener('click', (e) => {
        e.stopPropagation();
        hideBookmarkPanel();
        // Trigger jump to bookmark action
        jumpToStoredPosition();
    });
    
    bookmarkPanel.appendChild(slideOption);
    bookmarkPanel.appendChild(saveOption);
    bookmarkBtn.appendChild(bookmarkPanel);
    
    // Panel visibility management
    let panelHideTimeout;
    
    function showBookmarkPanel() {
        clearTimeout(panelHideTimeout);
        bookmarkPanel.classList.add('visible');
    }
    
    function hideBookmarkPanel() {
        clearTimeout(panelHideTimeout);
        panelHideTimeout = setTimeout(() => {
            bookmarkPanel.classList.remove('visible');
        }, 200);
    }
    
    function keepPanelOpen() {
        clearTimeout(panelHideTimeout);
    }
    
    bookmarkBtn.addEventListener('mouseenter', showBookmarkPanel);
    bookmarkBtn.addEventListener('mouseleave', hideBookmarkPanel);
    bookmarkPanel.addEventListener('mouseenter', keepPanelOpen);
    bookmarkPanel.addEventListener('mouseleave', hideBookmarkPanel);

    function getBookmarkTarget() {
        const manual = getCookie('luxeread_bookmark');
        if (manual && !Number.isNaN(parseInt(manual, 10))) {
            return { position: parseInt(manual, 10), source: 'manual' };
        }
        const auto = getAutoBookmarkPosition();
        if (typeof auto === 'number') {
            return { position: auto, source: 'auto' };
        }
        return null;
    }

    function jumpToStoredPosition(options = {}) {
        const { silentIfMissing = false } = options;
        const target = getBookmarkTarget();
        if (!target) {
            if (!silentIfMissing) {
                showToast('No bookmark available yet');
            }
            return false;
        }
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        if (Math.abs(currentScroll - target.position) < 2) {
            if (!silentIfMissing) {
                showToast('Already at your bookmark');
            }
            return false;
        }
        window.scrollTo({ top: target.position, behavior: 'smooth' });
        hasScrolledSinceLoad = true;
        // goToBookmarkBtn.classList.remove('visible');
        showToast(target.source === 'manual' ? 'Jumped to saved bookmark' : 'Resumed where you left off');
        buttonAudio.play('bookmark-go');
        return true;
    }

    const scheduleAutoBookmarkSave = () => {
        if (!autoTrackingEnabled) return;
        if (autoBookmarkTimer) clearTimeout(autoBookmarkTimer);
        autoBookmarkTimer = setTimeout(() => {
            autoBookmarkTimer = null;
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            saveAutoBookmark(currentScroll);
        }, 350);
    };
    const cancelAutoBookmarkSchedule = () => {
        if (autoBookmarkTimer) {
            clearTimeout(autoBookmarkTimer);
            autoBookmarkTimer = null;
        }
    };
    
    const handleScroll = () => {
        hasScrolledSinceLoad = true;
        if (!autoTrackingEnabled) return;
        scheduleAutoBookmarkSave();
    };
    
    const flushAutoBookmark = () => {
        if (!autoTrackingEnabled || !hasScrolledSinceLoad) return;
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        saveAutoBookmark(currentScroll);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('beforeunload', flushAutoBookmark);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushAutoBookmark();
        }
    });
    window.addEventListener('pagehide', flushAutoBookmark);
    
    autoTrackingEnabled = !hasManualBookmark();
    refreshBookmarkTooltip();
    
    // Bookmark button click handler - TOGGLE
    function saveSingleBookmark() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        setCookie('luxeread_bookmark', currentScroll, 365);
        showToast('Bookmark saved');
        buttonAudio.play('bookmark-set');
        autoTrackingEnabled = false;
        cancelAutoBookmarkSchedule();
        refreshBookmarkTooltip();
    }
    
    bookmarkBtn.addEventListener('click', (event) => {
        if (!event.shiftKey) {
            const jumped = jumpToStoredPosition({ silentIfMissing: true });
            if (jumped) {
                scheduleAutoBookmarkSave();
                return;
            }
        }
        
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const savedPosition = getCookie('luxeread_bookmark');
        
        if (savedPosition) {
            deleteCookie('luxeread_bookmark');
            showToast('Bookmark removed');
            buttonAudio.play('bookmark-clear');
            autoTrackingEnabled = true;
            hasScrolledSinceLoad = true;
            saveAutoBookmark(currentScroll, { force: true });
        } else {
            setCookie('luxeread_bookmark', currentScroll, 365);
            showToast('Bookmark saved');
            buttonAudio.play('bookmark-set');
            autoTrackingEnabled = false;
            cancelAutoBookmarkSchedule();
        }
        refreshBookmarkTooltip();
    });
    
    // Show "Go to Bookmark" on hover - REMOVED: button no longer exists
    // let hideTimeout;
    // 
    // const showGoToButton = () => {
    //     if (hasAnyBookmark()) {
    //         clearTimeout(hideTimeout);
    //         goToBookmarkBtn.classList.add('visible');
    //     }
    // };
    // 
    // const hideGoToButton = () => {
    //     clearTimeout(hideTimeout);
    //     hideTimeout = setTimeout(() => {
    //         if (!bookmarkBtn.matches(':hover') && !goToBookmarkBtn.matches(':hover')) {
    //             goToBookmarkBtn.classList.remove('visible');
    //         }
    //     }, 400);
    // };
    // 
    // // Track mouse position to keep button visible when between the two buttons
    // let isInBetween = false;
    // document.addEventListener('mousemove', (e) => {
    //     if (!hasAnyBookmark()) return;
    //     
    //     const bookmarkRect = bookmarkBtn.getBoundingClientRect();
    //     const goToRect = goToBookmarkBtn.getBoundingClientRect();
    //     
    //     // Define the bridge area between buttons
    //     const bridgeLeft = bookmarkRect.right;
    //     const bridgeRight = goToRect.left;
    //     const bridgeTop = Math.min(bookmarkRect.top, goToRect.top) - 10;
    //     const bridgeBottom = Math.max(bookmarkRect.bottom, goToRect.bottom) + 10;
    //     
    //     if (e.clientX >= bridgeLeft && e.clientX <= bridgeRight &&
    //         e.clientY >= bridgeTop && e.clientY <= bridgeBottom) {
    //         isInBetween = true;
    //         showGoToButton();
    //     } else {
    //         if (isInBetween) {
    //             isInBetween = false;
    //             hideGoToButton();
    //         }
    //     }
    // });
    // 
    // bookmarkBtn.addEventListener('mouseenter', showGoToButton);
    // bookmarkBtn.addEventListener('mouseleave', hideGoToButton);
    // goToBookmarkBtn.addEventListener('mouseenter', showGoToButton);
    // goToBookmarkBtn.addEventListener('mouseleave', hideGoToButton);
    // 
    // // Go to bookmark handler
    // goToBookmarkBtn.addEventListener('click', () => {
    //     jumpToStoredPosition();
    // });
}

function initFavoritesSystem() {
    favoritesState.toggleBtn = document.getElementById('favorites-toggle-btn');
    
    const storedFavorites = loadFavoritesFromStorage();
    favoritesState.selected = new Set(storedFavorites);
    
    hydrateParagraphInteractions();
    syncFavoriteSelections();
    updateFavoritesToggleAvailability();
    setupFavoritesToggle();
    updateFavoriteSectionHighlights();
    updateFavoritesToggleTooltip();
}

function loadFavoritesFromStorage() {
    try {
        const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('Unable to parse favorites from storage', error);
        return [];
    }
}

function persistFavorites() {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favoritesState.selected)));
}

function hydrateParagraphInteractions() {
    const paragraphs = document.querySelectorAll('.content-canvas .paragraph');
    paragraphs.forEach(paragraph => {
        if (paragraph.dataset.favoritesBound === 'true') return;
        paragraph.dataset.favoritesBound = 'true';
        
        paragraph.addEventListener('mouseenter', () => {
            const inFavoritesMode = favoritesState.favoritesMode;
            if (!inFavoritesMode) {
                document.body.classList.add('paragraph-hovering');
            }
            paragraph.classList.add('paragraph-hovered');
            buttonAudio.play('paragraph-hover');
            paragraph.closest('.section').classList.add('section-hovered');
        });
        
        paragraph.addEventListener('mouseleave', () => {
            paragraph.classList.remove('paragraph-hovered');
            const section = paragraph.closest('.section');
            if (section) section.classList.remove('section-hovered');
            if (!favoritesState.favoritesMode && !document.querySelector('.paragraph-hovered')) {
                document.body.classList.remove('paragraph-hovering');
            }
        });
        
        const checkBtn = paragraph.querySelector('.paragraph-check');
        if (checkBtn) {
            checkBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                toggleParagraphFavorite(paragraph);
                requestAnimationFrame(() => checkBtn.blur());
            });
        }
        
        paragraph.addEventListener('click', () => {
            toggleParagraphFavorite(paragraph);
        });
    });
}

function toggleParagraphFavorite(paragraph) {
    const favoriteId = paragraph.dataset.favoriteId;
    if (!favoriteId) return;
    
    const selected = favoritesState.selected;
    const wasSelected = selected.has(favoriteId);
    if (wasSelected) {
        selected.delete(favoriteId);
        paragraph.classList.remove('favorite-selected');
    } else {
        selected.add(favoriteId);
        paragraph.classList.add('favorite-selected');
    }
    buttonAudio.play(wasSelected ? 'favorite-remove' : 'favorite-add');
    const isNowEmpty = selected.size === 0;
    
    persistFavorites();
    showToast(wasSelected ? 'Removed from Favorites' : 'Saved to Favorites');
    
    if (isNowEmpty) {
        enforceFavoritesModeExit();
    }
    
    updateFavoritesToggleAvailability();
    updateFavoriteSectionHighlights();
    
    requestNavigatorUpdate();
}

function syncFavoriteSelections() {
    const paragraphs = document.querySelectorAll('.content-canvas .paragraph');
    const seen = new Set();
    
    paragraphs.forEach(paragraph => {
        const favoriteId = paragraph.dataset.favoriteId;
        if (!favoriteId) return;
        seen.add(favoriteId);
        if (favoritesState.selected.has(favoriteId)) {
            paragraph.classList.add('favorite-selected');
        } else {
            paragraph.classList.remove('favorite-selected');
        }
    });
    
    const missing = [];
    favoritesState.selected.forEach(id => {
        if (!seen.has(id)) missing.push(id);
    });
    missing.forEach(id => favoritesState.selected.delete(id));
    if (missing.length) {
        persistFavorites();
    }
    updateFavoriteSectionHighlights();
    enforceFavoritesModeExit();
    updateFavoritesToggleAvailability();
}

function enforceFavoritesModeExit() {
    if (!favoritesState) return;
    if (favoritesState.favoritesMode && favoritesState.selected.size === 0) {
        exitFavoritesMode();
    }
}

function setupFavoritesToggle() {
    if (!favoritesState.toggleBtn) return;
    favoritesState.toggleBtn.addEventListener('click', () => {
        if (!favoritesState.selected.size) return;
        if (favoritesState.favoritesMode) {
            exitFavoritesMode();
        } else {
            enterFavoritesMode();
        }
    });
}

function updateFavoritesToggleTooltip() {
    const btn = favoritesState.toggleBtn;
    if (!btn) return;
    let tooltip = 'Enter favorites view';
    if (!favoritesState.selected.size) {
        tooltip = 'Save favorites to enable';
    } else if (favoritesState.favoritesMode) {
        tooltip = 'Exit favorites view';
    }
    // Using tooltip panels now - update via tooltipPanelManager
    if (window.tooltipPanelManager) {
        window.tooltipPanelManager.updateTooltipText(btn, tooltip);
    }
}

function updateFavoritesToggleAvailability() {
    if (!favoritesState.toggleBtn) return;
    const hasFavorites = favoritesState.selected.size > 0;
    favoritesState.toggleBtn.disabled = !hasFavorites;
    favoritesState.toggleBtn.setAttribute('aria-disabled', String(!hasFavorites));
    if (!hasFavorites && favoritesState.favoritesMode) {
        exitFavoritesMode();
    }
    updateFavoritesToggleTooltip();
    requestNavigatorUpdate();
}

function enterFavoritesMode() {
    if (!favoritesState.selected.size || favoritesState.favoritesMode) return;
    buttonAudio.play('favorite-mode');
    favoritesState.previousScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
    favoritesState.previouslyInactiveChapters = [];
    
    document.querySelectorAll('.chapter').forEach(chapter => {
        if (!chapter.classList.contains('active')) {
            favoritesState.previouslyInactiveChapters.push(chapter.id);
            chapter.classList.add('active');
        }
    });
    
    document.body.classList.remove('paragraph-hovering');
    document.querySelectorAll('.paragraph.paragraph-hovered').forEach(el => el.classList.remove('paragraph-hovered'));
    
    document.body.classList.add('favorites-mode');
    favoritesState.favoritesMode = true;
    
    if (favoritesState.toggleBtn) {
        favoritesState.toggleBtn.classList.add('active');
        favoritesState.toggleBtn.setAttribute('aria-pressed', 'true');
    }
    
    updateFavoritesToggleTooltip();
    requestNavigatorUpdate();
    updateFavoriteSectionHighlights();
}

function exitFavoritesMode() {
    if (!favoritesState.favoritesMode) return;
    buttonAudio.play('favorite-mode-exit');
    
    document.body.classList.remove('favorites-mode');
    favoritesState.favoritesMode = false;
    
    favoritesState.previouslyInactiveChapters.forEach(chapterId => {
        const chapter = document.getElementById(chapterId);
        if (chapter) {
            chapter.classList.remove('active');
        }
    });
    favoritesState.previouslyInactiveChapters = [];
    
    if (favoritesState.toggleBtn) {
        favoritesState.toggleBtn.classList.remove('active');
        favoritesState.toggleBtn.setAttribute('aria-pressed', 'false');
    }
    
    updateFavoritesToggleTooltip();
    requestNavigatorUpdate();
    updateFavoriteSectionHighlights();
}

function setsEqual(a, b) {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

function getFavoriteNodes() {
    const nodes = Array.from(document.querySelectorAll('.paragraph.favorite-selected'));
    nodes.sort((a, b) => {
        const aTop = a.getBoundingClientRect().top + window.scrollY;
        const bTop = b.getBoundingClientRect().top + window.scrollY;
        return aTop - bTop;
    });
    return nodes;
}

function getCurrentFavoriteIndex(nodes) {
    if (!nodes.length) return -1;
    const viewportCenter = window.scrollY + (window.innerHeight / 2);
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    nodes.forEach((node, index) => {
        const nodeCenter = node.getBoundingClientRect().top + window.scrollY + (node.offsetHeight / 2);
        const distance = Math.abs(nodeCenter - viewportCenter);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
        }
    });
    
    return closestIndex;
}

function scrollToFavoriteNode(node) {
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const targetTop = rect.top + scrollTop - (window.innerHeight / 2) + (node.offsetHeight / 2);
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
}

function navigateBetweenFavorites(direction) {
    const nodes = getFavoriteNodes();
    if (!nodes.length) {
        // Fallback: scroll to top or bottom of page
        const scrollTarget = direction === 'up' ? 0 : document.documentElement.scrollHeight;
        window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        return;
    }
    
    let currentIndex = getCurrentFavoriteIndex(nodes);
    if (currentIndex === -1) currentIndex = 0;
    const delta = direction === 'up' ? -1 : 1;
    let targetIndex = currentIndex + delta;
    
    // If there's no favorite in the target direction, scroll to top/bottom
    if ((direction === 'up' && targetIndex < 0) || (direction === 'down' && targetIndex >= nodes.length)) {
        const scrollTarget = direction === 'up' ? 0 : document.documentElement.scrollHeight;
        window.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        return;
    }
    
    targetIndex = Math.max(0, Math.min(nodes.length - 1, targetIndex));
    scrollToFavoriteNode(nodes[targetIndex]);
}

function requestNavigatorUpdate() {
    window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('scroll'));
    });
}

function updateFavoriteSectionHighlights() {
    document.querySelectorAll('.content-canvas .section').forEach(section => {
        const hasFavorite = !!section.querySelector('.paragraph.favorite-selected');
        section.classList.toggle('section-has-favorite', hasFavorite);
    });
}

function initButtonAudioDelegates() {
    document.addEventListener('pointerdown', (event) => {
        const interlude = event.target.closest('.chapter-interlude');
        if (interlude) {
            buttonAudio.play('chapter-cover');
            return;
        }
        const prompt = event.target.closest('.chapter-prompt-float');
        if (prompt) {
            buttonAudio.play('chapter-open');
        }
    });
}

// Initialize the magical template system
async function initTemplateSystem() {
    try {
        if (typeof TemplateManager === 'undefined') {
            console.log('⏳ Waiting for TemplateManager...');
            // Wait a bit for scripts to load
            setTimeout(initTemplateSystem, 100);
            return;
        }
        
        if (!window.templateManager) {
            console.log('🎨 Initializing Template System...');
            window.templateManager = new TemplateManager();
            await window.templateManager.initialize();
            await window.templateManager.restoreTemplate();
            console.log('✨ Template system ready!');
        }
        
    } catch (error) {
        console.error('❌ Template system initialization failed:', error);
    }
}
