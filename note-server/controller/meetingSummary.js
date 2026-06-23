const axios = require("axios");
const Caption = require("../Model/caption");

// --- Save each transcript chunk into MongoDB ---
exports.saveCaption = async (req, res) => {
  try {
    const { meetingId, transcript } = req.body;
    if (!meetingId || !transcript) {
      return res.status(400).json({ error: "meetingId and transcript are required" });
    }

    const caption = new Caption({ meetingId, text: transcript });
    await caption.save();

    console.log(`📝 Saved caption for meeting ${meetingId}:`, transcript);

    res.status(201).json({ message: "Caption saved successfully" });
  } catch (err) {
    console.error("Error saving caption:", err.message);
    res.status(500).json({ error: "Error saving caption" });
  }
};

// --- Generate summary from all stored captions ---
exports.getSummary = async (req, res) => {
  try {
    const { meetingId } = req.params;
    if (!meetingId) {
      return res.status(400).json({ error: "MeetingId is required" });
    }

    // Fetch all captions from DB
    const captions = await Caption.find({ meetingId }).sort({ timestamp: 1 });
    if (!captions.length) {
      return res.status(404).json({ error: "No captions found for this meeting" });
    }

    const transcript = captions.map(c => c.text).join(" ");

    console.log(`📩 Sending transcript to Python (len: ${transcript.length})`);

    const response = await axios.post("http://localhost:5000/summary", { transcript });

    console.log("📄 Summary received from Python:", response.data.summary);

    res.json({ summary: response.data.summary });
  } catch (err) {
    console.error("Error in getSummary:", err.message);
    res.status(500).json({ error: "Error generating summary" });
  }
};

// --- Generate highlights from all stored captions ---
exports.getHighlights = async (req, res) => {
  try {
    const { meetingId } = req.params;
    if (!meetingId) {
      return res.status(400).json({ error: "MeetingId is required" });
    }

    // Fetch all captions from DB
    const captions = await Caption.find({ meetingId }).sort({ timestamp: 1 });
    if (!captions.length) {
      return res.status(404).json({ error: "No captions found for this meeting" });
    }

    const transcript = captions.map(c => c.text).join(" ");

    console.log(`📩 Sending transcript to Python for highlights (len: ${transcript.length})`);

    const response = await axios.post("http://localhost:5000/highlights", { transcript });

    console.log("⭐ Highlights received from Python:", response.data.highlights);

    res.json({ highlights: response.data.highlights });
  } catch (err) {
    console.error("Error in getHighlights:", err.message);
    res.status(500).json({ error: "Error generating highlights" });
  }
};
