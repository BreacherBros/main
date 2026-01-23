async function loadLatestReel() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/instagram-latest");
    const data = await res.json();

    const container = document.getElementById("latest-reel");

    if (!data.video_url && !data.permalink) {
      container.innerHTML = "<p style='color:#888;'>Kein Reel gefunden</p>";
      return;
    }

    // Video direkt einbetten
    if (data.video_url) {
      container.innerHTML = `
        <video 
          src="${data.video_url}" 
          controls 
          autoplay 
          muted 
          loop 
          playsinline
          style="width:100%;border-radius:14px;box-shadow:0 0 25px rgba(0,200,255,0.25);">
        </video>
      `;
    } else {
      // Fallback auf Instagram Link
      container.innerHTML = `
        <a href="${data.permalink}" target="_blank" style="color:#00c8ff;">
          Reel auf Instagram ansehen
        </a>
      `;
    }

  } catch (err) {
    document.getElementById("latest-reel").innerHTML =
      "<p style='color:#888;'>Reel konnte nicht geladen werden</p>";
  }
}

loadLatestReel();
