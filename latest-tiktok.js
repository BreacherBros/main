console.log("🔥 latest-tiktok.js geladen");

let ttMuted = true;
let ttVideoId = null;

async function loadLatestTikTok() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data.id) {
      console.error("❌ No TikTok ID in API", data);
      return;
    }

    ttVideoId = data.id;

    const container = document.getElementById("tiktokContainer");
    if (!container) return;

    container.innerHTML = `
      <iframe 
        id="tiktokFrame"
        src="https://www.tiktok.com/embed/v2/${ttVideoId}?muted=1"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>
    `;

    console.log("✅ TikTok iframe loaded");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestTikTok();

  const btn = document.getElementById("ttMuteBtn");

  if(btn){
    btn.addEventListener("click", ()=>{
      if(!ttVideoId) return;

      const frame = document.getElementById("tiktokFrame");
      if(!frame) return;

      ttMuted = !ttMuted;

      frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=${ttMuted ? 1 : 0}`;
      btn.innerText = ttMuted ? "🔇" : "🔊";
    });
  }
});
