console.log("🔥 latest-tiktok.js geladen");

let isMuted = true;
let hasInteracted = false;
let ttVideoId = null;

/* ============================= */
/* ===== LOAD LATEST TIKTOK ==== */
/* ============================= */

async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data.id) {
      console.error("❌ No TikTok ID in API", data);
      return;
    }

    ttVideoId = data.id;

    const iframe = document.getElementById("tiktokFrame");
    if (!iframe) {
      console.error("❌ iframe not found");
      return;
    }

    // TikTok Embed
    iframe.src = `https://www.tiktok.com/embed/v2/${ttVideoId}?autoplay=1&muted=1&loop=1`;

    console.log("✅ TikTok iframe loaded");

    // 🔁 Loop starten
    forceTikTokLoop();

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

/* ============================= */
/* ===== FORCE LOOP SYSTEM ===== */
/* ============================= */

function forceTikTokLoop() {
  const iframe = document.getElementById("tiktokFrame");
  if (!iframe) return;

  console.log("🔁 TikTok Loop aktiviert");

  setInterval(() => {
    if (!iframe.src) return;
    iframe.src = iframe.src;   // reload = loop
  }, 30000); // 30s Loop
}

/* ============================= */
/* ===== MUTE BUTTON SYSTEM ==== */
/* ============================= */

function initMuteButton(){
  const muteBtn = document.getElementById("ttMuteBtn");
  const iframe = document.getElementById("tiktokFrame");

  if(!muteBtn || !iframe) return;

  muteBtn.addEventListener("click", () => {

    if(!hasInteracted){
      // erster Klick = echtes Unmute (Browser erlaubt Sound)
      iframe.src = iframe.src.replace("muted=1","muted=0");
      muteBtn.textContent = "🔊";
      isMuted = false;
      hasInteracted = true;
      return;
    }

    // UX Toggle (kein Reload mehr)
    if(isMuted){
      muteBtn.textContent = "🔊";
      isMuted = false;
    }else{
      muteBtn.textContent = "🔇";
      isMuted = true;
    }
  });
}

/* ============================= */
/* ===== INIT ================== */
/* ============================= */

document.addEventListener("DOMContentLoaded", () => {
  loadLatestTikTok();
  initMuteButton();
});
