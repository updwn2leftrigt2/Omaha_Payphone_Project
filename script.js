const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let isOffHook = false;
let isDirectoryOpen = false;
let inputString = "";
let currentTrackNum = 1;
let directoryIndex = 2; // Starts at first artist (Alina Nguyen)
const baseUrl = "https://archive.org";

// The full 1-49 directory stays the same as previous...
const directory = { /* ... keep your full directory object here ... */ };

function updateLCD(l1, l2, l3, l4) {
    document.getElementById('line1').innerText = l1;
    document.getElementById('line2').innerText = l2;
    document.getElementById('line3').innerText = l3;
    document.getElementById('line4').innerHTML = l4 || "&nbsp;";
}

function toggleHandset() {
    isOffHook = !isOffHook;
    const btn = document.getElementById('handset-toggle');
    if (isOffHook) {
        btn.innerText = "HANG UP / COLGAR"; btn.classList.add('off-hook');
        isDirectoryOpen = false;
        playTrack(1); // Dial Tone
    } else {
        btn.innerText = "LIFT HANDSET / LEVANTE"; btn.classList.remove('off-hook');
        updateLCD("LIFT HANDSET /", "LEVANTE", "ON HOOK", "&nbsp;");
        audio.pause(); audio.removeAttribute('src'); audio.load();
        isDirectoryOpen = false; inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return;

    // --- Directory Navigation Mode ---
    if (isDirectoryOpen) {
        if (key === '2') { // Scroll Up
            directoryIndex = directoryIndex > 2 ? directoryIndex - 1 : 49;
            if (directoryIndex === 30 || directoryIndex === 43) directoryIndex--; 
            showDirectoryEntry();
        } else if (key === '8') { // Scroll Down
            directoryIndex = directoryIndex < 49 ? directoryIndex + 1 : 2;
            if (directoryIndex === 30 || directoryIndex === 43) directoryIndex++;
            showDirectoryEntry();
        } else if (key === '#') { // Select Artist
            playTrack(directoryIndex);
            isDirectoryOpen = false;
        } else if (key === '*') { // Exit Directory
            isDirectoryOpen = false;
            updateLCD("OFF HOOK", "DIAL NUMBER", "---", "");
        }
        return;
    }

    // --- Standard Mode Controls ---
    if (key === '5') { // Random
        playRandom();
    } else if (key === '4') { // Previous
        let prev = currentTrackNum > 2 ? currentTrackNum - 1 : 49;
        playTrack(prev);
    } else if (key === '6') { // Next
        let next = currentTrackNum < 49 ? currentTrackNum + 1 : 2;
        playTrack(next);
    } else {
        // Build dialing string for 00#
        inputString += key;
        updateLCD("DIALING...", inputString, "---", "");
        if (inputString === "00#") {
            openDirectory();
            inputString = "";
        } else if (inputString.length >= 4) {
            inputString = ""; 
        }
    }
}

function openDirectory() {
    isDirectoryOpen = true;
    directoryIndex = 2; 
    showDirectoryEntry();
}

function showDirectoryEntry() {
    const entry = directory[directoryIndex];
    updateLCD("DIRECTORY:", entry.artist, "PRESS # TO PLAY", "2^ UP / 8v DOWN");
}

function playRandom() {
    let rand; 
    do { rand = Math.floor(Math.random() * 48) + 2; } 
    while (rand === 30 || rand === 43);
    playTrack(rand);
}

function playTrack(num) {
    if (num === 30 || num === 43) {
        updateLCD("STAY TUNED", "TRACK COMING SOON", "---", ""); return;
    }
    const track = directory[num];
    if (!track) return;
    
    currentTrackNum = num;
    audio.pause(); audio.removeAttribute('src'); audio.load();
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play();

    setTimeout(() => {
        let file = num.toString().padStart(4, '0') + ".mp3";
        audio.src = baseUrl + file;
        audio.load();
        audio.oncanplay = () => {
            audio.play().then(() => {
                updateLCD(track.title, "BY: " + track.artist, "4< PREV | 6> NEXT", "5: SHUFFLE");
                audio.oncanplay = null;
            });
        };
    }, 400);
}
