import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const YT_KEY = process.env.AIzaSyDR5UyZUhuNbIVJUy9Szwzuv7qIgOd55Ds;
const CHANNEL_ID = "UCBkzbmUXRMiwfb2yeV9iuyQ";

/* ===== Latest YouTube Video ===== */
router.get("/youtube-latest", async (req, res) => {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=1&type=video`;
    const r = await fetch(url);
    const d = await r.json();

    if (!d.items || !d.items.length) {
      return res.status(404).json({ error: "No videos found" });
    }

    const videoId = d.items[0].id.videoId;
    const title = d.items[0].snippet.title;

    res.json({ videoId, title });
  } catch (e) {
    res.status(500).json({ error: "YouTube API error", details: e.message });
  }
});

export default router;
