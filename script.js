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
let cmdTimer = null; 
const volLevels = [0.25, 0.50, 0.75, 1.0];

const baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

const ui = {
    en: { d: "DIAL ARTIST #", r: "DIAL 5 FOR RANDOM", dr: "DIAL 00# FOR DIR", nav: "4:< 5:RANDOM 6:> *:MENU", dn: "2:^ 8:v #:PLAY *:MENU", inv: "INVALID" },
    es: { d: "MARQUE NUMERO", r: "MARQUE 5 AL AZAR", dr: "00# PARA DIRECTORIO", nav: "4:< 5:AZAR 6:> *:MENU", dn: "2:^ 8:v #:TOCAR *:MENU", inv: "INVALIDO" }
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
    if (id === 'line1') return;
    if (id === 'line4') { el.innerText = text; return; }
    if (forceScroll || text.length > 20) {
        el.innerHTML = `<div class="scroll-wrap">${text}</div>`;
    } else {
        el.innerHTML = `<div>${text}</div>`;
    }
}

function updateLCD(l2, l3, l4) {
    let allowScroll = (currentTrackNum > 1 && !isDirectoryOpen);
    let force = allowScroll ? (l2.length > 20 || l3.length > 20) : false;
    writeLine('line2', l2, force);
    writeLine('line3', l3, force);
    writeLine('line4', l4);
}

function refreshDisplay() {
    const lang = ui[currentLang];
    if (!isLanguageSelected) updateLCD("1: ENGLISH", "2: ESPANOL", "SELECT LANGUAGE");
    else if (isDirectoryOpen) showDirectoryEntry();
    else if (currentTrackNum === 1) updateLCD(lang.d, lang.r, lang.dr);
    else {
        const t = directory[currentTrackNum];
        updateLCD(`${currentTrackNum.toString().padStart(2,'0')} ${t.artist}`, t.title, lang.nav);
    }
}

function toggleHandset() {
    isOffHook = !isOffHook;
    const f = document.getElementById('handset-flipper');
    if (isOffHook) {
        if(f) f.classList.add('up'); 
        isLanguageSelected = false; 
        playTrack(100); 
    } else {
        if(f) f.classList.remove('up'); 
        updateLCD("LEVANTE", "ON HOOK", " ");
        audio.pause(); audio.src = ""; isDirectoryOpen = false; inputString = "";
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
    if (cmdTimer) { clearTimeout(cmdTimer); cmdTimer = null; }

    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = (directoryIndex > 2) ? directoryIndex - 1 : 49; if (directoryIndex === 30 || directoryIndex === 43) directoryIndex--; showDirectoryEntry(); }
        else if (key === '8') { directoryIndex = (directoryIndex < 49) ? directoryIndex + 1 : 2; if (directoryIndex === 30 || directoryIndex === 43) directoryIndex++; showDirectoryEntry(); }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; }
        return;
    }

    if (key === '#') {
        if (inputString === "00") { isDirectoryOpen = true; directoryIndex = 2; showDirectoryEntry(); }
        else {
            const dialed = parseInt(inputString);
            if (directory[dialed]) playTrack(dialed);
            else { updateLCD(ui[currentLang].inv, inputString, " "); setTimeout(refreshDisplay, 1500); }
        }
        inputString = "";
    } else {
        inputString += key;
        updateLCD("DIALING...", inputString, " ");
        if (inputString.length === 1 && (key === '4' || key === '5' || key === '6') && currentTrackNum > 1) {
            cmdTimer = setTimeout(() => {
                if (inputString === key) {
                    if (key === '5') playRandom();
                    else if (key === '4') playTrack(currentTrackNum > 2 ? (currentTrackNum-1 === 30 || currentTrackNum-1 === 43 ? currentTrackNum-2 : currentTrackNum-1) : 49);
                    else if (key === '6') playTrack(currentTrackNum < 49 ? (currentTrackNum+1 === 30 || currentTrackNum+1 === 43 ? currentTrackNum+2 : currentTrackNum+1) : 2);
                    inputString = "";
                }
                cmdTimer = null;
            }, 1000);
        }
    }
}

function showDirectoryEntry() {
    const e = directory[directoryIndex];
    updateLCD(`${directoryIndex.toString().padStart(2,'0')} ${e.artist}`, e.title, ui[currentLang].dn);
}

function playRandom() {
    let r; do { r = Math.floor(Math.random() * 48) + 2; } while (directory[r] === undefined || r === 30 || r === 43);
    playTrack(r);
}

function playTrack(num) {
    if (num === 30 || num === 43) { updateLCD("COMING SOON", "OMAHA PAYPHONE", " "); return; }
    currentTrackNum = num; audio.pause();
    clickAudio.src = baseUrl + "0099.mp3";
    clickAudio.play().catch(() => {});
    refreshDisplay();
    setTimeout(() => {
        let file = num.toString().padStart(4, '0') + ".mp3";
        audio.src = baseUrl + file;
        audio.load();
        audio.play().then(() => { if (num !== 1 && num !== 100) refreshDisplay(); });
    }, 400);
}

function cycleVolume() {
    volIndex = (volIndex + 1) % volLevels.length;
    audio.volume = volLevels[volIndex]; clickAudio.volume = volLevels[volIndex];
    updateLCD("VOLUME LEVEL", "I".repeat(volIndex + 1), " ");
    setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500);
}
