// 1. Initialize audio without a source first
const audio = new Audio();
audio.crossOrigin = "anonymous"; 

let isOffHook = false;
let inputString = "";
const baseUrl = "https://archive.org";

// --- TRACK LIST ---
const tracks = [];
for (let i = 2; i <= 49; i++) {
    let fileName = i < 10 ? `000${i}.mp3` : `00${i}.mp3`;
    tracks.push(fileName);
}
tracks.push("0001.mp3", "0099.mp3", "0100.mp3");
let playlist = [...tracks];

function updateLCD(line3, line4 = "&nbsp;") {
    document.getElementById('status').innerText = line3;
    document.getElementById('input-display').innerHTML = line4;
}

// 2. Updated toggle function to force "User Activation"
function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR";
        btn.classList.add('off-hook');
        updateLCD("OFF HOOK", "DIAL NUMBER");
        
        // FORCING THE BROWSER TO PLAY
        audio.src = baseUrl + "0001.mp3"; 
        audio.load();
        
        // This MUST be inside the click handler to work
        var playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.then(_ => {
                console.log("Playback started!");
            }).catch(error => {
                console.log("Playback failed: " + error);
                updateLCD("ERROR", "TAP SCREEN & RELIFT");
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

function playShuffle() {
    if (playlist.length === 0) playlist = [...tracks];
    const randomIndex = Math.floor(Math.random() * playlist.length);
    const track = playlist.splice(randomIndex, 1);
    
    updateLCD("PLAYING FROM", "DIRECTORY...");
    audio.src = baseUrl + track;
    audio.play();
}
