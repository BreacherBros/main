async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    if (!data.id) {
      document.getElementById("latest-tiktok").innerHTML =
        "<p style='text-align:center;color:#888;'>Kein TikTok gefunden</p>";
      return;
    }

    document.getElementById("latest-tiktok").innerHTML = `
      <iframe 
        src="https://www.tiktok.com/embed/v2/${data.id}" 
        style="width:100%;height:100%;border-radius:14px;"
        allowfullscreen
        loading="lazy">
      </iframe>
    `;

  } catch (e) {
    document.getElementById("latest-tiktok").innerHTML =
      "<p style='text-align:center;color:#888;'>TikTok konnte nicht geladen werden</p>";
  }
}

loadLatestTikTok();
