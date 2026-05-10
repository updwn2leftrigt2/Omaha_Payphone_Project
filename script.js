const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvftBSqVh2B4OsfG6A-Z0NdfAQHSfzjzoU8ERxm5y2zkRm3UZx5N9AThrcLilGLFwfCw/exec";
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
        source.connect(gainNode); gainNode.connect(compressor); compressor.connect(audioCtx.destination);
        compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
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
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
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

function triggerRecoil() {
    const unit = document.getElementById('main-unit');
    if (unit) { unit.classList.remove('recoil'); void unit.offsetWidth; unit.classList.add('recoil'); }
}

function startRecording() {
  updateLCD("VOICEMAIL", "WAIT BEEP", " ");
  setTimeout(() => {
      playVoicemailBeep();
      setTimeout(() => {
          navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); audioChunks = []; isRecording = true;
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => {
              recordedBlob = new Blob(audioChunks, { type: 'audio/webm' }); isReviewing = true;
              updateLCD("1:LISTEN", "#:SEND", "REVIEW");
            };
            mediaRecorder.start(); 
            updateLCD("RECORDING", "POUND STOP", "● REC");
          }).catch(() => { updateLCD("MIC ERROR", "RETRY", " "); });
      }, 600);
  }, 1000);
}

function uploadToDrive(blob) {
  updateLCD("SENDING", "PLEASE WAIT", " ");
  const reader = new FileReader(); reader.readAsDataURL(blob);
  reader.onloadend = () => {
    fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(reader.result.split(',')) })
    .then(() => { updateLCD("SENT", "THANK YOU", " "); setTimeout(() => { if(isOffHook) playTrack(1); }, 2000); });
  };
}

let isOffHook = false, isDirectoryOpen = false, isLanguageSelected = false, currentLang = 'en', inputString = "";
let currentTrackNum = 1, directoryIndex = 2, volIndex = 1;
const volLevels = [0.25, 0.50, 0.75, 1.0], baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

const ui = {
    en: { d: "DIAL #", r: "5:RANDOM", dual: "00# | 402#", nav: "4:< 5:R 6:>", dn: "2:^ 8:v #:GO", inv: "INVALID" },
    es: { d: "MARQUE #", r: "5:AZAR", dual: "00# | 402#", nav: "4:< 5:A 6:>", dn: "2:^ 8:v #:SI", inv: "ERROR" }
};

const directory = { 1: { title: "DIAL TONE", artist: "SYSTEM" }, 2: { title: "Peacocks", artist: "Alina Nguyen" }, 3: { title: "Moon Tune", artist: "Aly Peeler" }, 4: { title: "Madeleine", artist: "Amelie Raoul" }, 5: { title: "Cup Bottom", artist: "Amy Haddad" }, 6: { title: "Drink Tea", artist: "Angelica P" }, 7: { title: "Stand Up", artist: "BOLD NE" }, 8: { title: "Alone.", artist: "Dos Mundos" }, 9: { title: "The Peace", artist: "Conny Franko" }, 10: { title: "2+1", artist: "Dead Poets" }, 11: { title: "Childhood", artist: "Dereck H" }, 12: { title: "Tea Now", artist: "Dex Arbor" }, 13: { title: "Ocean", artist: "D Shaposh" }, 14: { title: "Surround", artist: "EDEM SOUL" }, 15: { title: "Soil Son", artist: "Gerard P" }, 16: { title: "May Queen", artist: "Hair Person" }, 17: { title: "Duniya", artist: "ID" }, 18: { title: "Alignment", artist: "Jewel R" }, 19: { title: "Refugee", artist: "Kam Bany" }, 20: { title: "Racecar", artist: "K Paradise" }, 21: { title: "My Father", artist: "Kimberly N" }, 22: { title: "Gbandjo", artist: "Kusher S" }, 23: { title: "Pidgin", artist: "Lindsey B" }, 24: { title: "For You", artist: "Maritza E" }, 25: { title: "Shimmer", artist: "Mesonjixx" }, 26: { title: "Amethyst", artist: "Melina" }, 27: { title: "Still Here", artist: "Meredith F" }, 28: { title: "Naming", artist: "Natasha K" }, 29: { title: "Critic", artist: "Ol Mo" }, 31: { title: "FOLK SONG", artist: "Otis Twelve" }, 32: { title: "Snow Song", artist: "Rayni W" }, 33: { title: "Blues", artist: "Renzellous" }, 34: { title: "Refugee", artist: "Rosine S" }, 35: { title: "Slumber", artist: "Sam Brock" }, 36: { title: "Bright Star", artist: "Sarah Rowe" }, 37: { title: "Folks", artist: "Sgt Leisure" }, 38: { title: "FU Babies", artist: "Stacey B" }, 39: { title: "Broken Few", artist: "Stolen W" }, 40: { title: "Journey", artist: "Sulekha Ali" }, 41: { title: "A la", artist: "Sanchez/B" }, 42: { title: "BITE", artist: "SWAMPD" }, 44: { title: "Hold On", artist: "Mynabirds" }, 45: { title: "Maps", artist: "Todd R" }, 46: { title: "Distance", artist: "Trey Moody" }, 47: { title: "Nighter", artist: "UN-T.I.L." }, 48: { title: "Counts", artist: "Victoria B" }, 49: { title: "Ocelot", artist: "Winston S" } };

function updateLCD(l2, l3, l4) { 
    document.getElementById('line2').innerText = l2;
    document.getElementById('line3').innerText = l3;
    document.getElementById('line4').innerText = l4;
}

