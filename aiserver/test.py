from fastapi import FastAPI
from pydantic import BaseModel
import requests

app = FastAPI()

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
API_KEY = "sk-e8d222f33c2b4e8bab3a0a304a722fac"  # Replace or store securely

class MessageRequest(BaseModel):
    message: str

@app.post("/chat")
async def chat_with_deepseek(data: MessageRequest):
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": data.message}
        ],
        "temperature": 0.7
    }

    response = requests.post(DEEPSEEK_API_URL, headers=headers, json=payload)

    if response.status_code == 200:
        ai_reply = response.json()["choices"][0]["message"]["content"]
        return {"response": ai_reply.strip()}
    else:
        return {
            "error": "Failed to get response from DeepSeek API",
            "status_code": response.status_code,
            "details": response.text
        }
