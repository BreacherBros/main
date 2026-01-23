console.log("🔥 latest-video.js wurde geladen");

async function loadLatestVideo() {
  console.log("🚀 loadLatestVideo gestartet");

  const res = await fetch("https://r6-api-backend.onrender.com/api/youtube-latest");
  const data = await res.json();

  console.log("📡 API DATA:", data);

  const iframe = document.getElementById("latestVideoFrame");
  const title = document.getElementById("latestVideoTitle");

  if (!iframe || !title) {
    console.error("❌ HTML IDs nicht gefunden");
    return;
  }

  iframe.src = `https://www.youtube.com/embed/${data.videoId}`;
  title.innerText = data.title;
}

loadLatestVideo();