function refreshDisplay() {
    const lang = ui[currentLang];
    if (!isLanguageSelected) updateLCD("1: ENGLISH", "2: ESPANOL", "LANGUAGE");
    else if (isDirectoryOpen) { const e = directory[directoryIndex]; updateLCD(e.artist, e.title, lang.dn); }
    else if (isReviewing) updateLCD("1:LISTEN", "#:SEND", "REVIEW");
    else if (currentTrackNum === 1 && inputString === "") updateLCD(lang.d, lang.r, lang.dual);
    else if (currentTrackNum > 1 && inputString === "") { const t = directory[currentTrackNum]; updateLCD(t.artist, t.title, lang.nav); }
}

function toggleHandset() {
    initAudioEngine(); isOffHook = !isOffHook;
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play().catch(() => {});
    const f = document.getElementById('handset-flipper');
    if (isOffHook) {
        if(f) f.classList.add('up');
        isLanguageSelected = false; isReviewing = false; playTrack(100);
    } else {
        if (isRecording && mediaRecorder) { mediaRecorder.stop(); isRecording = false; }
        if (cmdTimer) { clearTimeout(cmdTimer); cmdTimer = null; }
        isReviewing = false; if(f) f.classList.remove('up'); triggerRecoil();
        updateLCD("LIFT", "RECEIVER", " ");
        audio.pause(); audio.src = ""; isDirectoryOpen = false; inputString = "";
    }
}

function press(key) {
    if (!isOffHook) return;
    triggerRecoil(); playDialTone(key); 
    if (!isLanguageSelected) {
        if (key === '1') { currentLang = 'en'; isLanguageSelected = true; playTrack(1); }
        else if (key === '2') { currentLang = 'es'; isLanguageSelected = true; playTrack(1); }
        return;
    }
    if (isReviewing) {
        if (key === '1') { audio.src = URL.createObjectURL(recordedBlob); audio.play(); }
        else if (key === '#') { isReviewing = false; uploadToDrive(recordedBlob); }
        else if (key === '*') { isReviewing = false; recordedBlob = null; playTrack(1); }
        return;
    }
    if (isRecording) { if (key === '#') { isRecording = false; mediaRecorder.stop(); } return; }
    if (cmdTimer) { clearTimeout(cmdTimer); cmdTimer = null; }

    if (isDirectoryOpen) {
        if (key === '2') { directoryIndex = (directoryIndex > 2) ? (directoryIndex-1 === 30 || directoryIndex-1 === 43 ? directoryIndex-2 : directoryIndex-1) : 49; refreshDisplay(); }
        else if (key === '8') { directoryIndex = (directoryIndex < 49) ? (directoryIndex+1 === 30 || directoryIndex+1 === 43 ? directoryIndex+2 : directoryIndex+1) : 2; refreshDisplay(); }
        else if (key === '#') { playTrack(directoryIndex); isDirectoryOpen = false; }
        else if (key === '*') { isDirectoryOpen = false; playTrack(1); }
        return;
    }

    if (key === '#') {
        if (inputString === "402") { audio.pause(); startRecording(); }
        else if (inputString === "00") { isDirectoryOpen = true; directoryIndex = 2; refreshDisplay(); }
        else {
            const d = parseInt(inputString);
            if (directory[d]) playTrack(d);
            else { updateLCD("INVALID", inputString, " "); setTimeout(refreshDisplay, 1500); }
        }
        inputString = "";
    } else if (key === '*') {
        inputString = ""; playTrack(1);
    } else {
        inputString += key;
        updateLCD("DIALING", inputString, "POUND CALL");
        if (inputString.length === 1 && (key === '4' || key === '5' || key === '6')) {
            cmdTimer = setTimeout(() => {
                if (inputString === key) {
                    if (key === '5') playRandom();
                    else if (key === '4') playTrack(currentTrackNum > 2 ? (currentTrackNum-1 === 30 || currentTrackNum-1 === 43 ? currentTrackNum-2 : currentTrackNum-1) : 49);
                    else if (key === '6') playTrack(currentTrackNum < 49 ? (currentTrackNum+1 === 30 || currentTrackNum+1 === 43 ? currentTrackNum+2 : currentTrackNum+1) : 2);
                    inputString = "";
                }
            }, 1000);
        }
    }
}

function playRandom() { let r; do { r = Math.floor(Math.random() * 48) + 2; } while (directory[r] === undefined || r === 30 || r === 43); playTrack(r); }

function playTrack(num) {
    if (num === 30 || num === 43) { updateLCD("ERROR", "SOON", " "); return; }
    currentTrackNum = num; audio.pause();
    if (audioCtx) gainNode.gain.setValueAtTime(num === 5 ? 7.0 : 1.0, audioCtx.currentTime);
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play().catch(() => {});
    refreshDisplay();
    setTimeout(() => {
        audio.src = baseUrl + num.toString().padStart(4, '0') + ".mp3";
        audio.load();
        audio.play().then(() => { if (num !== 1 && num !== 100) refreshDisplay(); });
    }, 400);
}

function cycleVolume() { 
    volIndex = (volIndex + 1) % volLevels.length; 
    audio.volume = volLevels[volIndex]; playVolumeChirp(volIndex); 
    updateLCD("VOLUME", "LEVEL", "I".repeat(volIndex + 1)); 
    setTimeout(() => { if (isOffHook) refreshDisplay(); }, 1500); 
}
