// ---- Elements ----
const libraryStatus = document.querySelector("#library-status");
const settingsForm = document.querySelector("#settings-form");
const musicDirInput = document.querySelector("#music-dir");
const settingsError = document.querySelector("#settings-error");
const player = document.querySelector("#player");
const playlist = document.querySelector("#playlist");

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
  } else {
    settingsError.textContent = result.error;
  }
});

// ---- Playlist ----

/** '/music/' + the song's path, each part URL-encoded ('Two Weeks' → 'Two%20Weeks'). */
function songUrl(song) {
  return "/music/" + song.path.split("/").map(encodeURIComponent).join("/");
}

/** Start playing one song. */
function playSong(song) {
  player.src = songUrl(song);
  player.play();
}

/** Fetch every song in the library and show it as a list. */
async function loadSongs() {
  const response = await fetch("/api/songs");
  const songs = await response.json();

  for (const song of songs) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = song.title;
    button.addEventListener("click", () => playSong(song));

    item.append(button);
    playlist.append(item);
  }
}

// ---- Start ----
await loadSettings();
await loadSongs();
