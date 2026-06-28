from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import os
import json
from collections import Counter
import heapq
import google.generativeai as genai
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct, VectorParams, Distance, Filter, FieldCondition, MatchValue
import uuid
from rag_chain import get_rag_chain

# Load .env file automatically
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, rely on system env vars


# Configure Qdrant
from qdrant_config import qdrant_client

app = Flask(__name__)
CORS(app)

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# ------------------ Stopwords ------------------
STOPWORDS = set("""
a an the and or but if while this that is are was were be been being have has had 
do does did for in on at by with about against between into through during before 
after above below to from up down out over under again further then once here there 
when where why how all any both each few more most other some such no nor not only 
own same so than too very
""".split())

# ------------------ Legacy TF Summarizer (Fallback) ------------------
def summarize_text(text, max_sentences=3):
    # Split by newlines first (speaker: text format), then by punctuation
    sentences = [s.strip() for s in text.strip().split('\n') if s.strip()]
    if len(sentences) <= 1:
        sentences = re.split(r'(?<=[.!?]) +', text.strip())
    if len(sentences) <= 1:
        # Last resort: split on sentence-ending punctuation patterns only
        sentences = re.split(r'(?<=[,;]) +', text.strip())
        sentences = [s.strip() for s in sentences if s.strip()]

    if len(sentences) <= max_sentences:
        return text

    # Tokenize + compute frequency
    words = re.findall(r'\w+', text.lower())
    words = [w for w in words if w not in STOPWORDS]
    freq = Counter(words)

    # Score each sentence
    sentence_scores = {}
    for i, sentence in enumerate(sentences):
        sentence_words = re.findall(r'\w+', sentence.lower())
        score = sum(freq[w] for w in sentence_words if w not in STOPWORDS)
        score += max(0, (len(sentences) - i) // 5)  # bias for earlier sentences
        sentence_scores[sentence] = score

    # Pick top N sentences but keep original order
    top_sentences = heapq.nlargest(max_sentences, sentence_scores, key=sentence_scores.get)
    ordered = [s for s in sentences if s in top_sentences]
    return " ".join(ordered)

# ------------------ Legacy Highlights (Fallback) ------------------
ACTION_WORDS = [
    "assign", "assigned", "complete", "completed", "submit", "submission", "due", "deadline",
    "finish", "follow up", "review", "check", "verify", "approve", "approval", "schedule",
    "reschedule", "plan", "coordinate", "discuss", "decide", "implementation", "action required",
    "responsibility", "responsible", "ensure", "must", "should", "pending", "next steps",
    "update", "inform", "notify", "contact", "prepare", "finalize", "draft", "deliverable", "priority",
    "critical", "escalate", "reminder", "target date", "completion", "monitor", "confirm", "urgent"
]

def split_into_sentences(text):
    # Priority 1: Split by newlines (handles our speaker: text\n format perfectly)
    lines = [s.strip() for s in text.strip().split('\n') if s.strip()]
    if len(lines) > 1:
        return lines
    # Priority 2: Split by sentence-ending punctuation
    sentences = re.split(r'(?<=[.!?]) +', text.strip())
    if len(sentences) > 1:
        return sentences
    # Priority 3: Split by comma/semicolon only (NOT conjunctions - that destroys context)
    sentences = re.split(r'(?<=[,;]) +', text.strip())
    return [s.strip() for s in sentences if s.strip()]

def extract_highlights(text):
    sentences = split_into_sentences(text)
    highlights = []
    keywords = [w.lower() for w in ACTION_WORDS]

    for sentence in sentences:
        s_lower = sentence.lower()
        for word in keywords:
            if word in s_lower:
                highlights.append({"sentence": sentence.strip(), "keyword": word})
                break

    if not highlights:
        action_like = [
            s for s in sentences 
            if re.search(r"\b(assign|complete|finish|review|schedule|finalize|ensure|reminder|due)\b", s.lower())
        ]
        if action_like:
            highlights = [{"sentence": s.strip(), "keyword": "inferred"} for s in action_like]

    if not highlights:
        highlights = [{"sentence": "No highlights inferred.", "keyword": None}]

    return highlights

def convert_to_new_highlights_schema(highlights):
    action_keywords = {"assign", "assigned", "complete", "completed", "due", "deadline", "schedule", "finalize"}
    risk_keywords = {"urgent", "critical", "escalate"}

    res_highlights = []
    res_action_items = []
    res_risks = []

    for h in highlights:
        text_val = h.get("sentence", "")
        kw = h.get("keyword", "")
        if not text_val:
            continue
        
        # Strip off speaker prefix if present (e.g. "Ravi: Payment pending")
        speaker = "Unknown"
        match = re.match(r"^([^:]+):\s*(.*)$", text_val)
        if match:
            speaker = match.group(1).strip()
            text_val = match.group(2).strip()

        res_highlights.append({"speaker": speaker, "text": text_val[:100]})
        
        if kw in action_keywords or kw == "inferred":
            res_action_items.append({
                "task": text_val,
                "owner": speaker,
                "deadline": "None"
            })
        elif kw in risk_keywords:
            res_risks.append(text_val)

    return {
        "highlights": res_highlights,
        "actionItems": res_action_items,
        "decisions": [],
        "risks": res_risks
    }

# ------------------ Qdrant / RAG Helpers ------------------
def chunk_transcript(transcript, meeting_id, chunk_size=150, overlap=30):
    lines = transcript.split('\n')
    chunks = []
    current_chunk = []
    word_count = 0
    
    for line in lines:
        if not line.strip(): continue
        speaker = "Unknown"
        match = re.match(r"^([^:]+):\s*(.*)$", line)
        if match:
            speaker = match.group(1).strip()
            
        words = line.split()
        if word_count + len(words) > chunk_size and current_chunk:
            chunks.append({
                "meetingId": meeting_id,
                "speaker": current_chunk[0]["speaker"],
                "text": "\n".join([c["line"] for c in current_chunk])
            })
            overlap_words = 0
            new_chunk = []
            for c in reversed(current_chunk):
                overlap_words += len(c["line"].split())
                new_chunk.insert(0, c)
                if overlap_words >= overlap:
                    break
            current_chunk = new_chunk
            word_count = sum(len(c["line"].split()) for c in current_chunk)
            
        current_chunk.append({"speaker": speaker, "line": line})
        word_count += len(words)
        
    if current_chunk:
        chunks.append({
            "meetingId": meeting_id,
            "speaker": current_chunk[0]["speaker"],
            "text": "\n".join([c["line"] for c in current_chunk])
        })
    return chunks

# ------------------ JSON Parser Helper ------------------def clean_and_parse_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\n", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\n```$", "", text)
    return json.loads(text.strip())

# ------------------ Endpoints ------------------
@app.route("/summary", methods=["POST"])
def summary():
    try:
        data = request.get_json()
        transcript = data.get("transcript", "")
        if not transcript.strip():
            return jsonify({"summary": ""})

        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel("gemini-2.0-flash")
                prompt = (
                    "You are an expert meeting summarizer. Generate a well-structured summary of the following meeting transcript.\n"
                    "Requirements:\n"
                    "- Between 1 and 3 paragraphs.\n"
                    "- Preserve important context.\n"
                    "- Do not write a long essay.\n"
                    "- Return only the summary text.\n\n"
                    f"Transcript:\n{transcript}"
                )
                response = model.generate_content(prompt)
                return jsonify({"summary": response.text.strip()})
            except Exception as gemini_err:
                app.logger.error(f"Gemini summary failed, falling back: {gemini_err}")
                # Fallback to TF
        
        # Legacy/Fallback summarizer
        return jsonify({"summary": summarize_text(transcript, max_sentences=3)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/highlights", methods=["POST"])
def highlights():
    try:
        data = request.get_json()
        transcript = data.get("transcript", "")
        if not transcript.strip():
            return jsonify({
                "highlights": [],
                "actionItems": [],
                "decisions": [],
                "risks": []
            })

        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel("gemini-2.0-flash")
                prompt = (
                    "Extract meeting highlights, action items, decisions made, and risks/blockers from the following meeting transcript.\n"
                    "The output must be a valid JSON object matching this schema:\n"
                    "{\n"
                    "  \"highlights\": [\n"
                    "    {\n"
                    "      \"speaker\": \"Name of the speaker who said/raised this highlight (or 'Unknown')\",\n"
                    "      \"text\": \"Concise highlight, max 20 words\"\n"
                    "    }\n"
                    "  ],\n"
                    "  \"actionItems\": [\n"
                    "    {\n"
                    "      \"task\": \"Concise task description\",\n"
                    "      \"owner\": \"Owner name (if mentioned, else 'Unknown')\",\n"
                    "      \"deadline\": \"Deadline (if mentioned, else 'None')\"\n"
                    "    }\n"
                    "  ],\n"
                    "  \"decisions\": [\n"
                    "    \"Important decision made\"\n"
                    "  ],\n"
                    "  \"risks\": [\n"
                    "    \"Risk or blocker that may delay progress\"\n"
                    "  ]\n"
                    "}\n"
                    "Requirements:\n"
                    "- Highlights must be short bullets (max 20 words each).\n"
                    "- Return ONLY the JSON object, do not add markdown code formatting like ```json or any other text.\n\n"
                    f"Transcript:\n{transcript}"
                )
                response = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                parsed = clean_and_parse_json(response.text)
                return jsonify(parsed)
            except Exception as gemini_err:
                app.logger.error(f"Gemini highlights failed, falling back: {gemini_err}")
                # Fallback
        
        # Legacy/Fallback highlights
        raw_h = extract_highlights(transcript)
        return jsonify(convert_to_new_highlights_schema(raw_h))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/index", methods=["POST"])
def index_meeting():
    data = request.get_json()
    meeting_id = data.get("meetingId")
    transcript = data.get("transcript", "")
    
    if not meeting_id or not transcript.strip():
        return jsonify({"error": "Missing meetingId or transcript"}), 400
        
    if not qdrant_client:
        return jsonify({"error": "Qdrant client not initialized"}), 500
        
    chunks = chunk_transcript(transcript, meeting_id)
    points = []
    
    try:
        for chunk in chunks:
            emb_res = genai.embed_content(
                model="models/embedding-001",
                content=chunk["text"],
                task_type="retrieval_document"
            )
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=emb_res['embedding'],
                    payload={
                        "meetingId": str(meeting_id),
                        "speaker": chunk["speaker"],
                        "text": chunk["text"]
                    }
                )
            )
            
        if points:
            qdrant_client.upsert(
                collection_name="meeting_chunks",
                points=points
            )
            
        return jsonify({"message": f"Indexed {len(points)} chunks successfully."})
    except Exception as e:
        app.logger.error(f"Indexing failed: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/ask", methods=["POST"])
def ask_question():
    data = request.get_json()
    meeting_id = data.get("meetingId")
    question = data.get("question")
    
    if not meeting_id or not question:
        return jsonify({"error": "Missing meetingId or question"}), 400
        
    try:
        rag_chain = get_rag_chain(meeting_id)
        response = rag_chain.invoke({"input": question})
        
        answer = response.get("answer", "")
        context_docs = response.get("context", [])
        
        sources = []
        for doc in context_docs:
            sources.append({
                "speaker": doc.metadata.get("speaker", "Unknown"),
                "text": doc.page_content
            })
            
        return jsonify({
            "answer": answer.strip(),
            "sources": sources
        })
    except Exception as e:
        app.logger.error(f"Ask failed via LangChain: {e}")
        return jsonify({"error": str(e)}), 500

# ------------------ Run Server ------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
