class VibeTemplateManager {
  constructor() {
    this.vibes = new Map();
    this.activeVibe = null;
    this.cleanup = null;
    this.controlPanel = null;
    this.registerDefaultVibes();
  }

  registerDefaultVibes() {
    this.registerVibe('UES', {
      className: 'vibe-ues',
      description: 'Upper East Side white-card treatment',
      apply: () => this.initUESControls()
    });
  }

  registerVibe(name, config) {
    if (!name || !config) return;
    this.vibes.set(name.toLowerCase(), config);
  }

  clearActiveVibe() {
    if (typeof this.cleanup === 'function') {
      this.cleanup();
      this.cleanup = null;
    }
    if (this.activeVibe) {
      const config = this.vibes.get(this.activeVibe);
      if (config && config.className) {
        document.body.classList.remove(config.className);
      }
    }
    this.activeVibe = null;
  }

  applyVibe(name) {
    if (!name) {
      this.clearActiveVibe();
      return;
    }
    const key = name.toLowerCase();
    const config = this.vibes.get(key);
    if (!config) {
      this.clearActiveVibe();
      return;
    }
    if (this.activeVibe === key) return;
    this.clearActiveVibe();
    const cleanups = [];
    if (config.className) {
      document.body.classList.add(config.className);
      cleanups.push(() => document.body.classList.remove(config.className));
      
      // Immediately reveal all paragraphs when UES mode is activated to prevent flickering
      if (config.className === 'vibe-ues') {
        requestAnimationFrame(() => {
          const paragraphs = document.querySelectorAll('.paragraph, .section-title');
          paragraphs.forEach(el => el.classList.add('revealed'));
        });
      }
    }
    if (typeof config.apply === 'function') {
      const extra = config.apply();
      if (typeof extra === 'function') {
        cleanups.push(extra);
      }
    }
    this.cleanup = () => {
      while (cleanups.length) {
        const fn = cleanups.pop();
        try {
          fn();
        } catch (err) {
          console.error(err);
        }
      }
    };
    this.activeVibe = key;
  }

