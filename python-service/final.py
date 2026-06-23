from flask import Flask, request, jsonify
from flask_cors import CORS
import re
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer
from collections import Counter

app = Flask(__name__)
CORS(app)
    """
    Summarize text using Sumy TextRank algorithm.
    Returns top 'sentence_count' sentences.
    """
    parser = PlaintextParser.from_string(text, Tokenizer("english"))
    summarizer = TextRankSummarizer()
    summary_sentences = summarizer(parser.document, sentence_count)
    summary_text = " ".join(str(sentence) for sentence in summary_sentences)
    return summary_text

@app.route("/highlights", methods=["POST"])
def highlights():
    data = request.get_json()
    transcript = data.get("transcript", "")

    if not transcript:
        return jsonify({"highlights": ""})

    try:
        # Expanded list of action words/phrases commonly used in corporate meetings
        action_words = [
            "Assign", "Assigned to", "Complete", "Completed", "Submit", "Submission", "Due date", "Deadline", "Finish", "Follow up",
            "Follow-up", "Review", "Check", "Verify", "Approve", "Approval", "Schedule", "Reschedule", "Plan", "Plan for",
            "Coordinate", "Coordinate with", "Discuss", "Discussion", "Decide", "Decision", "Implement", "Implementation", "Action required", "Action item",
            "Task", "Task assigned", "Responsibility", "Responsible", "Ensure", "Must", "Should", "Can", "Will", "Pending",
            "Complete by", "By Friday    / By Monday", "Next steps", "Update", "Inform", "Notify", "Contact", "Review document", "Prepare", "Finalize",
            "Draft", "Submit report", "Team member", "Deliverable", "Priority", "Critical", "Escalate", "Reminder", "Target date", "Completion",
            "Track", "Monitor", "Confirm", "Discuss with", "Follow through", "Immediate action", "Tentative deadline", "Urgent", "Pending approval", "Coordination required",
            "Assign responsibility", "Responsible person", "Task owner", "Action plan", "Ensure completion", "Review timeline", "Update status", "Complete task", "Finish task", "Schedule meeting",
            "Take note", "Record", "Follow up meeting", "Review agenda", "Assign role", "Deliver on time", "Resolve", "Confirm deadline", "Pending task", "Progress report"
        ]

        highlights_list = [line for line in re.split(r'(?<=[.!?]) +', transcript)
                           if any(word.lower() in line.lower() for word in action_words)]
        highlights_text = "\n".join(highlights_list)
        if not highlights_text:
            highlights_text = "No clear highlights found."
        return jsonify({"highlights": highlights_text})
    except Exception as e:
        return jsonify({"highlights": f"Error: {str(e)}"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
