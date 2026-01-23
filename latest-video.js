async function loadLatestVideo() {
  try {
    const res = await fetch("https://r6-api-backend.onrender.com/api/youtube-latest");
    const data = await res.json();

    if (!data.videoId) {
      throw new Error("No video");
    }

    const iframe = document.getElementById("latestVideoFrame");
    const title = document.getElementById("latestVideoTitle");

    iframe.src = `https://www.youtube.com/embed/${data.videoId}?autoplay=0&rel=0`;
    title.innerText = data.title;

  } catch (err) {
    document.getElementById("latestVideoTitle").innerText = "Neuestes Video konnte nicht geladen werden";
  }
}

loadLatestVideo();
