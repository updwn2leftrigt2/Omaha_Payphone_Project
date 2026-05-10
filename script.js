let mediaRecorder;
let audioChunks = [];
let audioBlob;
let currentInput = "";
let currentState = "DIALING"; 

const ARCHIVE_BASE = "https://ia902903.us.archive.org/22/items/omaha_payphone_project_playlist0526/mp3/";
const GAS_URL = "https://script.google.com/macros/s/AKfycbylSiBR4aZnANjlSDJLneav5rXZJlFzofnaRSUwhY-oA84bvwzZPUR24CREMqXJXUAOaw/exec";

const lcd = document.getElementById('lcd-screen');
const hashKey = document.getElementById('key-hash');
const archivePlayer = document.getElementById('archive-player');
const recordPlayer = document.getElementById('recording-playback');

function pressKey(key) {
    if (currentState === "DIALING") {
        currentInput += key;
        lcd.innerText = currentInput;

        // Trigger Recording Flow
        if (currentInput === "402#") {
            prepareToRecord();
        } 
        // Trigger Archive Playback (assuming 4-digit codes)
        else if (currentInput.length === 4 && !currentInput.includes("#")) {
            playArchiveTrack(currentInput);
            currentInput = ""; 
        }
    } 
    else if (currentState === "READY_TO_RECORD" && key === "#") {
        startRecording();
    } 
    else if (currentState === "RECORDING" && key === "#") {
        stopRecording();
    } 
    else if (currentState === "REVIEW") {
        if (key === "1") recordPlayer.play();
        if (key === "#") sendToGAS();
        if (key === "*") { resetPhone(); }
    }
}

/**
 * Archive.org Track Playback
 */
function playArchiveTrack(trackId) {
    lcd.innerText = "Playing: " + trackId;
    archivePlayer.src = `${ARCHIVE_BASE}${trackId}.mp3`;
    archivePlayer.play().catch(e => {
        lcd.innerText = "Track Not Found";
        setTimeout(resetPhone, 2000);
    });
}

/**
 * Recording Logic
 */
function prepareToRecord() {
    currentState = "READY_TO_RECORD";
    hashKey.classList.add('glow-ready');
    lcd.innerText = "Dial # to Begin Recording";
    currentInput = "";
}

async function startRecording() {
    playBeep();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
            // RELEASE MIC FOR MOBILE HANDOFF
            stream.getTracks().forEach(track => track.stop());
            
            audioBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
            recordPlayer.src = URL.createObjectURL(audioBlob);
            showReviewMenu();
        };

        mediaRecorder.start();
        currentState = "RECORDING";
        hashKey.classList.replace('glow-ready', 'glow-recording');
        lcd.classList.add('lcd-flash');
        lcd.innerText = "RECORDING...\nDial # to Stop";
    } catch (err) {
        lcd.innerText = "Mic Error";
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();
        lcd.classList.remove('lcd-flash');
        hashKey.classList.remove('glow-recording');
    }
}

function showReviewMenu() {
    currentState = "REVIEW";
    hashKey.classList.add('glow-ready');
    lcd.innerHTML = "1:Listen #:Send *:Del";
}

/**
 * Upload to Google Drive via GAS
 */
async function sendToGAS() {
    if (!audioBlob) return;
    lcd.innerText = "Sending...";
    
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob); 
    reader.onloadend = async () => {
        const formData = new URLSearchParams();
        formData.append('data', reader.result);

        try {
            await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors', 
                body: formData
            });
            lcd.innerText = "Sent Successfully!";
            setTimeout(resetPhone, 2000);
        } catch (error) {
            lcd.innerText = "Upload Failed";
        }
    };
}

function resetPhone() {
    currentState = "DIALING";
    currentInput = "";
    hashKey.classList.remove('glow-ready', 'glow-recording');
    lcd.classList.remove('lcd-flash');
    lcd.innerText = "Ready...";
}

function playBeep() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
}
