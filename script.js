const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let isOffHook = false;
let isDirectoryOpen = false;
let isLanguageSelected = false;
let currentLang = 'en'; 
let inputString = "";
let currentTrackNum = 1; 
let directoryIndex = 2; 
let volIndex = 1; 
const volLevels = [0.25, 0.50, 0.75, 1.0];

const baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

const ui = {
    en: { dialNum: "DIAL NUMBER", directory: "00# DIRECTORY", prevNext: "4< PREV | 5:RND | 6> NEXT", dirNav: "2^ UP / 8v DOWN / # PLAY", invalid: "INVALID NUMBER" },
    es: { dialNum: "MARQUE NUMERO", directory: "00# DIRECTORIO", prevNext: "4< ANT | 5:AZAR | 6> SIG", dirNav: "2^ SUBIR/8v BAJAR/# TOCAR", invalid: "NUMERO INVALIDO" }
};

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

function writeLine(id, text, forceScroll = false) {
    const el = document.getElementById(id);
    if (id === 'line1') { el.innerText = "OMAHA PAYPHONE PROJECT"; return; }
    if (id === 'line4') { el.innerText = text; return; }
    if (forceScroll || text.length > 18) {
        el.innerHTML = `<div class="scroll-wrap">${text} &nbsp;&nbsp; ${text}</div>`;
    } else {
        el.innerHTML = `<div style="width:100%; text-align:center;">${text}</div>`;
    }
}

function updateLCDWithSync(l2, l3, l4) {
    const force = l2.length > 18 || l3.length > 18;
    writeLine('line2', l2, force);
    writeLine('line3', l3, force);
    writeLine('line4', l4);
}

function refreshDisplay() {
    const lang = ui[currentLang];
    if (!isLanguageSelected) {
        updateLCDWithSync("1: ENGLISH", "2: ESPANOL", "SELECT LANGUAGE");
    } else if (isDirectoryOpen) {
        showDirectoryEntry();
    } else if (currentTrackNum === 1) {
        updateLCDWithSync(lang.dialNum, lang.directory, " ");
    } else {
        const track = directory[currentTrackNum];
        const displayNum = currentTrackNum.toString().padStart(2, '0');
        updateLCDWithSync(`${displayNum} ${track.artist}`, track.title, lang.prevNext);
    }
}

function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR"; btn.classList.add('off-hook');
        isLanguageSelected = false;
        playTrack(100); 
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE"; btn.classList.remove('off-hook');
        updateLCDWithSync("LEVANTE", "ON HOOK", " ");
        audio.pause(); audio.src = "";
        isDirectoryOpen = false; inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return;

    if (!isLanguageSelected) {
        if (key === '1') { currentLang = 'en'; isLanguageSelected = true; playTrack(1); }
        else if (key === '2') { currentLang = 'es'; isLanguageSelected = true; playTrack(1); }
        return;
    }

    if (key === '*') { isDirectoryOpen = false; inputString = ""; playTrack(1); return; }

    inputString += key;

    if (inputString.includes("00#")) {
        isDirectoryOpen = true; directoryIndex = 2; showDirectoryEntry(); inputString = "";
        return;
    }

    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = (directoryIndex > 2) ? directoryIndex - 1 : 49; if (directoryIndex === 30 || directoryIndex === 43) directoryIndex--; showDirectoryEntry(); inputString = ""; }
        else if (key === '8') { directoryIndex = (directoryIndex < 49) ? directoryIndex + 1 : 2; if (directoryIndex === 30 || directoryIndex === 43) directoryIndex++; showDirectoryEntry(); inputString = ""; }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; inputString = ""; }
        return;
    }

    // THE WORKAROUND: If # is pressed, process the string. 
    // If a single command (4, 5, 6) is pressed ALONE, wait 500ms to see if more digits follow.
    if (key === '#') {
        const dialed = parseInt(inputString);
        if (directory[dialed]) playTrack(dialed);
        else {
            updateLCDWithSync(ui[currentLang].invalid, " ", " ");
            setTimeout(refreshDisplay, 1500);
        }
        inputString = "";
    } else {
        updateLCDWithSync("DIALING...", inputString, " ");
        
        // Timer logic for single-digit commands (4, 5, 6)
        if (inputString.length === 1 && (key === '4' || key === '5' || key === '6') && currentTrackNum > 1) {
            setTimeout(() => {
                if (inputString === key) { // No other digits were typed
                    if (key === '5') playRandom();
                    else if (key === '4') playTrack(currentTrackNum > 2 ? currentTrackNum - 1 : 49);
                    else if (key === '6') playTrack(currentTrackNum < 49 ? currentTrackNum + 1 : 2);
                    inputString = "";
                }
            }, 600); // 0.6 second window to type a second digit
        }
    }
}

function showDirectoryEntry() {
    const entry = directory[directoryIndex];
    const displayNum = directoryIndex.toString().padStart(2, '0');
    updateLCDWithSync(`${displayNum} ${entry.artist}`, entry.title, ui[currentLang].dirNav);
}

function playRandom() {
    let rand; do { rand = Math.floor(Math.random() * 48) + 2; } while (directory[rand] === undefined);
    playTrack(rand);
}

function playTrack(num) {
    if (num === 30 || num === 43) { updateLCDWithSync("COMING SOON", "OMAHA PAYPHONE", "DIRECTORY"); return; }
    currentTrackNum = num;
    audio.pause();
    clickAudio.src = "https://archive.org0099.mp3";
    clickAudio.play().catch(() => {});
    refreshDisplay();
    setTimeout(() => {
        audio.src = baseUrl + num.toString().padStart(4, '0') + ".mp3";
        audio.load();
        audio.play().then(() => { if (num !== 1 && num !== 100) refreshDisplay(); });
    }, 400);
}

function cycleVolume() {
    volIndex = (volIndex + 1) % volLevels.length;
    audio.volume = volLevels[volIndex];
    clickAudio.volume = volLevels[volIndex];
    document.getElementById('line2').innerHTML = "VOLUME: " + "I".repeat(volIndex + 1);
    setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500);
}
