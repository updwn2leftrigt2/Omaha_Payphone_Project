// --- CONFIGURATION ---
// IMPORTANT: Update this URL with your unique Google Apps Script link if needed
const GOOGLE_SCRIPT_URL = "https://google.com";

const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let mediaRecorder, audioChunks = [], isRecording = false, isReviewing = false, recordedBlob = null;
let audioCtx, compressor, gainNode, source, cmdTimer = null;

// DTMF Frequency Map for Dialing Tones
const dtmfFreqs = { "1": 697, "2": 770, "3": 852, "4": 697, "5": 770, "6": 852, "7": 697, "8": 770, "9": 852, "*": 941, "0": 941, "#": 941 };

// --- 1. MOBILE AUDIO ENGINE WAKE-UP ---
function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        compressor = audioCtx.createDynamicsCompressor();
        gainNode = audioCtx.createGain();
        source = audioCtx.createMediaElementSource(audio);
        source.connect(gainNode); 
        gainNode.connect(compressor);
        compressor.connect(audioCtx.destination);
        compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    audio.play().catch(() => {});
    clickAudio.play().catch(() => {});
}

// ... [Truncated tone generators for brevity] ...

// --- 4. RECORDING & VOICEMAIL LOGIC ---
function startRecording() {
    updateLCD("VOICEMAIL SYSTEM", "WAIT FOR BEEP...", " ");
    setTimeout(() => {
        playVoicemailBeep();
        setTimeout(() => {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
                const supportedType = types.find(t => MediaRecorder.isTypeSupported(t));
                
                mediaRecorder = new MediaRecorder(stream, { mimeType: supportedType }); 
                audioChunks = []; 
                isRecording = true;

                const hashKey = document.getElementById('key-hash');
                if(hashKey) hashKey.classList.add('recording-active');

                mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    if(hashKey) hashKey.classList.remove('recording-active');
                    recordedBlob = new Blob(audioChunks, { type: supportedType }); 
                    isReviewing = true;
                    updateLCD("1:LISTEN #:SEND", "*:DISCARD", "REVIEW MESSAGE");
                };
                mediaRecorder.start();
                updateLCD("How do you envision Omaha in the next 5 years?", "RED KEY TO STOP", "● RECORDING");
            }).catch(() => { updateLCD("MIC ERROR", "CHECK PERMISSIONS", " "); });
        }, 600);
    }, 1000);
}

// ... [Truncated upload function] ...

// --- 5. STATE MANAGEMENT & STREAM URL ---
let isOffHook = false, isDirectoryOpen = false, isLanguageSelected = false, currentLang = 'en', inputString = "";
let currentTrackNum = 1, directoryIndex = 1, volIndex = 1;
const volLevels = [0.25, 0.50, 0.75, 1.0];

// Secure Streaming Route Link
const baseUrl = "https://archive.org";

const ui = {
    en: { d: "DIAL ARTIST #", r: "DIAL 5 FOR RANDOM", dual: "DIR:00# | MSJ:402#", nav: "4:< 5:RANDOM 6:> *:MENU", dn: "2:^ 8:v #:PLAY *:MENU", inv: "INVALID" },
    es: { d: "MARQUE NUMERO", r: "MARQUE 5 AL AZAR", dual: "DIR:00# | MSJ:402#", nav: "4:< ANT 5:AZAR 6:> SIG", dn: "2:^ 8:v #:TOCAR *:MENU", inv: "INVALIDO" }
};

// --- SYNCHRONIZED ARCHIVE MAP CONFIGURED WITH EXACT LIVE FILENAMES ---
const directory = { 
    1: { title: "DIAL TONE", artist: "SYSTEM", file: "0001" }, 
    2: { title: "Peacocks Were Patient...", artist: "Alina Nguyễn", file: "Peacocks Were Patient Enough to Paint on Their Feathers" }, 
    // ... [List truncated to avoid repetition] ...
    102: { title: "INSTRUCCIONES", artist: "SYSTEM", file: "0102" }
};

// --- 6. DISPLAY ENGINE ---
function writeLine(id, text, forceScroll = false) {
    const el = document.getElementById(id); if (!el) return;
    if (id === 'line1' || id === 'line4') { el.innerText = text; return; }
    if (forceScroll || text.length > 20) el.innerHTML = `<div class="scroll-wrap">${text}</div>`;
    else el.innerHTML = `<div>${text}</div>`;
}

function updateLCD(l2, l3, l4) { 
    let f = (currentTrackNum > 1 && currentTrackNum < 100 && !isDirectoryOpen) ? (l2.length > 20 || l3.length > 20) : false; 
    writeLine('line2', l2, f); writeLine('line3', l3, f); writeLine('line4', l4); 
}

function refreshDisplay() {
    const lang = ui[currentLang];
    if (!isLanguageSelected) updateLCD("1: ENGLISH", "2: ESPANOL", "SELECT LANGUAGE");
    else if (isDirectoryOpen) showDirectoryEntry();
    else if (isReviewing) updateLCD("1:LISTEN #:SEND", "*:DISCARD", "REVIEW MESSAGE");
    else if ((currentTrackNum === 1 || currentTrackNum > 100) && inputString === "") updateLCD(lang.d, lang.r, lang.dual);
    else if (currentTrackNum > 1 && currentTrackNum < 100 && inputString === "") { 
        const t = directory[currentTrackNum];
        updateLCD(`${currentTrackNum.toString().padStart(2,'0')} ${t.artist}`, t.title, lang.nav); 
    }
}

