from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from llm import get_embeddings
from typing import List
import os

QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.environ.get("QDRANT_PORT", 6333))
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", None)
QDRANT_URL = os.environ.get("QDRANT_URL", None)

try:
    if QDRANT_URL:
        qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, api_key=QDRANT_API_KEY)
except Exception as e:
    print(f"Warning: Qdrant setup failed. Error: {e}")
    qdrant_client = None

class MeetingRetriever(BaseRetriever):
    meeting_id: str
    
    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        if not qdrant_client:
            return []
            
        emb_model = get_embeddings()
        query_emb = emb_model.embed_query(query)
        
        search_result = qdrant_client.search(
            collection_name="meeting_chunks",
            query_vector=query_emb,
            query_filter=Filter(
                must=[
                    FieldCondition(
                        key="meetingId",
                        match=MatchValue(value=str(self.meeting_id))
                    )
                ]
            ),
            limit=5
        )
        
        docs = []
        for hit in search_result:
            payload = hit.payload
            docs.append(Document(
                page_content=payload.get("text", ""),
                metadata={
                    "speaker": payload.get("speaker", "Unknown"),
                    "meetingId": payload.get("meetingId", "")
                }
            ))
        return docs

def get_retriever(meeting_id: str):
    return MeetingRetriever(meeting_id=meeting_id)
