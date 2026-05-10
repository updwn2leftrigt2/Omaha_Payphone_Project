// --- CONFIGURATION ---
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvftBSqVh2B4OsfG6A-Z0NdfAQHSfzjzoU8ERxm5y2zkRm3UZx5N9AThrcLilGLFwfCw/exec";
const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let isReviewing = false;
let recordedBlob = null;
let audioCtx, compressor, gainNode, source;

// DTMF Frequency Map
const dtmfFreqs = { "1": 697, "2": 770, "3": 852, "4": 697, "5": 770, "6": 852, "7": 697, "8": 770, "9": 852, "*": 941, "0": 941, "#": 941 };

function initAudioEngine() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    compressor = audioCtx.createDynamicsCompressor();
    gainNode = audioCtx.createGain(); 
    source = audioCtx.createMediaElementSource(audio);
    source.connect(gainNode); gainNode.connect(compressor); compressor.connect(audioCtx.destination);
    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
}

function playDialTone(digit) {
    if (!audioCtx) initAudioEngine();
    const freq = dtmfFreqs[digit]; if (!freq) return;
    const osc1 = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc1.frequency.value = freq;
    g.gain.setValueAtTime(0, audioCtx.currentTime); g.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc1.connect(g); g.connect(audioCtx.destination);
    osc1.start(); osc1.stop(audioCtx.currentTime + 0.2);
}

// --- VOICEMAIL BEEP ---
function playVoicemailBeep() {
    const beep = audioCtx.createOscillator();
    const beepGain = audioCtx.createGain();
    beep.frequency.setValueAtTime(1000, audioCtx.currentTime);
    beepGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    beepGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    beep.connect(beepGain); beepGain.connect(audioCtx.destination);
    beep.start(); beep.stop(audioCtx.currentTime + 0.5);
}

function triggerRecoil(type = 'heavy') {
    const unit = document.getElementById('main-unit');
    if (unit) { unit.classList.remove('recoil', 'micro-recoil'); void unit.offsetWidth; unit.classList.add(type === 'heavy' ? 'recoil' : 'micro-recoil'); }
}

function startRecording() {
  updateLCD("VOICEMAIL SYSTEM", "WAIT FOR BEEP...", " ");
  setTimeout(() => {
      playVoicemailBeep();
      setTimeout(() => {
          navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            isRecording = true;
            mediaRecorder.ondataavailable = event => { audioChunks.push(event.data); };
            mediaRecorder.onstop = () => {
              recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
              isReviewing = true;
              updateLCD("1:LISTEN  #:SEND", "*:DISCARD", "REVIEW MESSAGE");
            };
            mediaRecorder.start();
            updateLCD("LEAVE MESSAGE", "PRESS # TO FINISH", "● RECORDING");
          }).catch(err => { updateLCD("MIC ERROR", "CHECK PERMISSIONS", " "); });
      }, 600); // Small delay after beep
  }, 1000);
}

function uploadToDrive(blob) {
  updateLCD("UPLOADING...", "PLEASE WAIT", "SENDING...");
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = () => {
    const base64data = reader.result.split(',');
    fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(base64data)
    }).then(() => {
        updateLCD("MESSAGE SENT", "THANK YOU", "COMPLETE");
        setTimeout(() => { if(isOffHook) playTrack(1); }, 2000);
    });
  };
}

let isOffHook = false, isDirectoryOpen = false, isLanguageSelected = false, currentLang = 'en', inputString = "";
let currentTrackNum = 1, directoryIndex = 2, volIndex = 1;
const volLevels = [0.25, 0.50, 0.75, 1.0], baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

// UPDATED UI TO INCLUDE 402# PROMPT
const ui = {
    en: { d: "DIAL ARTIST #", r: "DIAL 5 FOR RANDOM", dr: "402# FOR VOICEMAIL", nav: "4:< 5:RANDOM 6:> *:MENU", dn: "2:^ 8:v #:PLAY *:MENU", inv: "INVALID" },
    es: { d: "MARQUE NUMERO", r: "MARQUE 5 AL AZAR", dr: "402# MENSAJE", nav: "4:< ANT 5:AZAR 6:> SIG", dn: "2:^ 8:v #:TOCAR *:MENU", inv: "INVALIDO" }
};

