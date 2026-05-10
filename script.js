const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";
clickAudio.crossOrigin = "anonymous";

// WEB AUDIO ENGINE WITH MANUAL TRACK BOOST
let audioCtx, compressor, gainNode, source;

function initAudioEngine() {
    if (audioCtx) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    compressor = audioCtx.createDynamicsCompressor();
    gainNode = audioCtx.createGain(); // For manual track boosting
    
    source = audioCtx.createMediaElementSource(audio);
    
    // Route: Source -> Manual Gain -> Compressor -> Speakers
    source.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(audioCtx.destination);

    // Standard Compressor Settings
    compressor.threshold.setValueAtTime(-24, audioCtx.currentTime);
    compressor.knee.setValueAtTime(30, audioCtx.currentTime);
    compressor.ratio.setValueAtTime(12, audioCtx.currentTime);
}

let isOffHook = false, isLanguageSelected = false, currentLang = 'en', inputString = "";
let currentTrackNum = 1, volIndex = 1;
const volLevels = [0.25, 0.50, 0.75, 1.0], baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

// ... (Directory object remains the same) ...

function playTrack(num) {
    if (num === 30 || num === 43) { updateLCD("COMING SOON", "OMAHA PAYPHONE", " "); return; }
    currentTrackNum = num; audio.pause();
    
    // --- AMY HADDAD (TRACK 5) VOLUME BOOST ---
    if (audioCtx) {
        if (num === 5) {
            gainNode.gain.setValueAtTime(7, audioCtx.currentTime); // 250% Volume for Amy
        } else {
            gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime); // Normal Volume
        }
    }

    clickAudio.src = baseUrl + "0099.mp3";
    clickAudio.play().catch(() => {});
    
    refreshDisplay();
    setTimeout(() => {
        audio.src = baseUrl + num.toString().padStart(4, '0') + ".mp3";
        audio.load();
        audio.play().then(() => { if (num !== 1 && num !== 100) refreshDisplay(); });
    }, 400);
}
// ... (Rest of logic remains same) ...