function toggleHandset() {
    initAudioEngine(); 
    isOffHook = !isOffHook;
    const unit = document.getElementById('main-unit');
    
    clickAudio.src = baseUrl + "0099.mp3"; 
    clickAudio.load();
    clickAudio.play().catch(() => {});
    
    const f = document.getElementById('handset-flipper');
    if (isOffHook) {
        if(f) f.classList.add('up');
        if(unit) unit.classList.add('handset-up'); 
        isLanguageSelected = false; isReviewing = false; 
        
        setTimeout(() => { playTrack(100); }, 100);
    } else {
        if (isRecording && mediaRecorder) { mediaRecorder.stop(); isRecording = false; document.getElementById('key-hash').classList.remove('recording-active'); }
        if (cmdTimer) { clearTimeout(cmdTimer); cmdTimer = null; }
        isReviewing = false; if(f) f.classList.remove('up'); 
        if(unit) unit.classList.remove('handset-up'); 
        triggerRecoil('heavy'); updateLCD("LIFT RECEIVER", "LEVANTE EL RECEPTOR", " ");
        audio.pause(); audio.src = ""; isDirectoryOpen = false; inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return; triggerRecoil('micro'); playDialTone(key);
    if (!isLanguageSelected) {
        if (key === '1') { currentLang = 'en'; isLanguageSelected = true; playTrack(101); }
        else if (key === '2') { currentLang = 'es'; isLanguageSelected = true; playTrack(102); }
        return;
    }
    if (isReviewing) {
        initAudioEngine(); if (key === '1') { audio.pause(); audio.src = URL.createObjectURL(recordedBlob); audio.load(); audio.play().catch(() => {}); updateLCD("1:LISTEN #:SEND", "*:DISCARD", "● PLAYING..."); }
        else if (key === '#') { isReviewing = false; uploadToDrive(recordedBlob); }
        else if (key === '*') { isReviewing = false; recordedBlob = null; playTrack(1); }
        return;
    }
    if (isRecording) { if (key === '#') { isRecording = false; mediaRecorder.stop(); } return; }
    if (cmdTimer) { clearTimeout(cmdTimer); cmdTimer = null; }
    
    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = (directoryIndex > 2) ? directoryIndex - 1 : 49; showDirectoryEntry(); }
        else if (key === '8') { directoryIndex = (directoryIndex < 49) ? directoryIndex + 1 : 2; showDirectoryEntry(); }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; }
        else if (key === '*') { isDirectoryOpen = false; playTrack(1); }
        return;
    }
    if (key === '#') { 
        if (inputString === "402") { audio.pause(); startRecording(); } 
        else if (inputString === "00") { isDirectoryOpen = true; directoryIndex = 2; showDirectoryEntry(); } 
        else { 
            const d = parseInt(inputString); 
            if (directory[d]) playTrack(d); 
            else { updateLCD(ui[currentLang].inv, inputString, " "); setTimeout(refreshDisplay, 1500); } 
        } 
        inputString = ""; 
    } 
    else if (key === '*') { inputString = ""; playTrack(1); } 
    else { 
        inputString += key; updateLCD("DIALING...", inputString, "PRESS # TO CALL"); 
        if (inputString.length === 1 && (key === '4' || key === '5' || key === '6')) { 
            cmdTimer = setTimeout(() => { if (inputString === key) { if (key === '5') playRandom(); else if (key === '4') playTrack(currentTrackNum > 2 && currentTrackNum < 100 ? currentTrackNum - 1 : 49); else if (key === '6') playTrack(currentTrackNum < 49 ? currentTrackNum + 1 : 2); inputString = ""; } }, 1000); 
        } 
    }
}

function showDirectoryEntry() { const e = directory[directoryIndex]; updateLCD(`${directoryIndex.toString().padStart(2,'0')} ${e.artist}`, e.title, ui[currentLang].dn); }

function playRandom() { 
    let r; 
    do { r = Math.floor(Math.random() * 48) + 2; } while (directory[r] === undefined); 
    playTrack(r); 
}

function playTrack(num) {
    currentTrackNum = num; audio.pause(); if (audioCtx) gainNode.gain.setValueAtTime(num === 5 ? 7.0 : 1.0, audioCtx.currentTime); clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play().catch(() => {}); refreshDisplay(); setTimeout(() => { 
        const trackData = directory[num];
        const filename = (trackData && trackData.file) ? trackData.file : num.toString().padStart(4, '0');
        
        audio.src = baseUrl + filename + ".mp3"; 
        audio.load(); 
        audio.play().then(() => { if (num !== 1 && num !== 100 && num !== 101 && num !== 102) refreshDisplay(); }).catch(e => console.log("Stream block caught:", e)); 
    }, 400); 
}

function cycleVolume() { triggerRecoil('micro'); volIndex = (volIndex + 1) % volLevels.length; audio.volume = volLevels[volIndex]; playVolumeChirp(volIndex); updateLCD("VOLUME LEVEL", "I".repeat(volIndex + 1), " "); setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500); }
