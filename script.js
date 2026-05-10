// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvftBSqVh2B4OsfG6A-Z0NdfAQHSfzjzoU8ERxm5y2zkRm3UZx5N9AThrcLilGLFwfCw/exec";
const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let mediaRecorder, audioChunks = [], isRecording = false, isReviewing = false, recordedBlob = null;
let audioCtx, gainNode, isOffHook = false, currentLang = 'en', inputString = "";
let currentTrackNum = 1, directoryIndex = 2, volIndex = 1, isDirectoryOpen = false, isLanguageSelected = false;
const baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

// --- 1. AUDIO INITIALIZATION ---
function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain(); gainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playDialTone(digit) {
    if (isRecording) return; // Never play dial tone while mic is active
    initAudioEngine();
    const freqs = { "1": 697, "2": 770, "3": 852, "4": 697, "5": 770, "6": 852, "7": 697, "8": 770, "9": 852, "*": 941, "0": 941, "#": 941 };
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.frequency.value = freqs[digit] || 697;
    g.gain.setValueAtTime(0.1, audioCtx.currentTime); 
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

// --- 2. KEYPAD LOGIC ---
function press(key) {
    if (!isOffHook) return;
    initAudioEngine();

    // STOP-PRIME LOGIC: Priming the speaker when # is hit to stop recording
    if (isRecording && key === '#') {
        isRecording = false;
        mediaRecorder.stop();
        
        // This is the "Master Reset" touch
        audio.pause();
        audio.src = ""; // Clear source
        audio.load();   // Prime the player
        if (audioCtx.state === 'suspended') audioCtx.resume();
        
        return; 
    }

    if (isReviewing) {
        if (key === '1' && recordedBlob) {
            audio.src = URL.createObjectURL(recordedBlob);
            audio.play(); 
        }
        else if (key === '#') { isReviewing = false; manageKeyFlashes('none'); uploadToDrive(recordedBlob); }
        else if (key === '*') { isReviewing = false; recordedBlob = null; playTrack(1); }
        return;
    }

    if (!isLanguageSelected) {
        if (key === '1') { currentLang = 'en'; isLanguageSelected = true; playTrack(1); }
        else if (key === '2') { currentLang = 'es'; isLanguageSelected = true; playTrack(1); }
        return;
    }

    playDialTone(key);

    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = (directoryIndex > 2) ? (directoryIndex-1 === 30 || directoryIndex-1 === 43 ? directoryIndex-2 : directoryIndex-1) : 49; refreshDisplay(); }
        else if (key === '8') { directoryIndex = (directoryIndex < 49) ? (directoryIndex+1 === 30 || directoryIndex+1 === 43 ? directoryIndex+2 : directoryIndex+1) : 2; refreshDisplay(); }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; }
        else if (key === '*') { isDirectoryOpen = false; playTrack(1); }
        return;
    }

    if (key === '#') {
        if (inputString === "402") { audio.pause(); audio.src = ""; startRecording(); }
        else if (inputString === "00") { isDirectoryOpen = true; directoryIndex = 2; refreshDisplay(); }
        else { const d = parseInt(inputString); if (directory[d]) playTrack(d); }
        inputString = "";
    } else {
        inputString += key;
        updateLCD("DIALING", inputString, "PRESS # CALL", " ");
    }
}

// --- 3. VOICEMAIL SYSTEM ---
function startRecording() {
    // Immediate silence for recording
    audio.pause();
    audio.src = "";
    
    updateLCD("VOICEMAIL", "WAIT BEEP", "ESPERE TONO", " ");
    setTimeout(() => {
        const beep = audioCtx.createOscillator(); beep.frequency.value = 1000; beep.connect(audioCtx.destination); beep.start(); beep.stop(audioCtx.currentTime + 0.3);
        
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            isRecording = true;
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
                recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
                isReviewing = true;
                refreshDisplay();
                manageKeyFlashes('review');
            };
            mediaRecorder.start();
            manageKeyFlashes('recording');
            updateLCD("RECORDING", "● SPEAK NOW", "POUND STOP", "MARQUE #");
        });
    }, 1000);
}

// --- 4. HELPERS ---
function updateLCD(l1, l2, l3, l4) {
    document.getElementById('line1').innerText = l1 || " ";
    document.getElementById('line2').innerText = l2 || " ";
    document.getElementById('line3').innerText = l3 || " ";
    document.getElementById('line4').innerText = l4 || " ";
}

function refreshDisplay() {
    if (!isOffHook) updateLCD(" ", "LIFT RECEIVER", "LEVANTE EL RECEPTOR", " ");
    else if (!isLanguageSelected) updateLCD("LANGUAGE", "1: ENGLISH", "2: ESPANOL", " ");
    else if (isReviewing) updateLCD("REVIEW", "1: LISTEN", "#: SEND", "*: DISCARD");
    else if (isDirectoryOpen) updateLCD("DIRECTORY", "#" + directoryIndex, "2:^ 8:v", "#: PLAY");
    else updateLCD("DIAL ARTIST", "00: DIRECTORY", "402: MESSAGE", "5: RANDOM");
}

function toggleHandset() {
    initAudioEngine(); isOffHook = !isOffHook;
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play().catch(() => {});
    const f = document.getElementById('handset-flipper');
    if (isOffHook) { f.classList.add('up'); isLanguageSelected = false; isReviewing = false; playTrack(100); }
    else { if (isRecording && mediaRecorder) mediaRecorder.stop(); f.classList.remove('up'); audio.pause(); audio.src = ""; isDirectoryOpen = false; inputString = ""; refreshDisplay(); manageKeyFlashes('none'); }
}

function playTrack(num) {
    currentTrackNum = num; audio.pause();
    refreshDisplay();
    setTimeout(() => { audio.src = baseUrl + num.toString().padStart(4, '0') + ".mp3"; audio.play(); }, 400);
}

function manageKeyFlashes(type) {
    ['btn-1', 'btn-ast', 'btn-pnd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('pulse-blue', 'flash-red');
    });
    if (type === 'recording') document.getElementById('btn-pnd').classList.add('flash-red');
    if (type === 'review') ['btn-1', 'btn-ast', 'btn-pnd'].forEach(id => document.getElementById(id).classList.add('pulse-blue'));
}

const directory = { 1: { title: "DIAL TONE", artist: "SYSTEM" }, 2: { title: "Peacocks Patient", artist: "Alina Nguyen" }, 3: { title: "Moon Tune", artist: "Aly Peeler & Friends" }, 5: { title: "Bottom of the Cup", artist: "Amy Haddad" } }; // (etc...)

refreshDisplay();
