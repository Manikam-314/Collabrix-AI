from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.documents import Document
from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from llm import get_embeddings
from typing import List
import os

from qdrant_config import qdrant_client

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