const directory = { 1: { title: "DIAL TONE", artist: "SYSTEM" }, 2: { title: "Peacocks Patient", artist: "Alina Nguyen" }, 3: { title: "Moon Tune", artist: "Aly Peeler & Friends" }, 4: { title: "Madeleine", artist: "Amelie Raoul" }, 5: { title: "Bottom of the Cup", artist: "Amy Haddad" }, 6: { title: "Drink Your Tea", artist: "Angelica Perez" }, 7: { title: "Whos Gonna Stand Up", artist: "BOLD NE (Neil Young)" }, 8: { title: "Alone.", artist: "Dos Mundos (Colton S.)" }, 9: { title: "The Peace (A Cappella)", artist: "Conny Franko" }, 10: { title: "2+1", artist: "Dead Poets" }, 11: { title: "Childhood", artist: "Dereck Higgins" }, 12: { title: "Tea Now", artist: "Dex Arbor (ft. Flora J)" }, 13: { title: "Ocean Breath", artist: "Dmitrii Shaposhnikov" }, 14: { title: "Love Surrounding", artist: "EDEM SOUL" }, 15: { title: "Son of the Soil", artist: "Gerard Pefung" }, 16: { title: "May Queen", artist: "Hair Person" }, 17: { title: "Duniya", artist: "ID (ilahi & deLorenzo)" }, 18: { title: "Alignment", artist: "Jewel Rodgers & Serholt" }, 19: { title: "A Single Refugee Mom", artist: "Kam Bany" }, 20: { title: "Racecar", artist: "Kevin Paradise" }, 21: { title: "My Father Apologizes", artist: "Kimberly Nguyen" }, 22: { title: "Gbandjo", artist: "Kusher Snazzy" }, 23: { title: "Pidgin", artist: "Lindsey Anne Baker" }, 24: { title: "For You & Presence", artist: "Maritza N. Estrada" }, 25: { title: "Shimmering", artist: "Mesonjixx (Mary L)" }, 26: { title: "Amethyst", artist: "Melina" }, 27: { title: "Here We Are. Still.", artist: "Meredith Ann Fuller" }, 28: { title: "An Act of Naming", artist: "Natasha Kessler" }, 29: { title: "Critic", artist: "Ol Mo (Robin S Kessler)" }, 31: { title: "FOLK SONG 3", artist: "Otis Twelve (ft Dereck)" }, 32: { title: "Snow Song", artist: "Rayni Wekluk" }, 33: { title: "Unconditional Blues", artist: "Renzellous Brown" }, 34: { title: "Edgy Refugee", artist: "Rosine Selemani" }, 35: { title: "Slumber", artist: "Sam Brock" }, 36: { title: "Excerpt: Bright Star", artist: "Sarah Rowe" }, 37: { title: "Folks", artist: "Sgt. Leisure" }, 38: { title: "FU Babies", artist: "Stacey Barelos" }, 39: { title: "To the Broken Few", artist: "Stolen Wolves (Inno)" }, 40: { title: "My Journey", artist: "Sulekha Ali" }, 41: { title: "A la", artist: "Sanchez/Bartolomei/Boyd" }, 42: { title: "THEY BITE", artist: "SWAMPD" }, 44: { title: "Hold On", artist: "The Mynabirds (Laura)" }, 45: { title: "Agnostic Maps", artist: "Todd Robinson" }, 46: { title: "Against Distance", artist: "Trey Moody" }, 47: { title: "All Nighter", artist: "UN-T.I.L." }, 48: { title: "To Word Counts", artist: "Victoria Bogatz" }, 49: { title: "The Ocelot", artist: "Winston F. Schneider" } };

function writeLine(id, text, forceScroll = false) {
    const el = document.getElementById(id); if (id === 'line1' || id === 'line4') { el.innerText = text; return; }
    if (forceScroll || text.length > 20) el.innerHTML = `<div class="scroll-wrap">${text}</div>`;
    else el.innerHTML = `<div>${text}</div>`;
}

function updateLCD(l2, l3, l4) { let f = (currentTrackNum > 1 && !isDirectoryOpen) ? (l2.length > 20 || l3.length > 20) : false; writeLine('line2', l2, f); writeLine('line3', l3, f); writeLine('line4', l4); }

