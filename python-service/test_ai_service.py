import unittest
import json
from ai_service import app, summarize_text, extract_highlights

class TestAIService(unittest.TestCase):
    def setUp(self):
        # Configure Flask app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()

    def test_summarize_text_basic(self):
        # Test summarization with longer text
        text = (
            "We had a team meeting today. We discussed the database migration. "
            "It is highly critical that we complete the migration by Friday. "
            "Alice will assign tasks to Bob and Charlie tomorrow morning. "
            "Please review the timeline and ensure everything is updated."
        )
        summary = summarize_text(text, max_sentences=2)
        # Should split correctly and return a shorter summary
        self.assertIsNotNone(summary)
        self.assertTrue(len(summary) < len(text))

    def test_summarize_text_short(self):
        # Short text should return as-is
        text = "This is a short meeting."
        summary = summarize_text(text, max_sentences=3)
        self.assertEqual(summary, text)

    def test_extract_highlights_with_keywords(self):
        # Text containing explicit action words
        text = "Alice will assign the task to Bob. We must complete this due Friday."
        highlights = extract_highlights(text)
        
        # We expect a list of highlight objects with 'sentence' and 'keyword'
        self.assertIsInstance(highlights, list)
        self.assertTrue(len(highlights) > 0)
        self.assertIn("sentence", highlights[0])
        self.assertIn("keyword", highlights[0])
        self.assertEqual(highlights[0]["keyword"], "assign")

    def test_extract_highlights_fallback(self):
        # Text with action-like words but no explicit ACTION_WORDS list triggers
        text = "Please review the agenda and make sure everyone is ready."
        highlights = extract_highlights(text)
        self.assertTrue(len(highlights) > 0)
        self.assertIn("sentence", highlights[0])

    def test_summary_endpoint(self):
        # Test /summary POST endpoint
        payload = {
            "transcript": "Hello team. Let's design the schema. We need to finish this. It is urgent."
        }
        response = self.client.post(
            "/summary",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("summary", data)
        self.assertIsInstance(data["summary"], str)

    def test_summary_endpoint_empty(self):
        # Test empty input
        payload = {"transcript": ""}
        response = self.client.post(
            "/summary",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["summary"], "")

    def test_highlights_endpoint(self):
        # Test /highlights POST endpoint
        payload = {
            "transcript": "We must assign tasks by Monday. The due date is critical."
        }
        response = self.client.post(
            "/highlights",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("highlights", data)
        self.assertIsInstance(data["highlights"], list)
        self.assertTrue(len(data["highlights"]) > 0)

    def test_highlights_endpoint_empty(self):
        payload = {"transcript": ""}
        response = self.client.post(
            "/highlights",
            data=json.dumps(payload),
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["highlights"], [])

if __name__ == "__main__":
    unittest.main()
