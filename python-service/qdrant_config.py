import os
from qdrant_client import QdrantClient
from qdrant_client.http.models import VectorParams, Distance

QDRANT_HOST = os.environ.get("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.environ.get("QDRANT_PORT", 6333))
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY", None)
QDRANT_URL = os.environ.get("QDRANT_URL", None)

qdrant_client = None

try:
    if QDRANT_URL:
        qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    else:
        try:
            # Try connecting to docker / external Qdrant
            qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, api_key=QDRANT_API_KEY, timeout=2.0)
            qdrant_client.get_collections()
            print("Connected to external Qdrant server.")
        except Exception:
            # Fall back to local persistent storage if docker is not running
            print("Connecting to external Qdrant failed. Falling back to local persistent Qdrant (qdrant_local).")
            qdrant_client = QdrantClient(path="qdrant_local")
            
    if qdrant_client and not qdrant_client.collection_exists("meeting_chunks"):
        qdrant_client.create_collection(
            collection_name="meeting_chunks",
            vectors_config=VectorParams(size=768, distance=Distance.COSINE),
        )
except Exception as e:
    print(f"Warning: Qdrant setup failed. Error: {e}")
    qdrant_client = None
