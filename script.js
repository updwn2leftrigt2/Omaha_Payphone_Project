const audio = new Audio();
audio.crossOrigin = "anonymous"; // CRITICAL: Fixes CORS errors for Archive.org

let isOffHook = false;
let inputString = "";
const baseUrl = "https://archive.org";

// --- TRACK LIST GENERATION ---
const tracks = [];

// Add sequential tracks 0002.mp3 through 0049.mp3
for (let i = 2; i <= 49; i++) {
    let fileName = i < 10 ? `000${i}.mp3` : `00${i}.mp3`;
    tracks.push(fileName);
}

// Add your specific extra tracks
tracks.push("0001.mp3", "0099.mp3", "0100.mp3");

// Shuffle playlist setup
let playlist = [...tracks];

// --- LCD DISPLAY LOGIC ---
function updateLCD(line3, line4 = "&nbsp;") {
    document.getElementById('status').innerText = line3;
    document.getElementById('input-display').innerHTML = line4;
}

// --- HANDSET LOGIC (STAGE 1 UNLOCK) ---
function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR";
        btn.classList.add('off-hook');
        updateLCD("OFF HOOK", "DIAL NUMBER");
        
        // NOW PULLING FROM /mp3/ SUBFOLDER
        audio.src = baseUrl + "0100.mp3";
        audio.play().catch(e => console.log("Interaction required to start audio."));
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE";
        btn.classList.remove('off-hook');
        updateLCD("ON HOOK", "&nbsp;");
        audio.pause();
        inputString = "";
    }
}

// --- KEYPAD LOGIC ---
function press(key) {
    if (!isOffHook) return;
    
    inputString += key;
    updateLCD("DIALING...", inputString);

    // 00# Directory Logic
    if (inputString === "00#") {
        playShuffle();
        inputString = "";
    } 
    else if (inputString.length >= 4) {
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
    
    // baseUrl already includes /mp3/ now
    audio.src = baseUrl + track;
    audio.play().catch(e => {
        console.error("Playback failed:", e);
        updateLCD("ERROR", "FILE NOT FOUND");
    });
}
