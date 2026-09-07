from dotenv import load_dotenv
load_dotenv()

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel

import os
import shutil
import uuid

from rag_pipeline import RAGPipeline
from question_rewriter import rewrite_question

#uvicorn starts our FastAPI application
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag = None
chat_history = []

class ChatRequest(BaseModel):
    question:str


@app.get("/") #When someone accesses /, run the home() function.
def home():
    return {"message": "RAG API is running"}


@app.post("/upload")
async def upload_pdfs(files: list[UploadFile] = File(...)): #The ... means the file is required.

    global rag
    global chat_history

    os.makedirs("uploads",exist_ok=True)

    pdf_paths = []
    uploaded_filenames = []

    for file in files:
        if file.content_type != "application/pdf":
            return {"error": f"{file.filename} is not a PDF"}
        
        document_id = str(uuid.uuid4())
        pdf_path = os.path.join("uploads",f"{document_id}.pdf")
        
        #save uploaded file
        with open(pdf_path,"wb") as buffer:
            shutil.copyfileobj(file.file,buffer)

        pdf_paths.append(pdf_path)
        uploaded_filenames.append(file.filename)

    

    rag = RAGPipeline(pdf_paths)
    chat_history = []

    return { "message": "PDFs uploaded and processed successfully", "files": uploaded_filenames }


@app.post("/chat")
def chat(request:ChatRequest):

    global chat_history

    if rag is None:
        return { "error": "Please upload a PDF first" }

    standalone_question = rewrite_question(
        request.question,
        chat_history
        )

    response = rag.ask(standalone_question)

    chat_history.append({
        "role": "user",
        "content": request.question
    })
    chat_history.append({
        "role": "assistant",
        "content": response
    })

    return { "response": response}
    
