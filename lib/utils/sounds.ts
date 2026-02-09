/**
 * Game Sound Manager
 * Handles playing win and lose sounds using Web Audio API
 */

export const playWinSound = () => {
    if (typeof window === 'undefined') return;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();

        const playTone = (freq: number, startDelay: number, duration: number) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startDelay);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startDelay);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + startDelay + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startDelay + duration);

            oscillator.start(audioCtx.currentTime + startDelay);
            oscillator.stop(audioCtx.currentTime + startDelay + duration);
        };

        // "Trink!" - Two quick, bright pulses
        playTone(1320, 0, 0.15);      // High E
        playTone(1760, 0.08, 0.2);    // Higher A (Fast-follow)

    } catch (e) {
        console.warn('Audio not available:', e);
    }
};

export const playLoseSound = () => {
    if (typeof window === 'undefined') return;

    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const audioCtx = new AudioContextClass();

        // Auto-resume context if suspended (browser policy)
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // More audible "thud" for lose
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        console.warn('Audio not available:', e);
    }
};
