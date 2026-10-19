# Groove Party

A browser dance game inspired by camera-based dance games. Pick a song, stand in front of your webcam and copy the on-screen coach. Every move is rated PERFECT / GREAT / GOOD / OK / MISS, and gold moves are worth a bonus.

Open `dance/index.html` from any static host served over **https** (camera access requires a secure context), e.g. GitHub Pages or `npx http-server` on localhost.

## Features

- 6 original songs, synthesised live with the Web Audio API (no audio files), with karaoke lyrics sung by the lead synth
- Animated coaches built from a keyframed 2D skeleton, plus scrolling pictogram cards with motion arrows
- Webcam scoring with MediaPipe Pose (runs fully on-device), lag-tolerant limb-angle matching, 1–2 dancers
- Free dance (no camera) and Autoplay demo modes
- Stars, DIAMOND/LEGEND tiers, gold moves, calorie estimate, local best scores

## Code map

| File | What it does |
| --- | --- |
| `js/body.js` | Skeleton, IK, pose interpolation timeline, coach and pictogram drawing |
| `js/moves.js` | Move library (keyframed poses) |
| `js/songs.js` | Songs: patterns, melodies, lyrics, choreography |
| `js/music.js` | Compiles songs into beat-timed events, lyric and move timelines |
| `js/audio.js` | Synthesiser voices and look-ahead sequencer |
| `js/stage.js` | Backdrops, coach rendering, pictogram track, particles |
| `js/tracker.js` | Webcam + MediaPipe pose landmarker |
| `js/scoring.js` | Pose similarity, ratings, autoplay dancer |
| `js/main.js` | Screens, game loop, HUD, results |

Debug shortcut: `index.html?autostart=voltage-rush&mode=demo&players=2` jumps straight into a song.
