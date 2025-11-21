/**
 * Template Manager - Orchestrates theme switching for immersive reading
 * Handles the magical transformation between different seasonal/thematic templates
 */

class TemplateManager {
    constructor() {
        this.currentTemplate = null;
        this.availableTemplates = new Map();
        this.templateConfigs = new Map();
        this.isInitialized = false;
        const storedDepth = parseInt(localStorage.getItem('luxe_read_season_depth'), 10);
        this.seasonDepth = Number.isFinite(storedDepth) ? storedDepth : 20;
        this.seasonControlElements = new Map();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        console.log('🎨 Initializing Template Manager...');
        
        // Register available templates
        this.registerTemplate('default', {
            name: 'Default Manuscript',
            description: 'Classic immersive reading experience',
            activateFunction: null,
            deactivateFunction: null,
            cssFile: null
        });

        this.registerTemplate('christmas', {
            name: 'Christmas Magic',
            description: 'Gentle holiday wonder with snowfall and warm glows',
            activateFunction: () => this.activateChristmasTemplate(),
            deactivateFunction: () => this.deactivateChristmasTemplate(),
            cssFile: './templates/christmas.css',
            isSeasonal: true
        });

        // Auto-detect seasonal templates
        await this.detectSeasonalTemplates();
        
        // Create template switcher UI (subtle, non-intrusive)
        this.createTemplateSwitcher();
        
        // Initialize tooltip for template toggle button
        if (window.tooltipPanelManager) {
            setTimeout(() => {
                window.tooltipPanelManager.initializeTemplateToggle();
                window.tooltipPanelManager.setupSoundButtonInteraction();
            }, 100);
        }
        
        this.isInitialized = true;
        console.log('✨ Template Manager initialized');
    }

    registerTemplate(id, config) {
        this.availableTemplates.set(id, config);
        console.log(`📝 Registered template: ${config.name}`);
    }

    async detectSeasonalTemplates() {
        const now = new Date();
        const month = now.getMonth();
        const day = now.getDate();
        
        // Christmas Season (December 1 - January 6)
        const isChristmasSeason = (month === 11 && day >= 1) || (month === 0 && day <= 6);
        
        if (isChristmasSeason) {
            console.log('🎄 Christmas season detected');
            // Auto-suggest Christmas template
            this.suggestTemplate('christmas');
        }
    }

    createTemplateSwitcher() {
        // Avoid duplicate creation
        if (document.querySelector('.template-switcher')) return;

        // Create a very subtle template switcher
        const switcher = document.createElement('div');
        switcher.className = 'template-switcher';
        switcher.innerHTML = `
            <button class="template-toggle-btn font-control-btn" id="template-toggle" aria-label="Switch reading theme">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">
                    <circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2"/>
                    <path d="M12 20v2"/>
                    <path d="M4.93 4.93l1.41 1.41"/>
                    <path d="M17.66 17.66l1.41 1.41"/>
                    <path d="M2 12h2"/>
                    <path d="M20 12h2"/>
                    <path d="M4.93 19.07l1.41-1.41"/>
                    <path d="M17.66 6.34l1.41-1.41"/>
                </svg>
            </button>
            <div class="template-menu" id="template-menu">
                <div class="template-menu-card">
                    <div class="template-menu-header">Season Templates</div>
                    <div class="template-options" id="template-options"></div>
                    <p class="season-inline-hint">Activate a seasonal look, then nudge the snowfall depth using + / −.</p>
                </div>
            </div>
        `;

        // Position near other controls
        const controlsParent = document.querySelector('.sound-control')?.parentNode || document.body;
        controlsParent.appendChild(switcher);
        
        // Populate template options
        this.populateTemplateOptions();
        
        // Add event listeners
        this.bindTemplateSwitcherEvents();
    }

