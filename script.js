const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let isOffHook = false;
let isDirectoryOpen = false;
let inputString = "";
let currentTrackNum = 1;
let directoryIndex = 2; 
let volIndex = 1; 
const volLevels = [0.25, 0.50, 0.75, 1.0];

const baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

// --- FULL DIRECTORY ---
const directory = {
    1: { title: "DIAL TONE", artist: "SYSTEM" },
    2: { title: "Peacocks Patient", artist: "Alina Nguyen" },
    3: { title: "Moon Tune", artist: "Aly Peeler & Friends" },
    4: { title: "Madeleine", artist: "Amelie Raoul" },
    5: { title: "Bottom of the Cup", artist: "Amy Haddad" },
    6: { title: "Drink Your Tea", artist: "Angelica Perez" },
    7: { title: "Whos Gonna Stand Up", artist: "BOLD NE (Neil Young)" },
    8: { title: "Alone.", artist: "Dos Mundos (Colton S.)" },
    9: { title: "The Peace (A Cappella)", artist: "Conny Franko" },
    10: { title: "2+1", artist: "Dead Poets" },
    11: { title: "Childhood", artist: "Dereck Higgins" },
    12: { title: "Tea Now", artist: "Dex Arbor (ft. Flora J)" },
    13: { title: "Ocean Breath", artist: "Dmitrii Shaposhnikov" },
    14: { title: "Love Surrounding", artist: "EDEM SOUL" },
    15: { title: "Son of the Soil", artist: "Gerard Pefung" },
    16: { title: "May Queen", artist: "Hair Person" },
    17: { title: "Duniya", artist: "ID (ilahi & deLorenzo)" },
    18: { title: "Alignment", artist: "Jewel Rodgers & Serholt" },
    19: { title: "A Single Refugee Mom", artist: "Kam Bany" },
    20: { title: "Racecar", artist: "Kevin Paradise" },
    21: { title: "My Father Apologizes", artist: "Kimberly Nguyen" },
    22: { title: "Gbandjo", artist: "Kusher Snazzy" },
    23: { title: "Pidgin", artist: "Lindsey Anne Baker" },
    24: { title: "For You & Presence", artist: "Maritza N. Estrada" },
    25: { title: "Shimmering", artist: "Mesonjixx (Mary L)" },
    26: { title: "Amethyst", artist: "Melina" },
    27: { title: "Here We Are. Still.", artist: "Meredith Ann Fuller" },
    28: { title: "An Act of Naming", artist: "Natasha Kessler" },
    29: { title: "Critic", artist: "Ol Mo (Robin S Kessler)" },
    31: { title: "FOLK SONG 3", artist: "Otis Twelve (ft Dereck)" },
    32: { title: "Snow Song", artist: "Rayni Wekluk" },
    33: { title: "Unconditional Blues", artist: "Renzellous Brown" },
    34: { title: "Edgy Refugee", artist: "Rosine Selemani" },
    35: { title: "Slumber", artist: "Sam Brock" },
    36: { title: "Excerpt: Bright Star", artist: "Sarah Rowe" },
    37: { title: "Folks", artist: "Sgt. Leisure" },
    38: { title: "FU Babies", artist: "Stacey Barelos" },
    39: { title: "To the Broken Few", artist: "Stolen Wolves (Inno)" },
    40: { title: "My Journey", artist: "Sulekha Ali" },
    41: { title: "A la", artist: "Sanchez/Bartolomei/Boyd" },
    42: { title: "THEY BITE", artist: "SWAMPD" },
    44: { title: "Hold On", artist: "The Mynabirds (Laura)" },
    45: { title: "Agnostic Maps", artist: "Todd Robinson" },
    46: { title: "Against Distance", artist: "Trey Moody" },
    47: { title: "All Nighter", artist: "UN-T.I.L." },
    48: { title: "To Word Counts", artist: "Victoria Bogatz" },
    49: { title: "The Ocelot", artist: "Winston F. Schneider" }
};

