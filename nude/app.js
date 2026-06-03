// Web Audio API Procedural Synth & Interactive Disco Engine

// Global Audio State
let audioCtx = null;
let masterGainNode = null;
let analyserNode = null;
let synthTimerId = null;
let synthSequenceActive = false;

// Synth Sequencer Variables
let bpm = 125;
let beatTime = 60 / bpm; // duration of a quarter note
let sixteenthTime = beatTime / 4;
let nextNoteTime = 0.0;
let currentStep = 0;
const totalSteps = 16;

// Audio Reactive Variables
let averageVolume = 0;
let bassIntensity = 0;

// Canvas Particles State
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 60;

// Elements
const unlockOverlay = document.getElementById('unlock-overlay');
const btnUnlock = document.getElementById('btn-unlock');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnMute = document.getElementById('btn-mute');
const volumeSlider = document.getElementById('volume-slider');
const avatarContainer = document.getElementById('avatar-container');
const pixelAvatar = document.getElementById('pixel-avatar');
const danceFloor = document.getElementById('dance-floor');
const strobeLeft = document.getElementById('strobe-left');
const strobeRight = document.getElementById('strobe-right');
const discoRays = document.getElementById('disco-rays');
const eqBars = document.querySelectorAll('.eq-bar');

// Music Sequencer Note Patterns
// Bassline pattern: C2, C2, Eb2, Eb2, G2, G2, Bb2, Bb2 etc.
const bassNotes = [
  36, 36, 36, 36, // C2
  39, 39, 39, 39, // Eb2
  43, 43, 43, 43, // G2
  46, 46, 46, 46  // Bb2
];
const bassPattern = [
  1, 0, 1, 0,
  1, 0, 1, 0,
  1, 1, 0, 1,
  0, 1, 0, 1
];

// Lead Melody pattern (midi notes)
const melodyNotes = [
  60, 63, 65, 67, 70, 72, 75, 77 // C4, Eb4, F4, G4, Bb4, C5, Eb5, F5
];
// 16-step melody pattern (indexes into melodyNotes, -1 is rest)
const melodyPattern = [
  0, -1, 3, 4,  -1, 3, -1, 5,
  4, -1, 3, 0,  -1, 1,  2, -1
];

// --- Web Audio API Procedural Synth Nodes ---

function initAudio() {
  if (audioCtx) return;
  
  // Create audio context
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  // Create master gain node
  masterGainNode = audioCtx.createGain();
  masterGainNode.gain.setValueAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime);
  
  // Create analyser node
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 64; // Small fft for fast response and fewer bars
  
  // Route: Synth nodes -> Master Gain -> Analyser -> Destination (Speakers)
  masterGainNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);
  
  // Start sequencer loop
  nextNoteTime = audioCtx.currentTime;
  currentStep = 0;
  synthSequenceActive = true;
  scheduler();
}

// Convert MIDI note to frequency
function midiToFreq(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// --- Synthesizer Instruments ---

// 1. Kick Drum
function playKick(time) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.connect(gain);
  gain.connect(masterGainNode);
  
  osc.frequency.setValueAtTime(120, time);
  // Sweep frequency down to create punchy bass kick
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
  
  gain.gain.setValueAtTime(1.0, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  
  osc.start(time);
  osc.stop(time + 0.32);
}

// 2. Snare Drum (Filtered Noise)
function playSnare(time) {
  if (!audioCtx) return;
  
  // Create noise buffer
  const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 seconds
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noiseNode = audioCtx.createBufferSource();
  noiseNode.buffer = buffer;
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1000;
  
  const gain = audioCtx.createGain();
  
  noiseNode.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);
  
  gain.gain.setValueAtTime(0.7, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
  
  noiseNode.start(time);
  noiseNode.stop(time + 0.2);
}

// 3. Bass Synth (Sawtooth Wave)
function playBass(time, midiNote) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(midiToFreq(midiNote), time);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, time);
  filter.frequency.exponentialRampToValueAtTime(1000, time + 0.05);
  filter.frequency.exponentialRampToValueAtTime(100, time + 0.15);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);
  
  gain.gain.setValueAtTime(0.5, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
  
  osc.start(time);
  osc.stop(time + 0.2);
}

