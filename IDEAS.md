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

## Winamp + Milkdrop

The closest description of this project: my own Milkdrop (the visualizer plugin), with a tiny Winamp around it so it has something to play. Use them as inspiration, not a template: borrow the ideas, make the look my own.

Readouts from the Winamp main window, all driven by real data:

- Mini spectrum analyzer next to the time
- Segmented LCD time display (`01:51`)
- `128 kbps` / `44 kHz` — bitrate and sample rate, readable from the MP3's own frame headers
- `mono` / `stereo` LEDs — also from the file
- Scrolling title ticker (`4. Crusher-P - Echo (3:50)`)
- Total time readouts (`0:00/27:45`, elapsed `02:12`)
- Chunky bevelled buttons

## EQ (optional, Milestone 4)

Winamp-style 10-band EQ with Web Audio: a `GainNode` preamp, then one `BiquadFilterNode` (type `peaking`) per band at 70, 180, 320, 600, 1K, 3K, 6K, 12K, 14K, 16K Hz, ±12 dB. Same audio graph as the visualizer's analyser, so EQ changes show up in the bars.

