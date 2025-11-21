// Ambient Soundscape Generator
class AmbientSoundscape {
    constructor() {
        this.audioContext = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.isPlaying = false;
    }
    
    init() {
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    start(mode, variant = 1) {
        if (!this.audioContext) return;
        
        this.stop(); // Stop any existing sounds
        this.currentVariant = variant;
        
        const soundscapes = {
            manuscript: this.createManuscriptAmbience.bind(this),
            salon: this.createSalonAmbience.bind(this),
            mythos: this.createMythosAmbience.bind(this)
        };
        
        if (soundscapes[mode]) {
            soundscapes[mode](variant);
            this.isPlaying = true;
        }
    }
    
    createManuscriptAmbience(variant = 1) {
        switch(variant) {
            case 1: // Gentle (default) - minimal, meditative
                this.addWaveTone(220, 0.01, 24000, 15000); // A3 - Low ambient hum
                this.addWaveTone(440, 0.005, 24000, 15000, 3000); // A4 - Harmonic, delayed
                break;
                
            case 2: // Warm - slightly richer, cozier
                this.addWaveTone(196, 0.012, 21000, 12500); // G3 - Warm foundation
                this.addWaveTone(294, 0.008, 21000, 12500, 2400); // D4
                this.addWaveTone(392, 0.006, 21000, 12500, 4800); // G4 - Gentle overtone
                break;
                
            case 3: // Airy - higher frequencies, more space
                this.addWaveTone(261.63, 0.008, 27000, 20000); // C4 - Bright center
                this.addWaveTone(329.63, 0.007, 27000, 20000, 3600); // E4
                this.addWaveTone(523.25, 0.004, 27000, 20000, 7200); // C5 - Shimmer
                break;
                
            case 4: // Deep - lower register, grounding
                this.addWaveTone(110, 0.015, 30000, 20000); // A2 - Deep bass
                this.addWaveTone(164.81, 0.01, 30000, 20000, 4500); // E3
                this.addWaveTone(220, 0.008, 30000, 20000, 9000); // A3
                break;
        }
    }
    
    createSalonAmbience() {
        // Warmer, richer ambience
        this.addTone(174.61, 0.015); // F3
        this.addTone(261.63, 0.01);  // C4
        this.addTone(329.63, 0.008); // E4
        
        // Add gentle filtering
        this.oscillators.forEach(osc => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            osc.connect(filter);
            filter.connect(this.audioContext.destination);
        });
    }
    
    createMythosAmbience() {
        // Deep, immersive, evolving soundscape
        this.addTone(55, 0.02);    // A1 - deep bass
        this.addTone(110, 0.015);  // A2
        this.addTone(165, 0.01);   // E3
        this.addTone(220, 0.008);  // A3
        
        // Add slow LFO modulation
        this.oscillators.forEach((osc, i) => {
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            lfo.frequency.value = 0.1 + (i * 0.05); // Slow modulation
            lfoGain.gain.value = 10;
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            lfo.start();
        });
    }
    
    addTone(frequency, volume) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = volume;
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start();
        
        this.oscillators.push(oscillator);
        this.gainNodes.push(gainNode);
    }
    
    addWaveTone(frequency, maxVolume, cycleDuration = 8000, silenceDuration = 3000, startDelay = 0) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0; // Start at silence
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        const now = this.audioContext.currentTime;
        oscillator.start(now + (startDelay / 1000));
        
        // Create wave pattern: fade in -> sustain -> fade out -> silence -> repeat
        const fadeInDuration = cycleDuration * 0.3 / 1000; // 30% of cycle
        const sustainDuration = cycleDuration * 0.4 / 1000; // 40% of cycle
        const fadeOutDuration = cycleDuration * 0.3 / 1000; // 30% of cycle
        const totalCycle = (cycleDuration + silenceDuration) / 1000;
        
        let currentTime = now + (startDelay / 1000);
        
        // Create 20 cycles (about 3-5 minutes depending on variant)
        for (let i = 0; i < 20; i++) {
            const cycleStart = currentTime + (i * totalCycle);
            
            // Fade in
            gainNode.gain.setValueAtTime(0, cycleStart);
            gainNode.gain.linearRampToValueAtTime(maxVolume, cycleStart + fadeInDuration);
            
            // Sustain
            gainNode.gain.setValueAtTime(maxVolume, cycleStart + fadeInDuration);
            
            // Fade out
            gainNode.gain.setValueAtTime(maxVolume, cycleStart + fadeInDuration + sustainDuration);
            gainNode.gain.linearRampToValueAtTime(0, cycleStart + fadeInDuration + sustainDuration + fadeOutDuration);
            
            // Silence
            gainNode.gain.setValueAtTime(0, cycleStart + fadeInDuration + sustainDuration + fadeOutDuration);
        }
        
        this.oscillators.push(oscillator);
        this.gainNodes.push(gainNode);
    }
    
    stop() {
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch(e) {}
        });
        
        this.oscillators = [];
        this.gainNodes = [];
        this.isPlaying = false;
    }
    
    fadeOut(duration = 2000) {
        const fadeSteps = 20;
        const stepDuration = duration / fadeSteps;
        let step = 0;
        
        const fadeInterval = setInterval(() => {
            step++;
            const volume = 1 - (step / fadeSteps);
            
            this.gainNodes.forEach(gain => {
                gain.gain.value *= volume;
            });
            
            if (step >= fadeSteps) {
                clearInterval(fadeInterval);
                this.stop();
            }
        }, stepDuration);
    }
}

// Export for use in main script
window.AmbientSoundscape = AmbientSoundscape;