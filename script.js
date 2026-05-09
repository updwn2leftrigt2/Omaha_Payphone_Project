// --- CONFIGURATION ---
const audio = new Audio();
audio.crossOrigin = "anonymous"; // Essential for Archive.org CORS

let isOffHook = false;
let inputString = "";
// This base URL points to your specific /mp3/ subfolder
const baseUrl = "https://archive.org";

// --- TRACK LIST GENERATION ---
const tracks = [];

// 1. Add sequential tracks 0002.mp3 through 0049.mp3
for (let i = 2; i <= 49; i++) {
    // Adds "000" for numbers 2-9, and "00" for 10-49 to match your filenames
    let fileName = i < 10 ? `000${i}.mp3` : `00${i}.mp3`;
    tracks.push(fileName);
}

// 2. Add your specific out-of-sequence tracks
tracks.push("0001.mp3", "0099.mp3", "0100.mp3");

// 3. Create a working copy for the non-repeating shuffle
let playlist = [...tracks];

// --- LCD DISPLAY LOGIC ---
function updateLCD(line3, line4 = "&nbsp;") {
    document.getElementById('status').innerText = line3;
    document.getElementById('input-display').innerHTML = line4;
}

// --- HANDSET LOGIC (LIFT/HANG UP) ---
function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR";
        btn.classList.add('off-hook');
        updateLCD("OFF HOOK", "DIAL NUMBER");
        
        // Use 0001.mp3 as the initial Dial Tone
        audio.src = baseUrl + "0001.mp3";
        audio.load();
        audio.play().catch(e => {
            console.log("Audio Init Wait...");
            updateLCD("ERROR", "CLICK AGAIN");
        });
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

    // If they dial 00#, trigger the random directory playback
    if (inputString === "00#") {
        playShuffle();
        inputString = "";
    } 
    // Reset display if they type 4 or more digits without a command
    else if (inputString.length >= 4) {
        setTimeout(() => { 
            inputString = ""; 
            updateLCD("OFF HOOK", "DIAL NUMBER"); 
        }, 1500);
    }
}

// --- SHUFFLE PLAYBACK LOGIC ---
function playShuffle() {
    // If we have played all songs, refill the playlist
    if (playlist.length === 0) playlist = [...tracks];
    
    // Pick a random index and remove it from the playlist (non-repeating)
    const randomIndex = Math.floor(Math.random() * playlist.length);
    const track = playlist.splice(randomIndex, 1);
    
    updateLCD("PLAYING FROM", "DIRECTORY...");
    
    // Play the chosen track from the /mp3/ subfolder
    audio.src = baseUrl + track;
    audio.play().catch(e => {
        console.error("Playback failed. Verify filename on Archive.org:", e);
        updateLCD("ERROR", "FILE NOT FOUND");
    });
}
