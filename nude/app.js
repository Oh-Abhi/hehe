// Web Audio API & Media Element Disco Engine

// Global Audio State
let audioCtx = null;
let masterGainNode = null;
let analyserNode = null;
let mediaSourceNode = null;
let isPanicActive = false;
let savedDanceClass = 'dance-bounce';

// Audio Reactive Variables
let averageVolume = 0;
let bassIntensity = 0;

// Canvas Particles State
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
const particleCount = 70;

// Elements
const unlockOverlay = document.getElementById('unlock-overlay');
const btnUnlock = document.getElementById('btn-unlock');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnMute = document.getElementById('btn-mute');
const btnPanic = document.getElementById('btn-panic');
const volumeSlider = document.getElementById('volume-slider');
const avatarContainer = document.getElementById('avatar-container');
const pixelAvatar = document.getElementById('pixel-avatar');
const danceFloor = document.getElementById('dance-floor');
const strobeLeft = document.getElementById('strobe-left');
const strobeRight = document.getElementById('strobe-right');
const discoRays = document.getElementById('disco-rays');
const eqBars = document.querySelectorAll('.eq-bar');
const trackName = document.getElementById('track-name');
const bgAudio = document.getElementById('bg-audio');

// --- Web Audio API Routing ---

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
  
  // Route the HTML5 audio element through the Web Audio graph
  mediaSourceNode = audioCtx.createMediaElementSource(bgAudio);
  mediaSourceNode.connect(masterGainNode);
  
  // Route master gain node to analyser and then speakers
  masterGainNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);
}

// --- Soundboard Synthesizers (Procedural Retro Effects) ---

const soundboardFX = {
  airhorn: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    const frequencies = [349.23, 351.5, 347.0]; // detuned F4 chord
    
    frequencies.forEach(freq => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0.0, time);
      gain.gain.linearRampToValueAtTime(0.45, time + 0.05);
      gain.gain.setValueAtTime(0.45, time + 0.5);
      gain.gain.linearRampToValueAtTime(0.001, time + 0.85);
      
      osc.connect(gain);
      gain.connect(masterGainNode);
      osc.start(time);
      osc.stop(time + 0.95);
    });
  },
  
  scratch: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    const bufferSize = audioCtx.sampleRate * 0.45;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin(i / 80);
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.exponentialRampToValueAtTime(2500, time + 0.15);
    filter.frequency.exponentialRampToValueAtTime(400, time + 0.4);
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.45);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    
    noise.start(time);
    noise.stop(time + 0.48);
  },
  
  laser: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.22);
    
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    
    osc.connect(gain);
    gain.connect(masterGainNode);
    
    osc.start(time);
    osc.stop(time + 0.23);
  },
  
  cheer: () => {
    if (!audioCtx) return;
    const time = audioCtx.currentTime;
    
    const bufferSize = audioCtx.sampleRate * 0.8;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1600;
    filter.Q.value = 1.8;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.0, time);
    gain.gain.linearRampToValueAtTime(0.55, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.78);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);
    
    noise.start(time);
    noise.stop(time + 0.8);
  }
};

// --- Canvas Particles & Visualizer Rendering ---

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
    this.size = Math.random() * 4 + 1.5;
    this.baseSpeedX = Math.random() * 2 - 1;
    this.baseSpeedY = Math.random() * -2.5 - 0.5; // Upward speed
    this.speedX = this.baseSpeedX;
    this.speedY = this.baseSpeedY;
    
    // Colorful hues
    const hues = [280, 190, 330, 80, 0, 50]; // violet, cyan, pink, lime, red, orange
    this.hue = hues[Math.floor(Math.random() * hues.length)];
    this.alpha = Math.random() * 0.6 + 0.2;
    this.pulseFactor = Math.random() * 0.06 + 0.02;
  }
  
  update() {
    // If panic mode is active, speed particles up heavily
    const panicMultiplier = isPanicActive ? 2.5 : 1;
    
    // Scale speed to sound beat
    this.speedY = this.baseSpeedY * (1 + bassIntensity * 2.8) * panicMultiplier;
    this.speedX = this.baseSpeedX * (1 + averageVolume * 1.8) * panicMultiplier;
    
    this.y += this.speedY;
    this.x += this.speedX;
    
    // Pulse transparency
    this.alpha += this.pulseFactor;
    if (this.alpha > 0.95 || this.alpha < 0.2) {
      this.pulseFactor = -this.pulseFactor;
    }
    
    // Wrap at borders
    if (this.y < 0) {
      this.reset();
      this.y = canvas.height;
    }
    if (this.x < 0 || this.x > canvas.width) {
      this.reset();
    }
  }
  
  draw() {
    ctx.shadowBlur = this.size * (1.5 + averageVolume * 3.5);
    ctx.shadowColor = `hsl(${this.hue}, 100%, 60%)`;
    
    ctx.fillStyle = `hsla(${this.hue}, 100%, 65%, ${this.alpha})`;
    ctx.beginPath();
    // Square pixel sparkles
    ctx.fillRect(this.x, this.y, this.size * (1 + averageVolume * 2), this.size * (1 + averageVolume * 2));
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
  }
}

