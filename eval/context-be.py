# filepath: /python-postgres-app/python-postgres-app/src/main.py


import os

from fastapi import FastAPI, HTTPException, Body, Depends
import uvicorn
from config.db_config import DB_CONFIG
from database.connection import DatabaseConnection
from typing import List, Dict, Any
from pydantic import BaseModel, Field
import logging

# --- LlamaIndex and embedding setup ---
from llama_index.core import Settings
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.supabase import SupabaseVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding



from dotenv import load_dotenv

load_dotenv()

# Settings.embed_model = GoogleGenAIEmbedding(
#     model_name="text-embedding-004"
# )
Settings.embed_model =OpenAIEmbedding(
    model_name="text-embedding-3-small"
)
vector_store = SupabaseVectorStore(
    postgres_connection_string=(
        "postgresql://postgres:tWDFTXpYCxShNSunr983sKwSL8LGd5QZ@139.59.231.41:5432/postgres"
    ),
    collection_name="openai_embed_excluded_metadata",
    dimension=1536
)
index = VectorStoreIndex.from_vector_store(vector_store=vector_store)
retriever = index.as_retriever(similarity_top_k=4)
# --- end LlamaIndex setup ---

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Postgres Query API", description="API for querying Postgres database")

# Create database connection pool at startup instead of a new connection for each request
db_connection = DatabaseConnection(db_config=DB_CONFIG)

# Define request model for better validation and documentation
class QueryRequest(BaseModel):
    query: str = Field(..., description="SQL query to execute")

class ContextRequest(BaseModel):
    query: str = Field(..., description="Query to retrieve context")

# Connection dependency to reuse across routes
async def get_connection():
    conn = None
    try:
        conn = db_connection.connect()
        yield conn
    finally:
        if conn:
            conn.close()

@app.post("/data")
async def get_data(query_req: QueryRequest = Body(...), connection = Depends(get_connection)):
    """
    Get the data from the database based on the provided SQL query
    """
    try:
        # Validate query to prevent SQL injection (this is a basic check, more robust validation needed)
        query = query_req.query.strip()
        if not query.startswith("SELECT") or not query.lower().startswith("select"):
            raise HTTPException(status_code=400, detail="Only SELECT queries are allowed")
        
        # Log the query for debugging/audit purposes
        logger.info(f"Executing query: {query}")
        
        result = db_connection.fetch_data(query)
        
        if not result['data'] or len(result['data']) == 0:
            # Return empty object with structure to match frontend expectations
            return {
                "columns": [],
                "records": []
            }
        
        data = result['data']
        columns = result['columns']
        
        # Return a structured response that maps directly to the frontend table
        # For multi-column results, create an array of objects
        records = [dict(zip(columns, row)) for row in data]
        
        # Structure that aligns perfectly with frontend expectations
        # Frontend can extract columns from this response or use the columns array
        return {
            "columns": columns,
            "records": records
        }
            
    except Exception as e:
        logger.error(f"Database error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/context")
async def get_context(context_req: ContextRequest = Body(...)):
    """
    Retrieve context from vector store based on the provided query.
    """
    try:
        query = context_req.query.strip()
        # Retrieve relevant context using the retriever
        nodes = retriever.retrieve(query)
        metadata = [node.metadata for node in nodes]
        texts = [node.text for node in nodes]
        # combine metadata and text into context
        contexts = [{"text": text, "metadata": meta} for text, meta in zip(texts, metadata)]
        return {
            "contexts": contexts
        }
    except Exception as e:
        logger.error(f"Context retrieval error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Context retrieval error: {str(e)}")

def main():
    """
    Run the FastAPI application using uvicorn
    """
    uvicorn.run(app, host="0.0.0.0", port=8000)
if __name__ == "__main__":
    main()