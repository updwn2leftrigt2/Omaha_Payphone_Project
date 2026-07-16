// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://google.com";

const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let mediaRecorder, audioChunks = [], isRecording = false, isReviewing = false, recordedBlob = null;
let audioCtx, compressor, gainNode, source, cmdTimer = null;

const dtmfFreqs = { "1": 697, "2": 770, "3": 852, "4": 697, "5": 770, "6": 852, "7": 697, "8": 770, "9": 852, "*": 941, "0": 941, "#": 941 };

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

function playDialTone(digit) {
    initAudioEngine();
    const freq = dtmfFreqs[digit]; if (!freq) return;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

function playVolumeChirp(level) {
    initAudioEngine();
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.05);
    const chirpVol = 0.05 * (level + 1);
    g.gain.setValueAtTime(chirpVol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
}

function playVoicemailBeep() {
    const beep = audioCtx.createOscillator(), g = audioCtx.createGain();
    beep.frequency.setValueAtTime(1000, audioCtx.currentTime);
    g.gain.setValueAtTime(0.1, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    beep.connect(g); g.connect(audioCtx.destination);
    beep.start(); beep.stop(audioCtx.currentTime + 0.5);
}

function triggerRecoil(type = 'heavy') {
    const unit = document.getElementById('main-unit');
    if (unit) {
        unit.classList.remove('recoil', 'micro-recoil');
        void unit.offsetWidth;
        unit.classList.add(type === 'heavy' ? 'recoil' : 'micro-recoil');
    }
}

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

function uploadToDrive(blob) {
    updateLCD("UPLOADING...", "PLEASE WAIT", "SENDING...");
    const reader = new FileReader(); reader.readAsDataURL(blob);
    reader.onloadend = () => {
        fetch(GOOGLE_SCRIPT_URL, { 
            method: "POST", mode: "no-cors", 
            headers: { "Content-Type": "application/x-www-form-urlencoded" }, 
            body: "data=" + encodeURIComponent(reader.result) 
        })
        .then(() => { 
            updateLCD("MESSAGE SENT", "THANK YOU", "COMPLETE"); 
            setTimeout(() => { if(isOffHook) playTrack(1); }, 2000); 
        });
    };
}

let isOffHook = false, isDirectoryOpen = false, isLanguageSelected = false, currentLang = 'en', inputString = "";
let currentTrackNum = 1, directoryIndex = 1, volIndex = 1;
const volLevels = [0.25, 0.50, 0.75, 1.0];

// --- REMOVED /mp3/ EXTENSION SUBFOLDER FROM STREAMING URI PATH ---
const baseUrl = "https://archive.org";


const ui = {
    en: { d: "DIAL ARTIST #", r: "DIAL 5 FOR RANDOM", dual: "DIR:00# | MSJ:402#", nav: "4:< 5:RANDOM 6:> *:MENU", dn: "2:^ 8:v #:PLAY *:MENU", inv: "INVALID" },
    es: { d: "MARQUE NUMERO", r: "MARQUE 5 AL AZAR", dual: "DIR:00# | MSJ:402#", nav: "4:< ANT 5:AZAR 6:> SIG", dn: "2:^ 8:v #:TOCAR *:MENU", inv: "INVALIDO" }
};
// --- COMPREHENSIVE DIRECTORY DATA LAYER ---
const directory = { 
    1: { title: "DIAL TONE", artist: "SYSTEM", file: "0001" }, 
    2: { title: "Peacocks Were Patient...", artist: "Alina Nguyễn", file: "0002" }, 
    3: { title: "Moon Tune", artist: "Aly Peeler & Friends", file: "0003" }, 
    4: { title: "Madeleine", artist: "Amélie Raoul", file: "0004" }, 
    5: { title: "Bottom of the Cup", artist: "Amy Haddad", file: "0005" }, 
    6: { title: "Drink Your Tea", artist: "Angelica Perez", file: "0006" }, 
    7: { title: "Who's Gonna Stand Up (Live)", artist: "BOLD NE (Neil Young)", file: "0007" }, 
    8: { title: "Alone.", artist: "Colton Schlines", file: "0008" }, 
    9: { title: "The Peace (A Cappella)", artist: "Conny Franko", file: "0009" }, 
    10: { title: "2+1", artist: "Dead Poets", file: "0010" }, 
    11: { title: "Childhood", artist: "Dereck Higgins", file: "011" }, // SERVER FIX: Maps directly to drop-zero folder entry 
    12: { title: "Tea Now", artist: "Dex Arbor (ft. Flora J Griffith)", file: "0012" }, 
    13: { title: "Ocean Breath", artist: "Dmitrii Shaposhnikov", file: "0013" }, 
    14: { title: "Løve Surrøunding", artist: "ÈDÈM SOUL", file: "0014" }, 
    15: { title: "Son of the Soil", artist: "Gerard Pefung", file: "0015" }, 
    16: { title: "May Queen", artist: "Hair Person", file: "0016" }, 
    17: { title: "FOLK SONG #3", artist: "Higgins/Twelve", file: "0017" }, 
    18: { title: "Duniya", artist: "ID (Ilahi & DeLorenzo)", file: "0018" }, 
    19: { title: "In Comes the Light", artist: "Jenelle Betterman", file: "0019" }, 
    20: { title: "Alignment", artist: "Jewel Rodgers & Fredrik Serholt", file: "0020" }, 
    21: { title: "A Single Refugee Mom", artist: "Kam Bany", file: "0021" }, 
    22: { title: "My Father Apologizes", artist: "Kimberly Nguyễn", file: "0022" }, 
    23: { title: "Gbandjo", artist: "Kusher Snazzy", file: "0023" }, 
    24: { title: "Pidgin", artist: "Lindsey Anne Baker", file: "0024" }, 
    25: { title: "For You & For Presence", artist: "Maritza N. Estrada", file: "0025" },
    26: { title: "Shimmering", artist: "Mary Lawson", file: "0026" }, 
    27: { title: "Amethyst", artist: "Melina", file: "0027" }, 
    28: { title: "Here We Are. All Is Still.", artist: "Meredith Ann Fuller", file: "0028" }, 
    29: { title: "An Act of Naming", artist: "Natasha Kessler", file: "0029" }, 
    30: { title: "Critic", artist: "Ol' Mo & Varmints", file: "0030" }, 
    31: { title: "A la", artist: "PSS (Pearl, Steve, Susan)", file: "0031" }, 
    32: { title: "“Snow Song”", artist: "Rayni Wekluk", file: "0032" }, 
    33: { title: "GLOW", artist: "Renca Dunn", file: "0033" }, 
    34: { title: "Unconditional Blues", artist: "Renzellous Brown", file: "0034" }, 
    35: { title: "Edgy Refugee", artist: "Rosine Selemani", file: "0035" }, 
    36: { title: "Excerpt: Bright Star", artist: "Sarah Rowe", file: "0036" }, 
    37: { title: "Folks", artist: "Sgt. Leisure", file: "0037" }, 
    38: { title: "Leaving the Brand Inspection Area", artist: "Spencer Wedberg", file: "0038" }, 
    39: { title: "The Debt", artist: "Spencer Wedberg" , file: "0039" }, 
    40: { title: "FU Babies", artist: "Stacey Barelos", file: "0040" }, 
    41: { title: "To the Broken Few", artist: "Stolen Wolves", file: "0041" }, 
    42: { title: "7.12.26", artist: "Tessa V. Wedberg", file: "0042" }, 
    43: { title: "Hold On", artist: "The Mynabirds", file: "0043" }, 
    44: { title: "An Agnostic Maps Gods Own Country", artist: "Todd Robinson" , file: "0044" }, 
    45: { title: "Against Distance", artist: "Trey Moody", file: "0045" }, 
    46: { title: "All Nighter", artist: "UN-T.I.L.", file: "0046" }, 
    47: { title: "To Word Counts", artist: "Victoria Bogatz", file: "0047" }, 
    48: { title: "The Ocelot", artist: "Winston F. Schneider", file: "0048" },
    49: { title: "SYSTEM GREETER", artist: "SYSTEM", file: "0049" },
    100: { title: "WELCOME GREETING", artist: "SYSTEM", file: "0100" }, 
    101: { title: "ENGLISH INSTRUCTIONS", artist: "SYSTEM", file: "0101" },
    102: { title: "INSTRUCCIONES", artist: "SYSTEM" , file: "0102" }
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
    initAudioEngine(); isOffHook = !isOffHook;
    const unit = document.getElementById('main-unit');
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.load(); clickAudio.play().catch(() => {});
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
        let filename = (trackData && trackData.file) ? trackData.file : num.toString().padStart(4, '0');
        
        if (!filename.endsWith(".mp3")) {
            filename += ".mp3";
        }
        
        audio.src = baseUrl + filename; 
        audio.load(); 
        audio.play().then(() => { if (num !== 1 && num !== 100 && num !== 101 && num !== 102) refreshDisplay(); }).catch(e => console.log("Stream block caught:", e)); 
    }, 400); 
}

function cycleVolume() { triggerRecoil('micro'); volIndex = (volIndex + 1) % volLevels.length; audio.volume = volLevels[volIndex]; playVolumeChirp(volIndex); updateLCD("VOLUME LEVEL", "I".repeat(volIndex + 1), " "); setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500); }
