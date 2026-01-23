async function loadLatestReel() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/instagram-latest");
    const data = await res.json();

    const container = document.getElementById("latest-reel");

    if (!data.permalink) {
      container.innerHTML = "<p style='color:#888;'>Kein Reel gefunden</p>";
      return;
    }

    // Embed-URL bauen
    const embedUrl = data.permalink.replace(
      "https://www.instagram.com/reel/",
      "https://www.instagram.com/reel/"
    ) + "embed";

    container.innerHTML = `
      <iframe 
        src="${embedUrl}"
        style="width:100%;height:100%;min-height:420px;border-radius:14px;border:none;"
        allowfullscreen
        loading="lazy">
      </iframe>
    `;

  } catch (err) {
    document.getElementById("latest-reel").innerHTML =
      "<p style='color:#888;'>Reel konnte nicht geladen werden</p>";
  }
}

loadLatestReel();