    populateTemplateOptions() {
        const optionsContainer = document.getElementById('template-options');
        if (!optionsContainer) return;
        optionsContainer.innerHTML = '';
        this.seasonControlElements.clear();
        
        for (const [id, config] of this.availableTemplates) {
            const option = document.createElement('div');
            option.className = 'template-option';
            option.dataset.templateId = id;
            if (config.isSeasonal) {
                option.classList.add('template-option--seasonal');
            }

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'template-option-btn';
            button.dataset.templateId = id;
            button.textContent = config.name;
            option.appendChild(button);

            if (config.description) {
                const meta = document.createElement('span');
                meta.className = 'template-option-meta';
                meta.textContent = config.description;
                button.appendChild(meta);
            }
            
            if (config.isSeasonal) {
                const inlineControls = document.createElement('div');
                inlineControls.className = 'season-inline-controls';
                inlineControls.innerHTML = `
                    <button type="button" class="season-inline-btn" data-season-action="decrease" aria-label="Raise snowfall end">−</button>
                    <span class="season-inline-value" data-season-value>${Math.round(this.seasonDepth)}%</span>
                    <button type="button" class="season-inline-btn" data-season-action="increase" aria-label="Lower snowfall end">+</button>
                `;
                const decBtn = inlineControls.querySelector('[data-season-action="decrease"]');
                const incBtn = inlineControls.querySelector('[data-season-action="increase"]');
                const valueEl = inlineControls.querySelector('[data-season-value]');
                [decBtn, incBtn].forEach(btn => {
                    btn.addEventListener('click', (event) => {
                        event.stopPropagation();
                        const action = btn.dataset.seasonAction;
                        const delta = action === 'increase' ? 10 : -10;
                        this.adjustSeasonDepth(delta);
                    });
                });
                option.appendChild(inlineControls);
                this.seasonControlElements.set(id, { container: inlineControls, valueEl, decBtn, incBtn });
            }

            if (id === 'default') {
                option.classList.add('active');
            }
            this.setTemplateOptionTooltip(button, config, id === 'default');
            optionsContainer.appendChild(option);
        }
        this.updateSeasonControlUI();
    }

