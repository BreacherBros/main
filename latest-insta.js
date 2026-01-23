async function loadLatestReel() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/insta-latest");
    const data = await res.json();

    if (!data.videoUrl) {
      document.getElementById("latest-reel").innerHTML =
        "<p style='color:#888;text-align:center;'>Kein Reel gefunden</p>";
      return;
    }

    document.getElementById("latest-reel").innerHTML = `
      <video 
        src="${data.videoUrl}" 
        poster="${data.thumbnail}" 
        controls 
        autoplay 
        muted 
        loop
        style="width:100%; border-radius:14px;">
      </video>

      <div style="margin-top:10px;">
        <a href="${data.link}" target="_blank" style="color:#00c8ff; text-decoration:none;">
          Auf Instagram ansehen →
        </a>
      </div>
    `;

  } catch (err) {
    document.getElementById("latest-reel").innerHTML =
      "<p style='color:#888;text-align:center;'>Reel konnte nicht geladen werden</p>";
  }
}

loadLatestReel();
