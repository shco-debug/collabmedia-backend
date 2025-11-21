(function () {
  class TooltipManager {
    constructor() {
      this.activeTouchTarget = null;
      this.touchHideTimeout = null;
      this.touchVisibleDuration = 2500;
      this.handleTouchStart = this.handleTouchStart.bind(this);
      this.handleTouchEnd = this.handleTouchEnd.bind(this);
      this.handleScroll = this.handleScroll.bind(this);
      if (typeof document !== 'undefined') {
        document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd, { passive: true });
        window.addEventListener('scroll', this.handleScroll, { passive: true });
      }
    }

    set(element, text, options = {}) {
      if (!element) return;
      const { placement, ariaLabel } = options;
      if (typeof text === 'string' && text.trim().length) {
        element.setAttribute('data-tooltip', text);
      } else {
        element.removeAttribute('data-tooltip');
      }
      const nextPlacement =
        placement || element.getAttribute('data-tooltip-placement') || 'top';
      if (nextPlacement) {
        element.setAttribute('data-tooltip-placement', nextPlacement);
      }
      let ariaValue;
      if (options.hasOwnProperty('ariaLabel')) {
        ariaValue = ariaLabel;
      } else if (typeof text === 'string' && text.trim().length) {
        ariaValue = text;
      }
      if (typeof ariaValue === 'string') {
        element.setAttribute('aria-label', ariaValue);
      } else if (ariaValue === null) {
        element.removeAttribute('aria-label');
      }
    }

    update(element, text, options = {}) {
      this.set(element, text, options);
    }

    handleTouchStart(event) {
      const target = event.target.closest('[data-tooltip]');
      if (!target) {
        this.hideTouchTooltip();
        return;
      }
      this.showTouchTooltip(target);
    }

    handleTouchEnd() {
      this.scheduleTouchHide();
    }

    handleScroll() {
      this.hideTouchTooltip();
    }

    showTouchTooltip(target) {
      if (this.activeTouchTarget && this.activeTouchTarget !== target) {
        this.activeTouchTarget.removeAttribute('data-tooltip-visible');
      }
      this.activeTouchTarget = target;
      target.setAttribute('data-tooltip-visible', 'true');
      this.scheduleTouchHide();
    }

    scheduleTouchHide() {
      if (!this.activeTouchTarget) return;
      clearTimeout(this.touchHideTimeout);
      this.touchHideTimeout = setTimeout(() => this.hideTouchTooltip(), this.touchVisibleDuration);
    }

    hideTouchTooltip() {
      if (this.activeTouchTarget) {
        this.activeTouchTarget.removeAttribute('data-tooltip-visible');
        this.activeTouchTarget = null;
      }
      clearTimeout(this.touchHideTimeout);
    }
  }

  window.tooltipManager = new TooltipManager();
})();
