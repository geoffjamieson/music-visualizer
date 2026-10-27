// ---- Elements ----
const libraryStatus = document.querySelector("#library-status");
const settingsForm = document.querySelector("#settings-form");
const musicDirInput = document.querySelector("#music-dir");
const settingsError = document.querySelector("#settings-error");
const player = document.querySelector("#player");
const playlist = document.querySelector("#playlist");
const previousBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");

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

/** '/music/' + the song's path, each part URL-encoded ('Two Weeks' → 'Two%20Weeks'). */
function songUrl(song) {
  return "/music/" + song.path.split("/").map(encodeURIComponent).join("/");
}

/** Play the song at this position in the playlist (does nothing if there's no song there). */
function playSong(index) {
  if (index < 0 || index >= songs.length) return;

  currentIndex = index;
  player.src = songUrl(songs[index]);
  player.play();

  // Bold only the song that's playing.
  const buttons = playlist.querySelectorAll("button");
  buttons.forEach((button) => button.removeAttribute("aria-current"));
  buttons[index].setAttribute("aria-current", "true");
}

/** Fetch every song in the library and show it as a list. */
async function loadSongs() {
  songs = [];
  currentIndex = -1;
  playlist.replaceChildren();

  const response = await fetch("/api/songs");
  if (!response.ok) return;

  songs = await response.json();

  songs.forEach((song, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = `${song.title} · ${song.artist} · ${song.album}`;
    button.addEventListener("click", () => playSong(index));
    item.append(button);
    playlist.append(item);
  });
}

// When a song finishes, play the next one (if there is one).
player.addEventListener("ended", () => {
  playSong(currentIndex + 1);
});

previousBtn.addEventListener("click", () => {
  playSong(currentIndex - 1);
});

nextBtn.addEventListener("click", () => {
  playSong(currentIndex + 1);
});

// ---- Start ----
await loadSettings();
await loadSongs();
