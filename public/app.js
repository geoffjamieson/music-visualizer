const libraryStatus = document.querySelector("#library-status");
const form = document.querySelector("#settings-form");
const input = document.querySelector("#music-dir");
const error = document.querySelector("#settings-error");

/** Show which folder is set, and pre-fill the form with it. */
function showMusicDir(musicDir) {
  libraryStatus.textContent = musicDir
    ? `Library: ${musicDir}`
    : "No music folder set yet.";
  input.value = musicDir ?? "";
}

// On load: ask the server whether a folder is already set.
const response = await fetch("/api/settings");
const settings = await response.json();
showMusicDir(settings.musicDir);

// On save: send the folder to the server, show the result or the error.
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  error.textContent = "";

  const response = await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ musicDir: input.value }),
  });

  const result = await response.json();

  if (response.ok) {
    showMusicDir(result.musicDir);
  } else {
    error.textContent = result.error;
  }
});