// 4. Lead Melody Synth (Square Wave)
function playLead(time, midiNote) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(midiToFreq(midiNote), time);
  
  // Fun retro vibrato
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 8; // 8 Hz vibrato
  lfoGain.gain.value = 15; // pitch depth
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, time);
  
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(masterGainNode);
  
  gain.gain.setValueAtTime(0.25, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);
  
  lfo.start(time);
  osc.start(time);
  
  lfo.stop(time + 0.25);
  osc.stop(time + 0.25);
}

// --- Synth Sequencer Clock Loop ---

function scheduler() {
  if (!synthSequenceActive) return;
  
  while (nextNoteTime < audioCtx.currentTime + 0.1) {
    scheduleStep(currentStep, nextNoteTime);
    advanceStep();
  }
  
  // Check back in 25ms
  synthTimerId = setTimeout(scheduler, 25);
}

function advanceStep() {
  currentStep = (currentStep + 1) % totalSteps;
  // Calculate next step time based on BPM sixteenth notes
  nextNoteTime += sixteenthTime;
}

function scheduleStep(step, time) {
  // 1. Kick on beats 1, 5, 9, 13
  if (step % 4 === 0) {
    playKick(time);
  }
  
  // 2. Snare on beats 5, 13 (step 4 and 12)
  if (step === 4 || step === 12) {
    playSnare(time);
  }
  
  // 3. Bass line
  if (bassPattern[step] === 1) {
    const bassNote = bassNotes[Math.floor(step / 4) * 4 + (step % 4)];
    playBass(time, bassNote);
  }
  
  // 4. Lead line
  const leadNoteIdx = melodyPattern[step];
  if (leadNoteIdx !== -1) {
    const leadNote = melodyNotes[leadNoteIdx];
    // Add variations every repeat
    const transpose = (step % 3 === 0) ? 0 : 2;
    playLead(time, leadNote + transpose);
  }
}

// --- Soundboard Synth Sound Effects ---

const soundboardFX = {
  airhorn: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    // An airhorn is multiple sawtooth waves detuned slightly
    const frequencies = [349.23, 351.5, 347.0]; // Detuned F4
    
    frequencies.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.4, time + 0.05);
      gain.gain.setValueAtTime(0.4, time + 0.5);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.8);
      
      osc.connect(gain);
      gain.connect(masterGainNode);
      osc.start(time);
      osc.stop(time + 0.85);
    });
  },
  
  scratch: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    const bufferSize = audioCtx.sampleRate * 0.4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    // Dynamic noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / 100);
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'peaking';
    // Sweep filter frequency to mimic vinyl scratching
    filter.frequency.setValueAtTime(400, time);
    filter.frequency.exponentialRampToValueAtTime(2000, time + 0.15);
    filter.frequency.exponentialRampToValueAtTime(300, time + 0.35);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    
    noise.start(time);
    noise.stop(time + 0.42);
  },
  
  laser: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, time);
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.25);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
    
    osc.connect(gain);
    gain.connect(masterGainNode);
    
    osc.start(time);
    osc.stop(time + 0.26);
  },
  
  cheer: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    // Procedural cheer/crowd: noise bursts + quick high frequency oscillators
    const bufferSize = audioCtx.sampleRate * 0.7;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 2.0;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.6, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    
    noise.start(time);
    noise.stop(time + 0.72);
  }
};

