// Liste des pistes musicales disponibles
export const tracks = [
    "../music/3 Hours of Relaxing Super Nintendo Music, Part 1.1 - SNESdrunk (online-audio-converter.com) (1).mp3",
    "../music/3 Hours of Relaxing Super Nintendo Music, Part 1.2 - SNESdrunk (online-audio-converter.com) (1).mp3",
    "../music/3 More Hours of Relaxing Super Nintendo Music 2.1- SNESdrunk (online-audio-converter.com).mp3",
    "../music/3 More Hours of Relaxing Super Nintendo Music 2.2 - SNESdrunk (online-audio-converter.com).mp3",
    "../music/Another 3 Hours of Relaxing Super Nintendo Music 3.1 - SNESdrunk (online-audio-converter.com).mp3",
    "../music/Another 3 Hours of Relaxing Super Nintendo Music 3.2 - SNESdrunk (online-audio-converter.com).mp3",
    "../music/Good Ending - Relaxing & downbeat Sega Genesis music mix (2 hours) part 1 (online-audio-converter.com).mp3",
    "../music/Good Ending - Relaxing & downbeat Sega Genesis music mix (2 hours) part 2 (online-audio-converter.com).mp3",
    "../music/Relaxing GenesisMegadrive Music (100 songs) - Part 1.1 (online-audio-converter.com) (1) - Copie.mp3",
    "../music/Relaxing GenesisMegadrive Music (100 songs) - Part 1.2 (online-audio-converter.com) (1).mp3",
    "../music/Relaxing GenesisMegadrive Music (100 songs) - Part 2.1 (online-audio-converter.com) (1).mp3",
    "../music/Relaxing GenesisMegadrive Music (100 songs) - Part 2.2 (online-audio-converter.com) (1) - Copie.mp3",
    "../music/Relaxing Super Nintendo Music, Part 4.1- SNESdrunk (online-audio-converter.com).mp3",
    "../music/Relaxing Super Nintendo Music, Part 4.2 - SNESdrunk (online-audio-converter.com).mp3"
];

// Sélectionnez aléatoirement une piste
export function selectRandomTrack() {
    const randomIndex = Math.floor(Math.random() * tracks.length);
    return tracks[randomIndex];
}

// Mettez à jour la source de l'audio avec une piste sélectionnée aléatoirement
export function loadRandomTrack() {
    const audioPlayer = document.getElementById('audioPlayer');
    if (audioPlayer) {
        const trackSource = audioPlayer.querySelector('source');
        trackSource.src = selectRandomTrack();
        audioPlayer.load(); // Chargez la nouvelle piste
    }
}

// ==================== SYSTÈME D'EFFETS SONORES ====================

// Classe pour gérer les effets sonores
class SoundEffectManager {
    constructor() {
        this.volume = 0.3; // Volume par défaut des effets sonores
        this.audioContext = null;
    }

    // Initialiser le contexte audio
    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return this.audioContext;
    }

    // Jouer un effet sonore synthétique
    playSound(name) {
        try {
            const audioContext = this.initAudioContext();
            
            // Reprendre le contexte audio si nécessaire (requis par certains navigateurs)
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            switch(name) {
                case 'playerAttack':
                    this.createSwordSound(audioContext);
                    break;
                case 'monsterAttack':
                    this.createClawSound(audioContext);
                    break;
                case 'criticalHit':
                    this.createCriticalSound(audioContext);
                    break;
                case 'victory':
                    this.createVictorySound(audioContext);
                    break;
                case 'defeat':
                    this.createDefeatSound(audioContext);
                    break;
                default:
                    console.warn(`Son '${name}' non trouvé`);
            }
        } catch (error) {
            console.warn(`Erreur lors de la lecture du son '${name}':`, error);
        }
    }

    // Créer le son d'épée (attaque du joueur)
    createSwordSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    // Créer le son de griffes (attaque du monstre)
    createClawSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 300;
        oscillator.type = 'sawtooth';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume, audioContext.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    // Créer le son de coup critique
    createCriticalSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.volume * 0.8, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.4);
    }

    // Créer le son de victoire
    createVictorySound(audioContext) {
        // Créer une mélodie ascendante pour la victoire
        const frequencies = [523, 659, 784]; // Do, Mi, Sol
        
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'triangle';
            
            const startTime = audioContext.currentTime + (index * 0.2);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.6, startTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    }

    // Créer le son de défaite
    createDefeatSound(audioContext) {
        // Mélodie descendante pour la défaite
        const frequencies = [392, 330, 262]; // Sol, Mi♭, Do
        
        frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = freq;
            oscillator.type = 'sawtooth';
            
            const startTime = audioContext.currentTime + (index * 0.3);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, startTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + 0.8);
        });
    }

    // Ajuster le volume des effets sonores
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
}

// Instance globale du gestionnaire d'effets sonores
export const soundManager = new SoundEffectManager();

// Initialiser les effets sonores
export function initializeSoundEffects() {
    // Le gestionnaire d'effets sonores est maintenant prêt à l'emploi
    // Les sons sont générés à la demande via Web Audio API
    console.log('Système d\'effets sonores initialisé');
}

// Fonctions d'assistance pour jouer des sons spécifiques
export function playAttackSound(isPlayer = true) {
    soundManager.playSound(isPlayer ? 'playerAttack' : 'monsterAttack');
}

export function playCriticalHitSound() {
    soundManager.playSound('criticalHit');
}

export function playVictorySound() {
    soundManager.playSound('victory');
}

export function playDefeatSound() {
    soundManager.playSound('defeat');
}