    bindTemplateSwitcherEvents() {
        const toggleBtn = document.getElementById('template-toggle');
        const menu = document.getElementById('template-menu');
        
        // Toggle menu
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('visible');
        });

        // Template selection
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.template-option-btn');
            if (button) {
                const templateId = button.dataset.templateId;
                this.switchToTemplate(templateId);
                this.updateTemplateOptionTooltips(templateId);
                menu.classList.remove('visible');
            } else if (!menu.contains(e.target) && e.target !== toggleBtn) {
                menu.classList.remove('visible');
            }
        });
    }

    async switchToTemplate(templateId) {
        console.log(`🔄 Switching to template: ${templateId}`);
        
        // Deactivate current template
        if (this.currentTemplate && this.currentTemplate !== 'default') {
            await this.deactivateCurrentTemplate();
        }
        
        // Activate new template
        if (templateId !== 'default') {
            await this.activateTemplate(templateId);
        }
        
        this.currentTemplate = templateId;
        this.updateTemplateOptionTooltips(templateId);
        this.applySeasonDepthToDocument();
        this.updateSeasonControlUI();
        
        // Store preference
        localStorage.setItem('luxeread_template', templateId);
        
        console.log(`✨ Template switched to: ${templateId}`);
    }

    async activateTemplate(templateId) {
        const config = this.availableTemplates.get(templateId);
        if (!config) return;
        
        // Load CSS if needed
        if (config.cssFile) {
            await this.loadTemplateCSS(templateId, config.cssFile);
        }
        
        // Execute activation function
        if (config.activateFunction) {
            await config.activateFunction();
        }
    }

    async deactivateCurrentTemplate() {
        if (!this.currentTemplate) return;
        
        const config = this.availableTemplates.get(this.currentTemplate);
        if (config && config.deactivateFunction) {
            await config.deactivateFunction();
        }
        
        // Remove CSS
        this.unloadTemplateCSS(this.currentTemplate);
    }

    async loadTemplateCSS(templateId, cssFile) {
        // Check if already loaded
        if (document.querySelector(`link[data-template="${templateId}"]`)) {
            return;
        }
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssFile;
            link.dataset.template = templateId;
            
            link.onload = () => resolve();
            link.onerror = () => reject(new Error(`Failed to load template CSS: ${cssFile}`));
            
            document.head.appendChild(link);
        });
    }

    unloadTemplateCSS(templateId) {
        const link = document.querySelector(`link[data-template="${templateId}"]`);
        if (link) {
            link.remove();
        }
    }

    // Christmas Template Integration
    async activateChristmasTemplate() {
        if (!window.ChristmasTemplate) {
            await this.loadChristmasScript();
        }
        
        if (!this._activeChristmasInstance) {
            this._activeChristmasInstance = new window.ChristmasTemplate();
        }
        
        await this._activeChristmasInstance.activate();
        // Expose the active instance so depth changes can reach the template
        window.currentTemplate = this._activeChristmasInstance;
    }

    async deactivateChristmasTemplate() {
        if (this._activeChristmasInstance) {
            this._activeChristmasInstance.deactivate();
            this._activeChristmasInstance = null;
            // Clear global pointer
            window.currentTemplate = null;
        }
    }

    async loadChristmasScript() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = './templates/christmas.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Christmas template script'));
            document.head.appendChild(script);
        });
    }

    // Seasonal suggestions
    suggestTemplate(templateId) {
        const config = this.availableTemplates.get(templateId);
        if (!config) return;
        
        // Show a very gentle, non-intrusive suggestion
        setTimeout(() => {
            this.showTemplateSuggestion(config);
        }, 5000); // Wait 5 seconds after page load
    }

    showTemplateSuggestion(config) {
        const suggestion = document.createElement('div');
        suggestion.className = 'template-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <span class="suggestion-text">🎄 Try ${config.name} for the season</span>
                <button class="suggestion-btn" data-action="accept" data-tooltip="Apply ${config.name}" aria-label="Apply ${config.name} template">Yes</button>
                <button class="suggestion-btn" data-action="dismiss" data-tooltip="Dismiss suggestion" aria-label="Dismiss suggestion">Maybe later</button>
            </div>
        `;
        
        document.body.appendChild(suggestion);
        
        // Auto-dismiss after 10 seconds
        const autoTimeout = setTimeout(() => {
            suggestion.remove();
        }, 10000);
        
        // Handle user response
        suggestion.addEventListener('click', (e) => {
            clearTimeout(autoTimeout);
            
            if (e.target.dataset.action === 'accept') {
                this.switchToTemplate('christmas');
            }
            
            suggestion.remove();
        });
        
        // Animate in
        requestAnimationFrame(() => {
            suggestion.classList.add('visible');
        });
    }

    setTemplateOptionTooltip(option, config, isActive = false) {
        if (!option || !config) return;
        const tooltip = isActive ? `${config.name} active` : `Switch to ${config.name}`;
        if (window.tooltipManager) {
            window.tooltipManager.set(option, tooltip, { placement: 'left' });
        } else {
            option.setAttribute('data-tooltip', tooltip);
        }
        option.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    }

    updateTemplateOptionTooltips(activeId) {
        const options = document.querySelectorAll('.template-option');
        options.forEach(option => {
            const id = option.dataset.templateId;
            const config = this.availableTemplates.get(id);
            if (!config) return;
            const button = option.querySelector('.template-option-btn');
            const isActive = id === activeId;
            option.classList.toggle('active', isActive);
            if (button) {
                this.setTemplateOptionTooltip(button, config, isActive);
            }
        });
    }

    // Restore previous template on page load
    async restoreTemplate() {
        const saved = localStorage.getItem('luxeread_template');
        if (saved && saved !== 'default' && this.availableTemplates.has(saved)) {
            await this.switchToTemplate(saved);
            
            // Update UI
            const option = document.querySelector(`[data-template-id="${saved}"]`);
            if (option) {
                this.updateTemplateOptionTooltips(saved);
            }
        }
    }

    adjustSeasonDepth(delta) {
        const config = this.currentTemplate ? this.availableTemplates.get(this.currentTemplate) : null;
        if (!config || !config.isSeasonal) return;
        this.setSeasonDepth(this.seasonDepth + delta);
    }

    setSeasonDepth(value) {
        const clamped = Math.max(0, Math.min(100, value));
        this.seasonDepth = clamped;
        localStorage.setItem('luxe_read_season_depth', String(clamped));
        this.applySeasonDepthToDocument();
        this.updateSeasonControlUI();
    }

    applySeasonDepthToDocument() {
        const value = `${this.seasonDepth}vh`;
        const root = document.documentElement;
        if (this.currentTemplate === 'christmas') {
            if (root) {
                root.style.setProperty('--christmas-snow-end', value);
            }
            document.body.style.setProperty('--christmas-snow-end', value);
            document.querySelectorAll('.christmas-snowfall, .christmas-snowfall *').forEach(el => {
                el.style.setProperty('--christmas-snow-end', value);
            });
            if (window.currentTemplate && typeof window.currentTemplate.handleSeasonDepthChange === 'function') {
                window.currentTemplate.handleSeasonDepthChange(this.seasonDepth);
            }
        } else {
            if (root) {
                root.style.removeProperty('--christmas-snow-end');
            }
            document.body.style.removeProperty('--christmas-snow-end');
        }
    }

    updateSeasonControlUI() {
        const activeConfig = this.currentTemplate ? this.availableTemplates.get(this.currentTemplate) : null;
        const isSeasonalActive = !!(activeConfig && activeConfig.isSeasonal);
        this.seasonControlElements.forEach((controls, templateId) => {
            const isCurrentSeasonal = isSeasonalActive && templateId === this.currentTemplate;
            if (controls.container) {
                controls.container.classList.toggle('season-inline-controls--active', isCurrentSeasonal);
            }
            if (controls.valueEl) {
                controls.valueEl.textContent = `${Math.round(this.seasonDepth)}%`;
            }
            if (controls.decBtn) {
                controls.decBtn.disabled = !isCurrentSeasonal || this.seasonDepth <= 0;
            }
            if (controls.incBtn) {
                controls.incBtn.disabled = !isCurrentSeasonal || this.seasonDepth >= 100;
            }
        });
        const hint = document.querySelector('.season-inline-hint');
        if (hint) {
            hint.style.opacity = isSeasonalActive ? '0' : '1';
        }
    }
}

// Expose globally
window.TemplateManager = TemplateManager;
