import os
import io
import time
from fastapi import FastAPI, UploadFile, File, HTTPError
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mysql.connector
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ERPNext MariaDB Connection
def get_db_connection():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "_erpnext_db")
        )
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# Simple Tool for LLM to query MariaDB
def execute_sql(query: str):
    conn = get_db_connection()
    if not conn:
        return "Error: Could not connect to database"
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        result = cursor.fetchall()
        cursor.close()
        conn.close()
        return str(result)
    except Exception as e:
        return f"Error executing query: {e}"

@app.post("/chat")
async def chat_with_audio(audio: UploadFile = File(...)):
    # 1. Speech to Text
    try:
        audio_data = await audio.read()
        audio_file = io.BytesIO(audio_data)
        audio_file.name = "audio.wav"
        
        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )
        user_text = transcription.text
    except Exception as e:
        raise HTTPError(status_code=500, detail=f"STT Error: {e}")

    # 2. LLM Processing with Task context
    system_prompt = """
    You are an AI ERPNext Assistant. You have access to the MariaDB database.
    Your goal is to answer user questions by generating SQL queries.
    COMMON TABLES:
    - `tabSales Invoice`: grand_total, customer, posting_date
    - `tabPurchase Invoice`: grand_total, supplier, posting_date
    - `tabItem`: item_code, item_name, description
    - `tabWarehouse`: name
    - `tabStock Ledger Entry`: item_code, warehouse, actual_qty
    
    Always return a concise answer based on the data.
    If you need to query, start your response with 'QUERY: ' followed by the SQL.
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_text}
        ]
    )
    
    ai_response = response.choices[0].message.content
    db_data = ""
    
    # Simple check for SQL generation (in a real app, use function calling)
    if "QUERY:" in ai_response:
        sql = ai_response.split("QUERY:")[1].split(";")[0].strip()
        db_data = execute_sql(sql)
        
        # Follow up response with data
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_text},
                {"role": "assistant", "content": ai_response},
                {"role": "system", "content": f"Database Result: {db_data}"}
            ]
        )
        ai_response = response.choices[0].message.content

    # 3. Text to Speech (Optional, return text for frontend to call TTS or return audio bytes)
    # For simplicity, we'll return text and the frontend can use browser APIs or another endpoint.

    return {
        "transcription": user_text,
        "response": ai_response,
        "db_data": db_data
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
