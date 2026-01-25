async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    if (!data.play) {
      document.getElementById("latest-tiktok").innerHTML =
        "<p style='color:#888;text-align:center;'>Kein TikTok gefunden</p>";
      return;
    }

    document.getElementById("latest-tiktok").innerHTML = `
      <video 
        src="${data.play}" 
        poster="${data.cover || ''}"
        controls 
        playsinline 
        style="width:100%; border-radius:14px;">
      </video>
      <a href="${data.link}" target="_blank" style="display:block;margin-top:10px;color:#00c8ff;">
        Auf TikTok ansehen
      </a>
    `;

  } catch (e) {
    document.getElementById("latest-tiktok").innerHTML =
      "<p style='color:#888;text-align:center;'>TikTok konnte nicht geladen werden</p>";
  }
}

loadLatestTikTok();
