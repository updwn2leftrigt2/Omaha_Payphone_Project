// --- CONFIGURATION ---
const audio = new Audio();
audio.crossOrigin = "anonymous"; 

let isOffHook = false;
let inputString = "";

// Exact direct URLs to ensure no path errors
const dialToneUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/0001.mp3";
const baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

// --- TRACK LIST GENERATION ---
const tracks = [];
for (let i = 2; i <= 49; i++) {
    let fileName = i < 10 ? `000${i}.mp3` : `00${i}.mp3`;
    tracks.push(fileName);
}
tracks.push("0001.mp3", "0099.mp3", "0100.mp3");
let playlist = [...tracks];

// --- LCD DISPLAY LOGIC ---
function updateLCD(line3, line4 = "&nbsp;") {
    document.getElementById('status').innerText = line3;
    document.getElementById('input-display').innerHTML = line4;
}

// --- HANDSET LOGIC ---
function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR";
        btn.classList.add('off-hook');
        updateLCD("OFF HOOK", "DIAL NUMBER");
        
        // Use the hard-coded dial tone link
        audio.src = dialToneUrl;
        audio.load();
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("Dial tone started!");
            }).catch(error => {
                console.error("Playback failed:", error);
                updateLCD("ERROR", "TAP & RELIFT");
            });
        }
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE";
        btn.classList.remove('off-hook');
        updateLCD("ON HOOK", "&nbsp;");
        audio.pause();
        audio.currentTime = 0;
        inputString = "";
    }
}

// --- KEYPAD LOGIC ---
function press(key) {
    if (!isOffHook) return;
    inputString += key;
    updateLCD("DIALING...", inputString);

    if (inputString === "00#") {
        playShuffle();
        inputString = "";
    } else if (inputString.length >= 4) {
        setTimeout(() => { 
            inputString = ""; 
            updateLCD("OFF HOOK", "DIAL NUMBER"); 
        }, 1500);
    }
}

// --- SHUFFLE LOGIC ---
function playShuffle() {
    if (playlist.length === 0) playlist = [...tracks];
    const randomIndex = Math.floor(Math.random() * playlist.length);
    const track = playlist.splice(randomIndex, 1);
    
    updateLCD("PLAYING FROM", "DIRECTORY...");
    audio.src = baseUrl + track;
    audio.play().catch(e => {
        console.error("Directory track failed:", e);
        updateLCD("ERROR", "NOT FOUND");
    });
}
