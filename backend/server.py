from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.param_functions import Query
from typing import Dict, List
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(docs_url="/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, use specific origins instead of "*"
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}  # active WebSocket connections
        self.messages: List[str] = []  # List to store the broadcasted messages
    
    async def connect(self, websocket: WebSocket, client_ip: str):
        await websocket.accept()  # Accept the WebSocket connection
        self.active_connections[client_ip] = websocket
        print(f"Connected: {client_ip}")
    
    async def disconnect(self, client_ip: str):
        if client_ip in self.active_connections:
            del self.active_connections[client_ip]
            print(f"Disconnected: {client_ip}")
    
    async def send_personal_message(self, ip: str, message: str):
        connection = self.active_connections.get(ip)
        if connection:
            await connection.send_text(message)
    
    async def broadcast(self, message: str):
        self.messages.append(message)  # Store each broadcasted message
        print(f"Broadcasting message: {message}")
        for connection in self.active_connections.values():
            await connection.send_text(message)
    
    async def get_active_connections(self):
        return list(self.active_connections.keys())  # List of client IPs
    
    async def broadcast_clients(self):
        clients_list = ",".join(self.active_connections.keys())
        for connection in self.active_connections.values():
            await connection.send_text(f"CLIENT_LIST:{clients_list}")
    
    def get_messages(self):
        return self.messages  # Return the list of stored broadcasted messages

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    client_ip = websocket.client.host
    await manager.connect(websocket, client_ip)  # Pass both websocket and client_ip
    await manager.broadcast_clients()  # Broadcast the client list
    try:
        while True:
            data = await websocket.receive_text()  # Receive the message from the client
            print(f"Received message from {client_ip}: {data}")
            await manager.broadcast(f"{client_ip} says: {data}")  # Broadcast to all clients
    except WebSocketDisconnect:
        await manager.disconnect(client_ip)  # Only need client_ip now
        await manager.broadcast_clients()  # Broadcast updated client list

@app.post("/send/{ip}")
async def send_message_ip(ip: str, message: str = Query(...)):
    """Endpoint to send a personal message to a specific client."""
    await manager.send_personal_message(ip, message)
    return {"message": "Message sent to the client."}

@app.get("/clients")
async def get_clients():
    """Endpoint to get the list of currently connected clients."""
    return {"clients": await manager.get_active_connections()}

@app.get("/getMessages")
async def get_messages():
    """Endpoint to retrieve all broadcasted messages."""
    messages = manager.get_messages()  # Removed await since it's not async
    return {"messages": messages}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="192.168.0.166", port=8000) # Run the FastAPI app on localhost