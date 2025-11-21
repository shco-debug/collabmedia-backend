/**
 * Tooltip Panel System - Universal tooltip panels for all buttons
 * Converts all old data-tooltip attributes to elegant panel-based tooltips
 */

class TooltipPanelManager {
    constructor() {
        this.panels = new Map();
        this.hideTimeouts = new Map();
    }

    /**
     * Create a tooltip panel for a button
     * @param {HTMLElement} button - The button element
     * @param {string} text - Tooltip text
     * @param {string} position - 'left' or 'right'
     */
    createTooltipPanel(button, text, position = 'right') {
        // Make button relative positioned
        button.classList.add('has-tooltip-panel');
        
        // Create panel
        const panel = document.createElement('div');
        panel.className = `tooltip-panel position-${position}`;
        
        // Add text content
        const textEl = document.createElement('div');
        textEl.className = 'tooltip-panel-text';
        textEl.textContent = text;
        panel.appendChild(textEl);
        
        button.appendChild(panel);
        
        // Store reference
        this.panels.set(button, panel);
        
        // Add hover events
        this.setupHoverEvents(button, panel);
        
        return panel;
    }

    /**
     * Update tooltip panel text
     * @param {HTMLElement} button - The button element
     * @param {string} text - New tooltip text
     */
    updateTooltipText(button, text) {
        const panel = this.panels.get(button);
        if (panel) {
            const textEl = panel.querySelector('.tooltip-panel-text');
            if (textEl) {
                textEl.textContent = text;
            }
        }

        if (typeof text === 'string' && text.trim().length) {
            button.setAttribute('aria-label', text);
        } else {
            button.removeAttribute('aria-label');
        }
    }

    /**
     * Setup hover events for showing/hiding panel
     * @param {HTMLElement} button - The button element
     * @param {HTMLElement} panel - The panel element
     */
    setupHoverEvents(button, panel) {
        const show = () => {
            this.clearHideTimeout(button);
            panel.classList.add('visible');
        };
        
        const hide = () => {
            this.clearHideTimeout(button);
            const timeout = setTimeout(() => {
                panel.classList.remove('visible');
            }, 200);
            this.hideTimeouts.set(button, timeout);
        };
        
        const keepOpen = () => {
            this.clearHideTimeout(button);
        };
        
        button.addEventListener('mouseenter', show);
        button.addEventListener('mouseleave', hide);
        panel.addEventListener('mouseenter', keepOpen);
        panel.addEventListener('mouseleave', hide);
    }

    clearHideTimeout(button) {
        const timeout = this.hideTimeouts.get(button);
        if (timeout) {
            clearTimeout(timeout);
            this.hideTimeouts.delete(button);
        }
    }

    /**
     * Initialize all tooltip panels from data-tooltip attributes
     */
    initializeFromDOM() {
        // Find all buttons with data-tooltip
        const buttonsWithTooltips = document.querySelectorAll('[data-tooltip]');
        
        buttonsWithTooltips.forEach(button => {
            const text = button.getAttribute('data-tooltip');
            const placement = button.getAttribute('data-tooltip-placement') || 'right';
            
            // Skip if already has a panel
            if (button.querySelector('.tooltip-panel') || button.querySelector('.bookmark-panel')) {
                return;
            }
            
            this.createTooltipPanel(button, text, placement);
            
            // Remove old attributes
            button.removeAttribute('data-tooltip');
            button.removeAttribute('data-tooltip-placement');
        });
        
        console.log('✨ Tooltip panels initialized for', this.panels.size, 'buttons');
    }

    /**
     * Add special tooltip for template toggle button
     * Call this after template manager creates the button
     */
    initializeTemplateToggle(retryCount = 0) {
        console.log(`🔍 Looking for template toggle button (attempt ${retryCount + 1})...`);
        const templateToggle = document.getElementById('template-toggle');
        
        if (templateToggle) {
            console.log('✅ Template toggle button found!');
            if (!this.panels.has(templateToggle)) {
                this.createTooltipPanel(templateToggle, 'Vibe', 'left');
                console.log('✨ Template toggle "Vibe" tooltip created');
                return true;
            } else {
                console.log('ℹ️ Template toggle already has tooltip');
            }
            return true;
        }
        
        // Template toggle not ready yet, retry up to 20 times (2 seconds)
        if (retryCount < 20) {
            setTimeout(() => this.initializeTemplateToggle(retryCount + 1), 100);
        } else {
            console.warn('⚠️ Template toggle button not found after 20 retries');
        }
        return false;
    }

    /**
     * Setup sound button interaction with template toggle
     * Template toggle should hide when hovering sound button
     */
    setupSoundButtonInteraction(retryCount = 0) {
        console.log(`🔍 Setting up sound button interaction (attempt ${retryCount + 1})...`);
        const soundToggle = document.getElementById('sound-toggle');
        const templateToggle = document.getElementById('template-toggle');
        
        console.log('  Sound toggle:', soundToggle ? 'found' : 'NOT FOUND');
        console.log('  Template toggle:', templateToggle ? 'found' : 'NOT FOUND');
        
        if (soundToggle && templateToggle) {
            soundToggle.addEventListener('mouseenter', () => {
                console.log('🔊 Sound hover - hiding template toggle');
                templateToggle.classList.add('hidden-by-sound');
            });
            
            soundToggle.addEventListener('mouseleave', () => {
                setTimeout(() => {
                    console.log('🔊 Sound unhover - showing template toggle');
                    templateToggle.classList.remove('hidden-by-sound');
                }, 300);
            });
            
            console.log('✅ Sound button interaction with template toggle setup complete');
            return true;
        }
        
        // Not ready yet, retry up to 20 times (2 seconds)
        if (retryCount < 20) {
            setTimeout(() => this.setupSoundButtonInteraction(retryCount + 1), 100);
        } else {
            console.warn('⚠️ Sound button or template toggle not found after 20 retries');
        }
        return false;
    }
}

// Initialize on DOM ready
const initTooltipPanels = () => {
    console.log('🎯 Initializing Tooltip Panel Manager...');
    window.tooltipPanelManager = new TooltipPanelManager();
    window.tooltipPanelManager.initializeFromDOM();
    
    // Template toggle will be initialized by template-manager.js after it creates the button
    // But also try after a delay as backup
    setTimeout(() => {
        if (window.tooltipPanelManager) {
            window.tooltipPanelManager.initializeTemplateToggle();
            window.tooltipPanelManager.setupSoundButtonInteraction();
        }
    }, 2000);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTooltipPanels);
} else {
    initTooltipPanels();
}

// Also expose a method to manually initialize template toggle (for debugging)
window.initTemplateTooltip = () => {
    console.log('🔧 Manually initializing template tooltip...');
    if (window.tooltipPanelManager) {
        window.tooltipPanelManager.initializeTemplateToggle(0);
        window.tooltipPanelManager.setupSoundButtonInteraction(0);
    } else {
        console.error('❌ tooltipPanelManager not found');
    }
};
