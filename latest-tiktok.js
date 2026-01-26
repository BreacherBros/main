console.log("🔥 latest-tiktok.js geladen");

let ttMuted = true;
let ttVideoId = null;

async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    // API liefert ID -> korrekt
    if (!data.id) {
      console.error("❌ No TikTok ID in API", data);
      return;
    }

    ttVideoId = data.id;

    const frame = document.getElementById("tiktokFrame");
    if (!frame) {
      console.error("❌ iframe not found");
      return;
    }

    // Embed v2 Player (stabil)
    frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=1&controls=0`;

    console.log("✅ TikTok iframe loaded");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestTikTok();

  const btn = document.getElementById("ttMuteBtn");

  if(btn){
    btn.addEventListener("click", () => {
      if(!ttVideoId) return;

      const frame = document.getElementById("tiktokFrame");
      if(!frame) return;

      ttMuted = !ttMuted;

      if(ttMuted){
        frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=1&controls=0`;
        btn.innerText = <img src="mutebutton.png">;
      }else{
        frame.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?muted=0&controls=0`;
        btn.innerText = <img src="unmutebutton.png">;
      }
    });
  }
});
