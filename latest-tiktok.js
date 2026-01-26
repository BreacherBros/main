console.log("🔥 latest-tiktok.js wurde geladen");

async function loadLatestTikTok() {
  try {
    console.log("Loading TikTok...");

    const res = await fetch("https://r6-api-backend.onrender.com/api/tiktok-latest");
    const data = await res.json();

    console.log("TIKTOK DATA:", data);

    if (!data.permalink) {
      console.error("❌ No TikTok permalink in API", data);
      return;
    }

    const frame = document.getElementById("tiktokFrame");

    if (!frame) {
      console.error("❌ tiktokFrame not found");
      return;
    }

    // TikTok embed URL
    const embedUrl = `https://www.tiktok.com/embed/v2/${data.id}`;

    frame.src = embedUrl;

    console.log("✅ TikTok iframe embed loaded");

  } catch (e) {
    console.error("🔥 TikTok load error:", e);
  }
}

document.addEventListener("DOMContentLoaded", loadLatestTikTok);
