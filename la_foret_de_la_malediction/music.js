
// Liste des pistes musicales disponibles
export const tracks = [
    "../music/3 Hours of Relaxing Super Nintendo Music, Part 1 - SNESdrunk.mp3",
    "../music/3 More Hours of Relaxing Super Nintendo Music - SNESdrunk.mp3",
    "../music/Another 3 Hours of Relaxing Super Nintendo Music - SNESdrunk.mp3",
    "../music/Good Ending - Relaxing & downbeat Sega Genesis music mix (2 hours).mp3",
    "../music/Relaxing Super Nintendo Music, Part 4 - SNESdrunk.mp3",
    "../music/Relaxing GenesisMegadrive Music (100 songs) - Part 1.mp3",
    "../music/Relaxing GenesisMegadrive Music (100 songs) - Part 2.mp3"
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