// --- Canvas Particles & Visualizer Loops ---

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 3 + 1;
    this.baseSpeedX = Math.random() * 2 - 1;
    this.baseSpeedY = Math.random() * -2 - 0.5; // Rise up
    this.speedX = this.baseSpeedX;
    this.speedY = this.baseSpeedY;
    
    // Disco hues
    const hues = [280, 190, 330, 80]; // violet, cyan, pink, lime green
    this.hue = hues[Math.floor(Math.random() * hues.length)];
    this.alpha = Math.random() * 0.5 + 0.3;
    this.pulseFactor = Math.random() * 0.05 + 0.02;
  }
  
  update() {
    // Modify speeds based on music bass intensity
    this.speedY = this.baseSpeedY * (1 + bassIntensity * 2.5);
    this.speedX = this.baseSpeedX * (1 + averageVolume * 1.5);
    
    this.y += this.speedY;
    this.x += this.speedX;
    
    // Pulsing alpha
    this.alpha += this.pulseFactor;
    if (this.alpha > 0.95 || this.alpha < 0.25) {
      this.pulseFactor = -this.pulseFactor;
    }
    
    // Wrap around borders
    if (this.y < 0) {
      this.reset();
      this.y = canvas.height;
    }
    if (this.x < 0 || this.x > canvas.width) {
      this.reset();
    }
  }
  
  draw() {
    ctx.shadowBlur = this.size * (1.5 + averageVolume * 3);
    ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`;
    
    ctx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${this.alpha})`;
    ctx.beginPath();
    // Retro squares instead of circles to make it feel pixelated!
    ctx.fillRect(this.x, this.y, this.size * (1 + averageVolume * 2), this.size * (1 + averageVolume * 2));
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

// Animation / Rendering Loop
function drawScene() {
  requestAnimationFrame(drawScene);
  
  // Semi-transparent background clear to create trailing neon glows
  ctx.fillStyle = 'rgba(5, 5, 8, 0.15)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.shadowBlur = 0; // reset shadow
  
  let dataArray = [];
  if (analyserNode) {
    const bufferLength = analyserNode.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let total = 0;
    for (let i = 0; i < bufferLength; i++) {
      total += dataArray[i];
    }
    averageVolume = total / bufferLength / 255; // Normalize 0 - 1
    
    // Calculate bass intensity (index 0 to 4 in a 32-bin analyser represent sub/low frequencies)
    let bassSum = 0;
    for (let i = 0; i < 4; i++) {
      bassSum += dataArray[i];
    }
    bassIntensity = bassSum / 4 / 255; // Normalize 0 - 1
  }
  
  // Draw & Update Particles
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  // React UI Elements to Beat
  reactUiToAudio(dataArray);
}

// Drive CSS elements based on audio energy levels
function reactUiToAudio(dataArray) {
  if (!dataArray || dataArray.length === 0) return;
  
  // 1. Strobe Lights (Blinks heavily on bass beats)
  if (bassIntensity > 0.55) {
    strobeLeft.style.opacity = (bassIntensity * 0.7).toString();
    strobeRight.style.opacity = (bassIntensity * 0.7).toString();
    
    // Make dance floor tiles highlight extra bright
    danceFloor.style.borderColor = 'var(--color-primary)';
    danceFloor.style.boxShadow = `0 0 ${20 + bassIntensity * 30}px var(--color-primary)`;
  } else {
    strobeLeft.style.opacity = '0';
    strobeRight.style.opacity = '0';
    danceFloor.style.borderColor = '#1f1f2e';
    danceFloor.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.7)';
  }
  
  // 2. Disco Ball rays scaling & color shifts
  if (discoRays) {
    const rotationSpeed = 12 - averageVolume * 8; // Speed up rotation on beats
    discoRays.style.animationDuration = `${rotationSpeed}s`;
    
    const rayScale = 1 + averageVolume * 0.3;
    discoRays.style.transform = `rotate(auto) scale(${rayScale})`;
  }
  
  // 3. Avatar Bounce Squash & Stretch Reacts to volume
  if (pixelAvatar) {
    const squash = 1 - averageVolume * 0.15;
    const stretch = 1 + averageVolume * 0.15;
    // Apply extra glow shadows
    pixelAvatar.style.filter = `drop-shadow(0 0 ${12 + averageVolume * 25}px hsl(${280 + averageVolume * 100}, 100%, 60%))`;
  }
  
  // 4. Update controller equalizer bars
  const totalEq = eqBars.length;
  for (let i = 0; i < totalEq; i++) {
    // Map equalizer bars to index buckets of audio data
    const dataIdx = Math.floor((i / totalEq) * dataArray.length);
    const value = dataArray[dataIdx] || 0;
    // Map value (0-255) to height percentage (10% to 100%)
    const heightPercent = Math.max(10, Math.floor((value / 255) * 100));
    eqBars[i].style.height = `${heightPercent}%`;
  }
}