// Main Draw loop
function drawScene() {
  requestAnimationFrame(drawScene);
  
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
    averageVolume = total / bufferLength / 255;
    
    // Calculate bass energy
    let bassSum = 0;
    for (let i = 0; i < 4; i++) {
      bassSum += dataArray[i];
    }
    bassIntensity = bassSum / 4 / 255;
  }
  
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  
  reactUiToAudio(dataArray);
}

// Drive interface details with audio analysis
function reactUiToAudio(dataArray) {
  if (!dataArray || dataArray.length === 0) return;
  
  // Strobe Lights (Blinks heavily on bass beats)
  if (!isPanicActive) {
    if (bassIntensity > 0.52) {
      strobeLeft.style.opacity = (bassIntensity * 0.75).toString();
      strobeRight.style.opacity = (bassIntensity * 0.75).toString();
      
      // Tile borders highlight
      danceFloor.style.borderColor = 'var(--color-primary)';
      danceFloor.style.boxShadow = `0 0 ${20 + bassIntensity * 30}px var(--color-primary)`;
    } else {
      strobeLeft.style.opacity = '0';
      strobeRight.style.opacity = '0';
      danceFloor.style.borderColor = '#1f1f2e';
      danceFloor.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.7)';
    }
  }
  
  // Disco Ball rays scaling & rotation speed
  if (discoRays) {
    const scaleFactor = isPanicActive ? 1.5 : 1;
    const rotationSpeed = (isPanicActive ? 4 : 12) - averageVolume * 8;
    discoRays.style.animationDuration = `${Math.max(1.5, rotationSpeed)}s`;
    
    const rayScale = (1 + averageVolume * 0.3) * scaleFactor;
    discoRays.style.transform = `scale(${rayScale})`;
  }
  
  // Beat-reactive avatar scaling (does not conflict with bounce/spin path animations!)
  if (pixelAvatar) {
    const scale = 1 + bassIntensity * 0.15;
    pixelAvatar.style.transform = `scale(${scale})`;
    pixelAvatar.style.filter = `drop-shadow(0 0 ${12 + averageVolume * 28}px hsl(${280 + averageVolume * 120}, 100%, 65%))`;
  }
  
  // Controller equalizer updating
  const totalEq = eqBars.length;
  for (let i = 0; i < totalEq; i++) {
    const dataIdx = Math.floor((i / totalEq) * dataArray.length);
    const value = dataArray[dataIdx] || 0;
    const heightPercent = Math.max(10, Math.floor((value / 255) * 100));
    eqBars[i].style.height = `${heightPercent}%`;
  }
}

// --- UI Event Handlers ---

// Play/Pause toggle
btnPlayPause.addEventListener('click', () => {
  if (!audioCtx) initAudio();
  
  // Resume context if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  if (bgAudio.paused) {
    bgAudio.play();
    btnPlayPause.textContent = 'PAUSE';
    btnPlayPause.classList.add('active');
    avatarContainer.style.animationPlayState = 'running';
  } else {
    bgAudio.pause();
    btnPlayPause.textContent = 'PLAY';
    btnPlayPause.classList.remove('active');
    avatarContainer.style.animationPlayState = 'paused';
  }
});

