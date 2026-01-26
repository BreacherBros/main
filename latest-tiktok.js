async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    if (!data?.id) {
      document.getElementById("latest-tiktok").innerHTML =
        "<p style='color:#888;text-align:center;'>Kein TikTok gefunden</p>";
      return;
    }

    document.getElementById("latest-tiktok").innerHTML = `
      <a href="${data.permalink}" target="_blank" style="text-decoration:none;">
        <div style="position:relative;">
          <img src="${data.thumbnail}" 
               style="width:100%; border-radius:12px; box-shadow:0 0 25px rgba(0,0,0,0.5);" />
          <div style="
            position:absolute;
            inset:0;
            display:flex;
            justify-content:center;
            align-items:center;
            font-size:60px;
            color:white;
            text-shadow:0 0 20px black;
          ">▶</div>
        </div>
        <p style="margin-top:10px; font-size:13px; color:#aaa; text-align:center;">
          ${data.caption.slice(0,120)}...
        </p>
      </a>
    `;
  } catch (e) {
    document.getElementById("latest-tiktok").innerHTML =
      "<p style='color:#888;text-align:center;'>Fehler beim Laden</p>";
  }
}

loadLatestTikTok();
