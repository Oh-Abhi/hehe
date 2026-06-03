# ohavi.me - Pixel Disco Party 🕺

A fun, interactive, and visually stunning web page featuring a dancing pixelated cartoon avatar, dynamic disco lighting, and a procedural synthesizer that generates retro chiptunes directly in your browser.

## Project Structure

```
├── assets/
│   └── pixel_dancer.png   # The AI-generated pixel art dancer
├── nude/
│   ├── index.html         # The disco page (/nude)
│   ├── style.css          # Disco page CSS styles (glassmorphism & animations)
│   └── app.js             # Web Audio API Synth & Canvas Visualizer core
├── .gitignore             # Git ignore file
├── index.html             # Sleek landing page redirecting to /nude
└── style.css              # Cyberpunk landing page CSS styles
```

## Features

- **Procedural Chiptune Synthesizer**: Generates 8-bit drum beats, basslines, and melodies on the fly using the Web Audio API (no external MP3 load times, fully offline capable!).
- **Soundboard Controls**: Trigger retro sound effects (`Airhorn 🎺`, `Vinyl Record Scratch 💿`, `Laser Zap ⚡`, `Crowd Cheer 🎉`) generated procedurally in your browser.
- **Audio-Reactive Visualizer**:
  - Background canvas renders retro particle squares that accelerate, bounce, and glow to the beat.
  - Strobe lights flash in sync with the bass frequency spectrum.
  - Control panel displays a real-time mini frequency equalizer.
- **Runaway Warning Button**: An interactive security dialog button that flees the cursor when you try to click "I'm too scared".
- **CRT Scanline Overlay**: Gives the entire page a retro terminal monitor aesthetic.

## Local Development

To run the site locally:

1. **Option A (Python)**:
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

2. **Option B (Node.js)**:
   ```bash
   npx serve .
   ```
   Then open the provided port in your browser.

## Deployment to Vercel

Since this is a vanilla HTML/CSS/JS static site, you can deploy it to Vercel instantly:

1. **Command Line**:
   Install the Vercel CLI and run:
   ```bash
   vercel
   ```
2. **GitHub Integration (Recommended)**:
   - Push this local repository to GitHub.
   - Go to [Vercel](https://vercel.com), create a new project, and import your repository.
   - It will build and deploy in seconds! The subpath `ohavi.me/nude` will work out of the box because Vercel automatically maps directories containing `index.html` to their respective route paths.