function refreshDisplay() {
    const lang = ui[currentLang];
    if (!isLanguageSelected) updateLCD("1: ENGLISH", "2: ESPANOL", "SELECT LANGUAGE");
    else if (isDirectoryOpen) showDirectoryEntry();
    else if (isReviewing) updateLCD("1:LISTEN  #:SEND", "*:DISCARD", "REVIEW MESSAGE");
    else if (currentTrackNum === 1) updateLCD(lang.d, lang.r, lang.dr);
    else { const t = directory[currentTrackNum]; updateLCD(`${currentTrackNum.toString().padStart(2,'0')} ${t.artist}`, t.title, lang.nav); }
}

function toggleHandset() {
    initAudioEngine();
    isOffHook = !isOffHook;
    clickAudio.src = baseUrl + "0099.mp3";
    clickAudio.play().catch(() => {});
    const f = document.getElementById('handset-flipper');
    if (isOffHook) {
        if(f) f.classList.add('up');
        isLanguageSelected = false; isReviewing = false; playTrack(100);
    } else {
        if (isRecording && mediaRecorder) { mediaRecorder.stop(); isRecording = false; }
        isReviewing = false;
        if(f) f.classList.remove('up');
        triggerRecoil('heavy');
        updateLCD("LIFT RECEIVER", "LEVANTE EL RECEPTOR", " ");
        audio.pause(); audio.src = ""; isDirectoryOpen = false; inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return;
    triggerRecoil('micro');
    playDialTone(key); 
    if (!isLanguageSelected) {
        if (key === '1') { currentLang = 'en'; isLanguageSelected = true; playTrack(1); }
        else if (key === '2') { currentLang = 'es'; isLanguageSelected = true; playTrack(1); }
        return;
    }

    if (isReviewing) {
        if (key === '1') { const url = URL.createObjectURL(recordedBlob); audio.src = url; audio.play(); }
        else if (key === '#') { isReviewing = false; uploadToDrive(recordedBlob); }
        else if (key === '*') { isReviewing = false; recordedBlob = null; playTrack(1); }
        return;
    }

    if (isRecording) {
        if (key === '#') { isRecording = false; mediaRecorder.stop(); }
        return;
    }
    
    if (inputString === "") {
        if (key === '*') { isDirectoryOpen = false; playTrack(1); return; }
        if (key === '5') { playRandom(); return; }
        if (key === '4' && currentTrackNum > 1) { playTrack(currentTrackNum > 2 ? currentTrackNum - 1 : 49); return; }
        if (key === '6' && currentTrackNum > 1) { playTrack(currentTrackNum < 49 ? currentTrackNum + 1 : 2); return; }
    }

    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = (directoryIndex > 2) ? directoryIndex - 1 : 49; showDirectoryEntry(); }
        else if (key === '8') { directoryIndex = (directoryIndex < 49) ? directoryIndex + 1 : 2; showDirectoryEntry(); }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; }
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
    } else {
        inputString += key;
        updateLCD("DIALING...", inputString, "PRESS # TO CALL");
    }
}

function showDirectoryEntry() { const e = directory[directoryIndex]; updateLCD(`${directoryIndex.toString().padStart(2,'0')} ${e.artist}`, e.title, ui[currentLang].dn); }
function playRandom() { let r; do { r = Math.floor(Math.random() * 48) + 2; } while (directory[r] === undefined || r === 30 || r === 43); playTrack(r); }
function playTrack(num) {
    if (num === 30 || num === 43) { updateLCD("COMING SOON", "OMAHA PAYPHONE", " "); return; }
    currentTrackNum = num; audio.pause();
    if (audioCtx) { gainNode.gain.setValueAtTime(num === 5 ? 7.0 : 1.0, audioCtx.currentTime); }
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play().catch(() => {});
    refreshDisplay();
    setTimeout(() => {
        audio.src = baseUrl + num.toString().padStart(4, '0') + ".mp3";
        audio.load();
        audio.play().then(() => { if (num !== 1 && num !== 100) refreshDisplay(); });
    }, 400);
}
function cycleVolume() { triggerRecoil('micro'); volIndex = (volIndex + 1) % volLevels.length; audio.volume = volLevels[volIndex]; clickAudio.volume = volLevels[volIndex]; updateLCD("VOLUME LEVEL", "I".repeat(volIndex + 1), " "); setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500); }
