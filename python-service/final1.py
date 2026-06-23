from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from transformers import pipeline
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk import pos_tag

# ----------------------------------
# Flask setup
# ----------------------------------
app = Flask(__name__)
CORS(app)

# ----------------------------------
# Download required NLTK data
# ----------------------------------
nltk.download('punkt', quiet=True)
nltk.download('averaged_perceptron_tagger', quiet=True)
nltk.download('averaged_perceptron_tagger_eng',quiet=True)

# ----------------------------------
# Load transformer summarization model
# ----------------------------------
print("⏳ Loading AI summarization model (T5-small)...")
summarizer = pipeline("summarization", model="t5-small")
print("✅ Model loaded successfully!")

# ----------------------------------
# /summary endpoint — AI-based summarizerpip install flask flask-cors transformers nltk torch
@app.route("/summary", methods=["POST"])
def summary():
    data = request.get_json()
    transcript = data.get("transcript", "").strip()

    if not transcript:
        return jsonify({"summary": ""})

    try:
        print("🧠 Generating AI summary...")
        summary_result = summarizer(
            "summarize: " + transcript,
            max_length=200,
            min_length=30,
            do_sample=False
        )
        summary_text = summary_result[0]['summary_text']
        return jsonify({"summary": summary_text})
    except Exception as e:
        return jsonify({"summary": f"Error: {str(e)}"})

# ----------------------------------
# /highlights endpoint — extract sentences with verbs
# ----------------------------------
@app.route("/highlights", methods=["POST"])
def highlights():
    data = request.get_json()
    transcript = data.get("transcript", "").strip()

    if not transcript:
        return jsonify({"highlights": ""})

    try:
        print("✨ Extracting highlights...")
        sentences = sent_tokenize(transcript)
        highlights_list = []

        for sent in sentences:
            words = word_tokenize(sent)
            tags = pos_tag(words)
            # if sentence contains at least one verb → action point
            if any(pos.startswith('VB') for _, pos in tags):
                highlights_list.append(sent.strip())

        if not highlights_list:
            highlights_list = ["No clear highlights found."]

        # Join sentences with " | " for readable output
        highlights_text = " | ".join(highlights_list)
        return jsonify({"highlights": highlights_text})
    except Exception as e:
        return jsonify({"highlights": f"Error: {str(e)}"})

# ----------------------------------
# Run Flask app
# ----------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)