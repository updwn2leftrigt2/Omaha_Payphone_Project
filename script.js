const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwvftBSqVh2B4OsfG6A-Z0NdfAQHSfzjzoU8ERxm5y2zkRm3UZx5N9AThrcLilGLFwfCw/exec";
const audio = new Audio();
const clickAudio = new Audio();
audio.crossOrigin = "anonymous";

let mediaRecorder, audioChunks = [], isRecording = false, isReviewing = false, recordedBlob = null;
let audioCtx, compressor, gainNode, source, cmdTimer = null;
let isOffHook = false, currentLang = 'en', inputString = "", currentTrackNum = 1, volIndex = 1;
const baseUrl = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";

function initAudioEngine() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioCtx.createGain(); 
        gainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function manageKeyFlashes(type) {
    ['btn-1', 'btn-ast', 'btn-pnd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('pulse-blue', 'flash-red');
    });
    if (type === 'recording') document.getElementById('btn-pnd').classList.add('flash-red');
    if (type === 'review') {
        document.getElementById('btn-1').classList.add('pulse-blue');
        document.getElementById('btn-ast').classList.add('pulse-blue');
        document.getElementById('btn-pnd').classList.add('pulse-blue');
    }
}

function updateLCD(l1, l2, l3, l4) {
    document.getElementById('line1').innerText = l1 || " ";
    document.getElementById('line2').innerText = l2 || " ";
    document.getElementById('line3').innerText = l3 || " ";
    document.getElementById('line4').innerText = l4 || " ";
}

function toggleHandset() {
    initAudioEngine(); isOffHook = !isOffHook;
    clickAudio.src = baseUrl + "0099.mp3"; clickAudio.play().catch(() => {});
    const f = document.getElementById('handset-flipper');
    if (isOffHook) {
        f.classList.add('up'); playTrack(100);
    } else {
        if (isRecording && mediaRecorder) mediaRecorder.stop();
        f.classList.remove('up'); audio.pause(); audio.src = ""; inputString = "";
        updateLCD(" ", "LIFT RECEIVER", "LEVANTE EL RECEPTOR", " ");
        manageKeyFlashes('none');
    }
}

// --- NEW MOBILE BUFFER PLAYBACK ---
async function playReviewBuffer() {
    if (!recordedBlob) return;
    initAudioEngine();
    const arrayBuffer = await recordedBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const playSource = audioCtx.createBufferSource();
    playSource.buffer = audioBuffer;
    playSource.connect(gainNode);
    playSource.start(0);
}

function press(key) {
    if (!isOffHook) return;
    initAudioEngine(); 
    if (isReviewing) {
        if (key === '1') playReviewBuffer(); // Using the new buffer method
        else if (key === '#') { isReviewing = false; manageKeyFlashes('none'); uploadToDrive(recordedBlob); }
        else if (key === '*') { isReviewing = false; manageKeyFlashes('none'); playTrack(1); }
        return;
    }
    if (isRecording && key === '#') { mediaRecorder.stop(); isRecording = false; return; }
    
    if (key === '#') {
        if (inputString === "402") startRecording();
        else if (inputString === "00") updateLCD("DIRECTORY", "SCROLL 2/8", "POUND PLAY", " ");
        else { const d = parseInt(inputString); if (d) playTrack(d); }
        inputString = "";
    } else {
        inputString += key; updateLCD("DIALING", inputString, "PRESS # CALL", " ");
    }
}

function startRecording() {
    updateLCD("VOICEMAIL", "WAIT BEEP", "ESPERE TONO", " ");
    setTimeout(() => {
        const beep = audioCtx.createOscillator(); beep.frequency.value = 1000; beep.connect(audioCtx.destination); beep.start(); beep.stop(audioCtx.currentTime + 0.3);
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            mediaRecorder = new MediaRecorder(stream); audioChunks = []; isRecording = true;
            mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
            mediaRecorder.onstop = () => { recordedBlob = new Blob(audioChunks, { type: 'audio/webm' }); isReviewing = true; updateLCD("REVIEW", "1: LISTEN", "#: SEND", "*: DISCARD"); manageKeyFlashes('review'); };
            mediaRecorder.start(); manageKeyFlashes('recording'); updateLCD("RECORDING", "SPEAK NOW", "POUND STOP", "● REC");
        });
    }, 1000);
}

function playTrack(num) {
    audio.pause();
    updateLCD("PLAYING", "TRACK " + num, " ", " ");
    audio.src = baseUrl + num.toString().padStart(4, '0') + ".mp3";
    audio.play();
}

function cycleVolume() { 
    volIndex = (volIndex + 1) % 4; 
    audio.volume = [0.25, 0.5, 0.75, 1.0][volIndex];
    const osc = audioCtx.createOscillator(); osc.frequency.value = 800; osc.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.05);
    updateLCD("VOLUME", "LEVEL", "I".repeat(volIndex + 1), " ");
}
