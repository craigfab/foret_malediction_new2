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

