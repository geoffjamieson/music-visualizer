// ---- Elements ----
const libraryStatus = document.querySelector("#library-status");
const settingsForm = document.querySelector("#settings-form");
const musicDirInput = document.querySelector("#music-dir");
const settingsError = document.querySelector("#settings-error");
const currentlyPlaying = document.querySelector("#currently-playing");
const player = document.querySelector("#player");
const playlist = document.querySelector("#playlist");
const previousBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const shuffleBtn = document.querySelector("#shuffle");
const repeatBtn = document.querySelector("#repeat");
const canvas = document.querySelector("#spectrum");

// ---- Settings ----

/** Show which folder is set, and pre-fill the form with it. */
function showMusicDir(musicDir) {
  libraryStatus.textContent = musicDir
    ? `Library: ${musicDir}`
    : "No music folder set yet.";
  musicDirInput.value = musicDir ?? "";
}

/** Ask the server whether a folder is already set. */
async function loadSettings() {
  const response = await fetch("/api/settings");
  const settings = await response.json();
  showMusicDir(settings.musicDir);
}

// On save: send the folder to the server, show the result or the error.
settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  settingsError.textContent = "";

  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicDir: musicDirInput.value }),
  });

  const result = await response.json();

  if (response.ok) {
    showMusicDir(result.musicDir);
    player.pause();
    await loadSongs();
  } else {
    settingsError.textContent = result.error;
  }
});

// ---- Playlist ----

/** Every song in the library, in playlist order. */
let songs = [];

/** Index of the current song playing, or -1 if none. */
let currentIndex = -1;

/** The repeat modes, in the order the button cycles through them. */
const REPEAT_MODES = ["off", "all", "one"];

/** Repeat mode: off, all (loop the playlist) or one (loop the current song). */
let repeatMode = REPEAT_MODES[0];

/** Whether songs play in a random order instead of playlist order. */
let shuffleOn = false;

/** The order songs play in: positions in `songs` (shuffled, it might be [3, 0, 4, 1, 2]). */
let playOrder = [];

/** '/music/' + the song's path, each part URL-encoded ('Two Weeks' → 'Two%20Weeks'). */
function songUrl(song) {
  return "/music/" + song.path.split("/").map(encodeURIComponent).join("/");
}

/** Seconds as minutes:seconds (230.4 → '3:50'). */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Show the current song as '4. Artist - Title', plus '(3:50)' once its length is known. */
function showCurrentSong() {
  const song = songs[currentIndex];
  const time = Number.isFinite(player.duration)
    ? ` (${formatTime(player.duration)})`
    : "";
  currentlyPlaying.textContent = `${currentIndex + 1}. ${song.artist} - ${song.title}${time}`;
}

/** Play the song at this position in `songs`. */
function playSong(index) {
  currentIndex = index;
  player.src = songUrl(songs[index]);
  // After the new src, so duration is NaN again and the old song's time isn't shown.
  showCurrentSong();
  player.play();

  // Bold only the song that's playing.
  const buttons = playlist.querySelectorAll("button");
  buttons.forEach((button) => button.removeAttribute("aria-current"));
  buttons[index].setAttribute("aria-current", "true");
}

/** Scramble an array in place, with every order equally likely (Fisher-Yates). */
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const pick = Math.floor(Math.random() * (i + 1));
    [array[i], array[pick]] = [array[pick], array[i]];
  }
}

/** Rebuild playOrder: every position in order, then scrambled if shuffle is on. */
function buildPlayOrder() {
  playOrder = songs.map((song, index) => index);
  if (shuffleOn) {
    shuffle(playOrder);
    // Start at the current song, so everything else is still to come.
    const spot = playOrder.indexOf(currentIndex);
    if (spot > 0)
      [playOrder[0], playOrder[spot]] = [playOrder[spot], playOrder[0]];
  }
}

/** Play the song one spot along in playOrder: direction is 1 for next, -1 for previous. */
function skip(direction) {
  const position = playOrder.indexOf(currentIndex);
  let nextPosition = position + direction;

  // Adding the length first because JS's % keeps the minus sign: -1 % 47 is -1, not 46.
  // The length check: x % 0 is NaN, which would slip past the guard below.
  if (repeatMode === "all" && playOrder.length > 0) {
    nextPosition = (nextPosition + playOrder.length) % playOrder.length;
  }

  if (nextPosition < 0 || nextPosition >= playOrder.length) return;
  playSong(playOrder[nextPosition]);
}

/** Fetch every song in the library and show it as a list. */
async function loadSongs() {
  songs = [];
  playOrder = [];
  currentIndex = -1;
  playlist.replaceChildren();
  currentlyPlaying.textContent = "";

  const response = await fetch("/api/songs");
  if (!response.ok) return;

  songs = await response.json();

  buildPlayOrder();

  songs.forEach((song, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${song.title} · ${song.artist} · ${song.album}`;
    button.addEventListener("click", () => playSong(index));
    item.append(button);
    playlist.append(item);
  });
}

// The length arrives a moment after the song starts loading, so add it then.
player.addEventListener("loadedmetadata", () => {
  showCurrentSong();
});

// When a song finishes, play the next one (if there is one).
player.addEventListener("ended", () => {
  skip(1);
});

previousBtn.addEventListener("click", () => {
  skip(-1);
});

nextBtn.addEventListener("click", () => {
  skip(1);
});

shuffleBtn.addEventListener("click", () => {
  shuffleOn = !shuffleOn;
  shuffleBtn.textContent = shuffleOn ? "Shuffle: on" : "Shuffle: off";

  buildPlayOrder();
});

repeatBtn.addEventListener("click", () => {
  const index = REPEAT_MODES.indexOf(repeatMode);
  const nextIndex = (index + 1) % REPEAT_MODES.length;
  repeatMode = REPEAT_MODES[nextIndex];
  repeatBtn.textContent = `Repeat: ${repeatMode}`;

  player.loop = repeatMode === "one";
});

// ---- Visualizer ----
/** The Web Audio world: every audio node is made by, and lives in, this context. */
const audioContext = new AudioContext();

// Browsers keep audio off until the user clicks something, and pressing play counts.
player.addEventListener("play", () => {
  audioContext.resume();
});

/** The <audio> element as the start of the graph: the sound flows out from here. */
const source = audioContext.createMediaElementSource(player);

/** Measures the sound passing through it, so we can draw it. */
const analyser = audioContext.createAnalyser();

source.connect(analyser);
analyser.connect(audioContext.destination);

/** One number per bin, 0 (silent) to 255 (loudest), refilled from the analyser. */
const bins = new Uint8Array(analyser.frequencyBinCount);

/** The 2D drawing tools for the canvas: rectangles, lines, colors. */
const ctx = canvas.getContext("2d");

/** Draw one frame, then ask the browser to call this again before the next screen refresh. */
function draw() {
  analyser.getByteFrequencyData(bins);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barCount = 64;
  const barWidth = canvas.width / barCount;

  for (let i = 0; i < barCount; i++) {
    // A bin can be 255 but the canvas is 200 tall, so scale 0–255 to 0–200.
    const height = (bins[i] / 255) * canvas.height;
    ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 1, height);
  }
  requestAnimationFrame(draw);
}
draw();

// ---- Start ----
await loadSettings();
await loadSongs();