// --- UI Event Handlers ---

// Play/Pause
btnPlayPause.addEventListener('click', () => {
  if (!audioCtx) return;
  
  if (synthSequenceActive) {
    synthSequenceActive = false;
    clearTimeout(synthTimerId);
    btnPlayPause.textContent = 'PLAY';
    btnPlayPause.classList.remove('active');
    
    // Stop avatar animation
    avatarContainer.style.animationPlayState = 'paused';
  } else {
    // Resume audio context if suspended (browser behavior)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    synthSequenceActive = true;
    nextNoteTime = audioCtx.currentTime;
    scheduler();
    btnPlayPause.textContent = 'PAUSE';
    btnPlayPause.classList.add('active');
    
    // Resume avatar animation
    avatarContainer.style.animationPlayState = 'running';
  }
});

// Mute/Unmute
btnMute.addEventListener('click', () => {
  if (!masterGainNode) return;
  
  if (masterGainNode.gain.value > 0) {
    masterGainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    btnMute.textContent = 'UNMUTE';
    btnMute.classList.add('active');
  } else {
    masterGainNode.gain.setValueAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime);
    btnMute.textContent = 'MUTE';
    btnMute.classList.remove('active');
  }
});

// Volume Control
volumeSlider.addEventListener('input', (e) => {
  const vol = parseFloat(e.target.value);
  if (masterGainNode && btnMute.textContent !== 'UNMUTE') {
    masterGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  }
});

// Dance Moves Selectors
const danceButtons = {
  'btn-move-bounce': 'dance-bounce',
  'btn-move-spin': 'dance-spin',
  'btn-move-slide': 'dance-slide'
};

Object.keys(danceButtons).forEach(btnId => {
  document.getElementById(btnId).addEventListener('click', (e) => {
    // Remove all dance classes from avatar container
    avatarContainer.classList.remove('dance-bounce', 'dance-spin', 'dance-slide');
    
    // Add target class
    avatarContainer.classList.add(danceButtons[btnId]);
    
    // Toggle active button state
    document.querySelectorAll('.dance-controls .ctrl-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
  });
});

// Dance Speed Selectors
const speedValues = {
  'btn-speed-slow': '1.2s',
  'btn-speed-norm': '0.6s',
  'btn-speed-hyper': '0.3s'
};

Object.keys(speedValues).forEach(btnId => {
  document.getElementById(btnId).addEventListener('click', (e) => {
    // Set CSS custom property on avatar container
    avatarContainer.style.setProperty('--dance-duration', speedValues[btnId]);
    
    // Toggle active state
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
  });
});

// Soundboard Triggering
document.querySelectorAll('.sound-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const fxName = e.target.getAttribute('data-sound');
    if (soundboardFX[fxName]) {
      // Initialize audio if not already done
      if (!audioCtx) {
        initAudio();
      }
      soundboardFX[fxName]();
      
      // Temporary button flashy effect
      e.target.style.backgroundColor = 'var(--color-secondary)';
      e.target.style.color = '#000';
      setTimeout(() => {
        e.target.style.backgroundColor = '';
        e.target.style.color = '';
      }, 150);
    }
  });
});

// Autoplay Unlock trigger
btnUnlock.addEventListener('click', () => {
  // Fade out lock overlay
  unlockOverlay.style.opacity = '0';
  setTimeout(() => {
    unlockOverlay.style.display = 'none';
  }, 500);
  
  // Init audio and trigger play
  initAudio();
  btnPlayPause.classList.add('active');
  
  // Set default dance class
  avatarContainer.classList.add('dance-bounce');
});

// --- Initialization ---

window.addEventListener('resize', resizeCanvas);

// Set up sizes and particle list
resizeCanvas();
initParticles();

// Start rendering canvas immediately (without audio initialized)
drawScene();
