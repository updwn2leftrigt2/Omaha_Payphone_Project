const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let isOffHook = false;
let inputString = "";
let volIndex = 1; 
const volLevels = [0.25, 0.50, 0.75, 1.0];

// DIRECT SERVER URL FROM YOUR DIRECTORY LIST
const baseUrl = "https://archive.org";

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

function updateLCD(l1, l2, l3, l4) {
    document.getElementById('line1').innerText = l1;
    document.getElementById('line2').innerText = l2;
    document.getElementById('line3').innerText = l3;
    document.getElementById('line4').innerHTML = l4 || "&nbsp;";
}

function cycleVolume() {
    volIndex = (volIndex + 1) % volLevels.length;
    audio.volume = volLevels[volIndex];
    clickAudio.volume = volLevels[volIndex];
    updateLCD("VOLUME LEVEL:", "I".repeat(volIndex + 1), "---", "---");
    setTimeout(() => { if (isOffHook) updateLCD("OFF HOOK", "DIAL NUMBER", "---", ""); }, 1500);
}

function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR";
        btn.classList.add('off-hook');
        playTrack(1); // Dial Tone
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE";
        btn.classList.remove('off-hook');
        updateLCD("LIFT HANDSET /", "LEVANTE", "ON HOOK", "&nbsp;");
        audio.pause();
        audio.removeAttribute('src'); 
        audio.load();
        inputString = "";
    }
}

function playTrack(num) {
    if (num === 30 || num === 43) {
        updateLCD("STAY TUNED", "TRACK COMING SOON", "---", ""); 
        return;
    }

    const track = directory[num];
    if (!track) return;

    // Reset Audio object state to clear errors
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    // Play "Click" (Track 0099)
    clickAudio.src = baseUrl + "0099.mp3";
    clickAudio.play().catch(e => console.log("Click skipped"));

    // SMALL BUFFER: Let the browser handshake with the server
    setTimeout(() => {
        let file = num.toString().padStart(4, '0') + ".mp3";
        audio.src = baseUrl + file;
        audio.load();
        
        // Final attempt to play after handshake
        audio.play().then(() => {
            updateLCD("NOW PLAYING:", track.title, "BY:", track.artist);
        }).catch(e => {
            console.error("Playback failed:", e);
            updateLCD("ERROR", "RE-CLICK LIFT", "---", "");
        });
    }, 500);
}

function press(key) {
    if (!isOffHook) return;
    inputString += key;
    updateLCD("DIALING...", inputString, "---", "");

    if (inputString === "00#") {
        let rand; 
        do { rand = Math.floor(Math.random() * 48) + 2; } 
        while (rand === 30 || rand === 43);
        playTrack(rand); 
        inputString = "";
    } else if (inputString.length >= 4) {
        setTimeout(() => { inputString = ""; updateLCD("OFF HOOK", "DIAL NUMBER", "---", ""); }, 1500);
    }
}
