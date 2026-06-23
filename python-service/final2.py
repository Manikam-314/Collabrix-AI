from flask import Flask, request, jsonify
from flask_cors import CORS
import nltk
from transformers import pipeline
from nltk.tokenize import sent_tokenize, word_tokenize
import pandas as pd

# -----------------------------
# Flask setup
# -----------------------------
app = Flask(__name__)
CORS(app)

# -----------------------------
# NLTK download
# -----------------------------
nltk.download('punkt', quiet=True)

# -----------------------------
# Load summarization model
# -----------------------------
print("⏳ Loading AI summarization model (T5-small)...")
summarizer = pipeline("summarization", model="t5-small")
print("✅ Model loaded successfully!")

# -----------------------------
# Load keyword dataset
# -----------------------------
keyword_df = pd.read_csv("keyword_dataset_300.csv")  # CSV with 'keyword' column
keyword_set = set(keyword_df['keyword'].str.lower())
print(f"✅ Loaded {len(keyword_set)} keywords for highlights extraction.")

# -----------------------------
# Summary endpoint
# -----------------------------
@app.route("/summary", methods=["POST"])
def summary():
    data = request.get_json()
    transcript = data.get("transcript", "").strip()
    if not transcript:
        return jsonify({"summary": ""})
    try:
        summary_result = summarizer(
            "summarize: " + transcript,
            max_length=120,
            min_length=30,
            do_sample=False
        )
        return jsonify({"summary": summary_result[0]['summary_text']})
    except Exception as e:
        return jsonify({"summary": f"Error: {str(e)}"})

# -----------------------------
# Highlights endpoint
# -----------------------------
@app.route("/highlights", methods=["POST"])
def highlights():
    data = request.get_json()
    transcript = data.get("transcript", "").strip()
    if not transcript:
        return jsonify({"highlights": []})

    try:
        sentences = sent_tokenize(transcript)
        highlights_list = []

        for sent in sentences:
            words = word_tokenize(sent)
            words_lower = [w.lower() for w in words]
            if any(word in keyword_set for word in words_lower):
                highlights_list.append(sent.strip())

        if not highlights_list:
            highlights_list = ["No clear highlights found."]

        return jsonify({"highlights": highlights_list})

    except Exception as e:
        return jsonify({"highlights": [f"Error: {str(e)}"]})

# -----------------------------
# Run Flask
# -----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
