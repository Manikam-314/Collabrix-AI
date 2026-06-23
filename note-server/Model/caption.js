const { default: mongoose } = require("mongoose");
const moongose = require("mongoose");

const CaptionSchema = new mongoose.Schema({
  meetingId: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Caption", CaptionSchema);