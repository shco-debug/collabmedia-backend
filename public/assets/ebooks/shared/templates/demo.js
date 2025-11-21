/**
 * Template Demo Controller - For testing and showcasing templates
 * This can be removed in production or hidden behind a debug flag
 */

class TemplateDemo {
    constructor() {
        this.isDebugMode = this.getDebugMode();
        this.shortcuts = new Map();
    }

    getDebugMode() {
        // Enable debug mode if URL contains ?debug or localStorage flag is set
        return new URLSearchParams(window.location.search).has('debug') ||
               localStorage.getItem('luxeread_debug') === 'true';
    }

    initialize() {
        if (!this.isDebugMode) return;
        
        console.log('🔧 Template Demo Mode Enabled');
        this.createDemoPanel();
        this.setupKeyboardShortcuts();
    }

    createDemoPanel() {
        const panel = document.createElement('div');
        panel.className = 'template-demo-panel';
        panel.innerHTML = `
            <h3>Template Demo</h3>
            <div class="demo-controls">
                <button data-template="default" data-tooltip="Switch to Default template">Default</button>
                <button data-template="christmas" data-tooltip="Switch to Christmas template">🎄 Christmas</button>
                <button data-action="toggle-snow" data-tooltip="Toggle snowfall overlay">❄️ Toggle Snow</button>
                <button data-action="test-suggestion" data-tooltip="Preview suggestion prompt">💡 Test Suggestion</button>
            </div>
            <div class="demo-info">
                <p>Current: <span id="current-template">default</span></p>
                <p>Press 'C' for Christmas, 'D' for Default</p>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add event listeners
        panel.addEventListener('click', (e) => {
            if (e.target.dataset.template) {
                this.switchTemplate(e.target.dataset.template);
            } else if (e.target.dataset.action) {
                this.handleAction(e.target.dataset.action);
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only if not typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch (e.key.toLowerCase()) {
                case 'c':
                    e.preventDefault();
                    this.switchTemplate('christmas');
                    break;
                case 'd':
                    e.preventDefault();
                    this.switchTemplate('default');
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.testSnowfall();
                    }
                    break;
            }
        });
    }

    async switchTemplate(templateId) {
        if (window.templateManager) {
            await window.templateManager.switchToTemplate(templateId);
            document.getElementById('current-template').textContent = templateId;
            console.log(`🎨 Demo: Switched to ${templateId}`);
        }
    }

    async handleAction(action) {
        switch (action) {
            case 'toggle-snow':
                this.toggleSnow();
                break;
            case 'test-suggestion':
                this.testSuggestion();
                break;
        }
    }

    toggleSnow() {
        const snowfall = document.querySelector('.christmas-snowfall');
        if (snowfall) {
            snowfall.style.display = snowfall.style.display === 'none' ? 'block' : 'none';
            console.log('❄️ Snow toggled');
        }
    }

    testSuggestion() {
        if (window.templateManager) {
            window.templateManager.suggestTemplate('christmas');
            console.log('💡 Suggestion triggered');
        }
    }

    // Advanced testing methods
    async testAllTransitions() {
        console.log('🔄 Testing all template transitions...');
        
        await this.switchTemplate('default');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await this.switchTemplate('christmas');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        await this.switchTemplate('default');
        console.log('✅ Transition test complete');
    }

    measurePerformance() {
        const startTime = performance.now();
        
        // Test Christmas template activation
        this.switchTemplate('christmas').then(() => {
            const endTime = performance.now();
            console.log(`⚡ Christmas activation took ${endTime - startTime}ms`);
        });
    }

    exportTemplateState() {
        const state = {
            currentTemplate: window.templateManager?.currentTemplate,
            isChristmasActive: document.body.classList.contains('christmas-template'),
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Template State:', state);
        return state;
    }
}

// Initialize demo controller
window.TemplateDemo = TemplateDemo;

// Auto-start if debug mode
document.addEventListener('DOMContentLoaded', () => {
    const demo = new TemplateDemo();
    demo.initialize();
    
    // Expose for console access
    window.demo = demo;
});

// Advanced console commands for developers
if (typeof window !== 'undefined') {
    window.luxeReadDemo = {
        activateChristmas: () => window.templateManager?.switchToTemplate('christmas'),
        deactivate: () => window.templateManager?.switchToTemplate('default'),
        testTransitions: () => window.demo?.testAllTransitions(),
        enableDebug: () => {
            localStorage.setItem('luxeread_debug', 'true');
            location.reload();
        },
        disableDebug: () => {
            localStorage.removeItem('luxeread_debug');
            location.reload();
        }
    };
}