// Mute toggle
btnMute.addEventListener('click', () => {
  if (!masterGainNode) initAudio();
  
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

// Volume control slider
volumeSlider.addEventListener('input', (e) => {
  const vol = parseFloat(e.target.value);
  if (masterGainNode && btnMute.textContent !== 'UNMUTE') {
    masterGainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  }
});

// Panic Mode (Rickroll) Toggle
btnPanic.addEventListener('click', () => {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  isPanicActive = !isPanicActive;
  
  if (isPanicActive) {
    btnPanic.classList.add('active');
    document.body.classList.add('panic-active');
    
    // Save current dance style and force hyper-spin
    savedDanceClass = Array.from(avatarContainer.classList).find(c => c.startsWith('dance-')) || 'dance-bounce';
    avatarContainer.classList.remove('dance-bounce', 'dance-spin', 'dance-slide');
    avatarContainer.classList.add('dance-hyper-spin');
    
    // Disable dance style buttons
    document.querySelectorAll('.dance-controls .ctrl-btn').forEach(btn => btn.setAttribute('disabled', 'true'));
    
    // Change song source to Rickroll
    bgAudio.src = "../assets/rickroll.mp3";
    bgAudio.load();
    bgAudio.play();
    
    btnPlayPause.textContent = 'PAUSE';
    btnPlayPause.classList.add('active');
    avatarContainer.style.animationPlayState = 'running';
    
    // Scrolling text track updates
    trackName.textContent = "ALERT: RICKROLL CORE ACTIVE! • NEVER GONNA GIVE YOU UP • NEVER GONNA LET YOU DOWN • ";
  } else {
    btnPanic.classList.remove('active');
    document.body.classList.remove('panic-active');
    
    // Re-enable controls and restore original style
    document.querySelectorAll('.dance-controls .ctrl-btn').forEach(btn => btn.removeAttribute('disabled'));
    avatarContainer.classList.remove('dance-hyper-spin');
    avatarContainer.classList.add(savedDanceClass);
    
    // Change song back to Groove
    bgAudio.src = "../assets/groove.mp3";
    bgAudio.load();
    bgAudio.play();
    
    btnPlayPause.textContent = 'PAUSE';
    btnPlayPause.classList.add('active');
    avatarContainer.style.animationPlayState = 'running';
    
    trackName.textContent = "NOW PLAYING: Unreal Superhero 3 (8-Bit Remix) • Dance Party Active at ohavi.me/nudes • ";
  }
});

// Dance Moves style buttons
const danceButtons = {
  'btn-move-bounce': 'dance-bounce',
  'btn-move-spin': 'dance-spin',
  'btn-move-slide': 'dance-slide'
};

Object.keys(danceButtons).forEach(btnId => {
  document.getElementById(btnId).addEventListener('click', (e) => {
    if (isPanicActive) return;
    
    avatarContainer.classList.remove('dance-bounce', 'dance-spin', 'dance-slide');
    avatarContainer.classList.add(danceButtons[btnId]);
    
    document.querySelectorAll('.dance-controls .ctrl-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
  });
});

// Dance Speed buttons
const speedValues = {
  'btn-speed-slow': '1.2s',
  'btn-speed-norm': '0.6s',
  'btn-speed-hyper': '0.3s'
};

Object.keys(speedValues).forEach(btnId => {
  document.getElementById(btnId).addEventListener('click', (e) => {
    avatarContainer.style.setProperty('--dance-duration', speedValues[btnId]);
    document.querySelectorAll('.speed-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
  });
});

// Soundboard Trigger Buttons
document.querySelectorAll('.sound-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const fxName = e.target.getAttribute('data-sound');
    if (soundboardFX[fxName]) {
      if (!audioCtx) initAudio();
      soundboardFX[fxName]();
      
      e.target.style.backgroundColor = 'var(--color-secondary)';
      e.target.style.color = '#000';
      setTimeout(() => {
        e.target.style.backgroundColor = '';
        e.target.style.color = '';
      }, 150);
    }
  });
});

// Autoplay lock overlay button
btnUnlock.addEventListener('click', () => {
  unlockOverlay.style.opacity = '0';
  setTimeout(() => {
    unlockOverlay.style.display = 'none';
  }, 500);
  
  initAudio();
  bgAudio.play();
  btnPlayPause.classList.add('active');
  btnPlayPause.textContent = 'PAUSE';
  
  avatarContainer.classList.add('dance-bounce');
});

// --- Initializer ---

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
initParticles();
drawScene();
