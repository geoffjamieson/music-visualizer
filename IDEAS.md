# Ideas

Notes for Milestone 4 (the visualizer). Style: a nerdy, handcrafted 2000s gadget — lots of bars, meters and readouts. Every moving thing should show **real data**, not decoration.

## From the music (Web Audio)

- **Spectrum analyzer** — hi-fi style bar graph, bass on the left, treble on the right. Peak-hold dots that hang at the top and slowly fall.
- **VU meters** — left/right loudness, as needles or LED ladders (green → yellow → red).
- **Oscilloscope** — the raw waveform as a glowing line.
- **Stereo scope** — dot cloud showing how wide the stereo image is.

## From the server (the plumbing underneath)

- **Anti-skip / buffer meter** — like the ESP memory meter on a Sony Discman. Data: `audio.buffered` (start/end times of what's downloaded; can be several separate stretches after seeking). Update on the audio `progress` event.
- **Byte counter** — the `Content-Range` (e.g. `2097152-7259877 / 7259878`) ticking like an odometer.
- **Link LED** — lit while the `/events` connection is open, blinks when a reload message arrives.
- **Request log ticker** — the colored `GET /Eyelash.mp3 -> 206` lines scrolling on a tiny LCD.

## Design references to collect

Hi-fi spectrum displays, Discman / MiniDisc LCDs, iPod progress bars, Winamp skins, rack equipment. Moodboard: https://www.figma.com/board/ZGndEYypaAB6N6I9R6F9wi/Music-Visualizer---Moodboard