function writeLine(id, text) {
    const el = document.getElementById(id);
    
    // Line 4 is the stationary navigation line - NO DUPLICATION
    if (id === 'line4') {
        el.innerHTML = text; // Just show the text once
        return;
    }

    // Lines 2 and 3 scroll and duplicate only if text is longer than 18 characters
    if (text.length > 18) {
        el.innerHTML = `<div class="scroll-wrap">${text} &nbsp;&nbsp; ${text}</div>`;
    } else {
        el.innerHTML = text; // Show normally if short enough
    }
}

function updateLCD(l2, l3, l4) {
    writeLine('line2', l2);
    writeLine('line3', l3);
    writeLine('line4', l4 || " "); 
}

function cycleVolume() {
    volIndex = (volIndex + 1) % volLevels.length;
    audio.volume = volLevels[volIndex];
    clickAudio.volume = volLevels[volIndex];
    document.getElementById('line2').innerText = "VOLUME: " + "I".repeat(volIndex + 1);
    setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500);
}

function refreshDisplay() {
    if (isDirectoryOpen) {
        showDirectoryEntry();
    } else if (currentTrackNum === 1) {
        updateLCD("OFF HOOK", "DIAL NUMBER", "00# DIRECTORY");
    } else {
        const track = directory[currentTrackNum];
        const displayNum = currentTrackNum.toString().padStart(2, '0');
        updateLCD(`${displayNum} ${track.artist}`, track.title, "4< PREV | 5:RND | 6> NEXT");
    }
}

function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR"; btn.classList.add('off-hook');
        playTrack(1); 
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE"; btn.classList.remove('off-hook');
        updateLCD("LEVANTE", "ON HOOK", " ");
        audio.pause(); audio.src = "";
        isDirectoryOpen = false; inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return;

    inputString += key;
    if (inputString.includes("00#")) {
        isDirectoryOpen = true; directoryIndex = 2; showDirectoryEntry(); inputString = "";
        return;
    }

    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = directoryIndex > 2 ? directoryIndex - 1 : 49; showDirectoryEntry(); }
        else if (key === '8') { directoryIndex = directoryIndex < 49 ? directoryIndex + 1 : 2; showDirectoryEntry(); }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; }
        else if (key === '*') { isDirectoryOpen = false; refreshDisplay(); }
        inputString = "";
        return;
    }

    if (key === '5') { playRandom(); inputString = ""; }
    else if (key === '4') { 
        let prev = currentTrackNum > 2 ? (currentTrackNum-1 === 30 || currentTrackNum-1 === 43 ? currentTrackNum-2 : currentTrackNum-1) : 49; 
        playTrack(prev); inputString = ""; 
    }
    else if (key === '6') { 
        let next = currentTrackNum < 49 ? (currentTrackNum+1 === 30 || currentTrackNum+1 === 43 ? currentTrackNum+2 : currentTrackNum+1) : 2; 
        playTrack(next); inputString = ""; 
    }
    else if (key === '#') {
        const dialed = parseInt(inputString.replace('#',''));
        if (directory[dialed]) playTrack(dialed);
        else updateLCD("INVALID", "NUMBER", "TRY AGAIN");
        inputString = "";
    } else {
        document.getElementById('line2').innerText = "DIALING...";
        document.getElementById('line3').innerText = inputString;
    }
}

function showDirectoryEntry() {
    const entry = directory[directoryIndex];
    const displayNum = directoryIndex.toString().padStart(2, '0');
    updateLCD(`${displayNum} ${entry.artist}`, entry.title, "2^ UP / 8v DOWN / # PLAY");
}

function playRandom() {
    let rand; do { rand = Math.floor(Math.random() * 48) + 2; } while (rand === 30 || rand === 43);
    playTrack(rand);
}

function playTrack(num) {
    if (num === 30 || num === 43) { updateLCD("TRACK COMING SOON", "DIAL 00# FOR", "DIRECTORY"); return; }
    const track = directory[num];
    if (!track) return;
    currentTrackNum = num; audio.pause();
    
    // Relay click sound using full URL
    clickAudio.src = "https://archive.org0099.mp3";
    clickAudio.play().catch(() => {});
    
    refreshDisplay();

    setTimeout(() => {
        let file = num.toString().padStart(4, '0') + ".mp3";
        audio.src = baseUrl + file;
        audio.load();
        audio.play().then(() => { if (num !== 1) refreshDisplay(); }).catch(e => console.error("Playback failed", e));
    }, 400);
}
