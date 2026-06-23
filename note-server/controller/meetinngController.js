// Dynamic import for UUID because Node.js v20+ treats uuid as ESM
const uuidv4 = async () => {
  const { v4 } = await import("uuid");
  return v4;
};

// Create meeting handler
exports.createMeeting = async (req, res) => {
  try {
    const v4 = await uuidv4();         
    const meetingId = v4();          
    res.json({ meetingId });          
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create meeting" });
  }
};
