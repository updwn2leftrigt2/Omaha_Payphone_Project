const audio = new Audio();
audio.crossOrigin = "anonymous"; // CRITICAL: Fixes CORS errors

let isOffHook = false;
let inputString = "";
const baseUrl = "https://archive.org";

// List your mp3 filenames exactly as they appear in the /mp3/ subfolder
const tracks = ["0101.mp3", "0102.mp3", "0103.mp3"]; 
let playlist = [...tracks];

function updateLCD(line3, line4 = "&nbsp;") {
    document.getElementById('status').innerText = line3;
    document.getElementById('input-display').innerHTML = line4;
}

function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR";
        btn.classList.add('off-hook');
        updateLCD("OFF HOOK", "DIAL NUMBER");
        // Audio Unlock: Play dial tone (root folder)
        audio.src = baseUrl + "0100.mp3";
        audio.play().catch(e => console.log("Waiting for user interaction..."));
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE";
        btn.classList.remove('off-hook');
        updateLCD("ON HOOK", "&nbsp;");
        audio.pause();
        inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return;
    
    inputString += key;
    updateLCD("DIALING...", inputString);

    if (inputString === "00#") {
        playShuffle();
        inputString = "";
    } else if (inputString.length >= 3) {
        setTimeout(() => { 
            inputString = ""; 
            updateLCD("OFF HOOK", "DIAL NUMBER"); 
        }, 2000);
    }
}

function playShuffle() {
    if (playlist.length === 0) playlist = [...tracks];
    
    const randomIndex = Math.floor(Math.random() * playlist.length);
    const track = playlist.splice(randomIndex, 1);
    
    updateLCD("PLAYING FROM", "DIRECTORY...");
    // Directing to the /mp3/ subfolder on Archive.org
    audio.src = `${baseUrl}mp3/${track}`;
    audio.play();
}