  initUESControls() {
    // Only show control panel in testing mode
    const urlParams = new URLSearchParams(window.location.search);
    const isTestingMode = urlParams.has('testing');
    
    const defaults = {
      blur: 0,
      opacity: 0,
      glass: 0,
      diffuser: 0
    };
    const stored = this.loadVibeState('UES');
    const state = { ...defaults };
    if (stored && typeof stored === 'object') {
      Object.keys(defaults).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(stored, key) && Number.isFinite(stored[key])) {
          state[key] = stored[key];
        }
      });
    }
    
    let panel = null;
    if (isTestingMode) {
      panel = document.createElement('div');
      panel.className = 'vibe-control-panel';
      panel.innerHTML = '<h4>Vibe Controls</h4>';
    }

    const rows = [
      { key: 'blur', label: 'Blur', step: 1, min: 0, max: 60, format: (v) => `${Math.round(v)}px` },
      { key: 'opacity', label: 'Opacity', step: 0.05, min: 0, max: 0.95, format: (v) => v.toFixed(2) },
      { key: 'glass', label: 'Glass Glow', step: 0.05, min: 0, max: 0.8, format: (v) => v.toFixed(2) },
      { key: 'diffuser', label: 'Diffuser', step: 1, min: 0, max: 100, format: (v) => `${Math.round(v)}%` }
    ];

    const getPrecision = (step) => {
      const asString = String(step);
      if (!asString.includes('.')) return 0;
      return asString.split('.')[1].length;
    };

    const clampValue = (row, value) => {
      const decimals = row.decimals ?? getPrecision(row.step);
      const factor = Math.pow(10, decimals);
      const clamped = Math.min(row.max, Math.max(row.min, value));
      return factor === 0 ? clamped : Math.round(clamped * factor) / factor;
    };

    const applyState = () => {
      document.body.style.setProperty('--ues-blur', `${state.blur}px`);
      document.body.style.setProperty('--ues-opacity', state.opacity.toFixed(2));
      document.body.style.setProperty('--ues-glass', state.glass.toFixed(2));
      document.body.style.setProperty('--ues-diffuser', state.diffuser.toFixed(0));
      
      // Set data attribute for CSS targeting when blur is active
      document.body.setAttribute('data-ues-blur-active', state.blur > 0 ? 'true' : 'false');
      
      if (state.blur <= 0 && state.opacity <= 0 && state.glass <= 0 && state.diffuser <= 0) {
        document.body.classList.add('vibe-ues-clear');
      } else {
        document.body.classList.remove('vibe-ues-clear');
      }
      this.saveVibeState('UES', state);
      if (panel) {
        rows.forEach(row => {
          const valueEl = panel.querySelector(`[data-control-value="${row.key}"]`);
          if (valueEl) {
            valueEl.textContent = row.format(state[row.key]);
          }
        });
      }
    };

    if (panel) {
      rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'vibe-control-row';

      const labelEl = document.createElement('div');
      labelEl.className = 'vibe-control-label';
      labelEl.textContent = row.label;

      const valueEl = document.createElement('div');
      valueEl.className = 'vibe-control-value';
      valueEl.dataset.controlValue = row.key;

      const buttons = document.createElement('div');
      buttons.className = 'vibe-control-buttons';

      const dec = document.createElement('button');
      dec.type = 'button';
      dec.textContent = '−';
      dec.addEventListener('click', () => {
        state[row.key] = clampValue(row, state[row.key] - row.step);
        applyState();
      });

      const inc = document.createElement('button');
      inc.type = 'button';
      inc.textContent = '+';
      inc.addEventListener('click', () => {
        state[row.key] = clampValue(row, state[row.key] + row.step);
        applyState();
      });

      buttons.appendChild(dec);
      buttons.appendChild(inc);

        rowEl.appendChild(labelEl);
        rowEl.appendChild(valueEl);
        rowEl.appendChild(buttons);
        panel.appendChild(rowEl);
      });

      // Action buttons container
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'vibe-control-actions';

      // Save Settings button
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'vibe-action-button vibe-action-save';
      saveBtn.textContent = 'Save Settings';
      saveBtn.addEventListener('click', () => {
        this.saveVibeState('UES', state);
        // Visual feedback
        saveBtn.textContent = 'Saved!';
        setTimeout(() => {
          saveBtn.textContent = 'Save Settings';
        }, 1500);
      });

      // Return to Default button
      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'vibe-action-button vibe-action-reset';
      resetBtn.textContent = 'Return to Default';
      resetBtn.addEventListener('click', () => {
        // Reset to defaults
        state.blur = defaults.blur;
        state.opacity = defaults.opacity;
        state.glass = defaults.glass;
        state.diffuser = defaults.diffuser;
        applyState();
        // Visual feedback
        resetBtn.textContent = 'Reset!';
        setTimeout(() => {
          resetBtn.textContent = 'Return to Default';
        }, 1500);
      });

      actionsContainer.appendChild(saveBtn);
      actionsContainer.appendChild(resetBtn);
      panel.appendChild(actionsContainer);

      document.body.appendChild(panel);
    }
    
    applyState();

    return () => {
      document.body.style.removeProperty('--ues-blur');
      document.body.style.removeProperty('--ues-opacity');
      document.body.style.removeProperty('--ues-glass');
      document.body.style.removeProperty('--ues-diffuser');
      document.body.classList.remove('vibe-ues-clear');
      if (panel) {
        panel.remove();
      }
    };
  }

  getVibeStorageKey(name) {
    if (!name) return null;
    return `luxe_read_vibe_${name.toLowerCase()}`;
  }

  loadVibeState(name) {
    try {
      const key = this.getVibeStorageKey(name);
      const hasStorage = typeof window !== 'undefined' && window.localStorage;
      if (!key || !hasStorage) return null;
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Unable to load vibe state', error);
      return null;
    }
  }

  saveVibeState(name, state) {
    try {
      const key = this.getVibeStorageKey(name);
      const hasStorage = typeof window !== 'undefined' && window.localStorage;
      if (!key || !hasStorage || !state) return;
      const snapshot = {};
      Object.keys(state).forEach((k) => {
        if (Number.isFinite(state[k])) {
          snapshot[k] = state[k];
        }
      });
      window.localStorage.setItem(key, JSON.stringify(snapshot));
    } catch (error) {
      console.warn('Unable to save vibe state', error);
    }
  }
}

window.vibeManager = new VibeTemplateManager();
