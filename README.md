# 📚 RAG Chat App

A simple **Retrieval-Augmented Generation (RAG)** web application built with **Next.js, LangChain, Qdrant, and OpenAI**.  
Users can upload documents (PDF, TXT, CSV) or provide a website URL, and then query the data through a chat interface.  

👉 Live Demo[https://notebook-rag-pipeline.vercel.app/]

---

## 🚀 Features
- 📄 Upload multiple file types: **PDF, CSV, TXT**
- 🌐 Add **website as data source** (scraped & indexed)
- 💬 Chatbot interface to query indexed data
- ⚡ Chunking + Embeddings for efficient retrieval
- 📦 Vector storage powered by **Qdrant** (local via Docker or Qdrant Cloud)
- 🎯 Accurate contextual answers using **OpenAI**
- 🖥️ Clean UI & smooth workflow

---

## 🏗️ Tech Stack
- **Frontend:** Next.js (React, Tailwind CSS)  
- **Backend:** Next.js API Routes (Node.js utils)  
- **LLM & Embeddings:** OpenAI GPT + `text-embedding-3-small`  
- **Vector Database:** Qdrant (Cloud or Docker local setup)  
- **Text Processing:** LangChain loaders & splitters  

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/rag-chat-app.git
cd rag-chat-app
```

### 2️⃣ Install Dependencies
```bash
npm install
```

### 3️⃣ Environment Variables
Create a .env.local file in the root:
```bash
OPENAI_API_KEY=your_openai_api_key

# If using Qdrant Cloud
QDRANT_URL=https://your-instance-url.qdrant.cloud
QDRANT_API_KEY=your_qdrant_api_key

# If using local Docker Qdrant
QDRANT_URL=http://localhost:6333
```

### 4️⃣ Run Qdrant (Development Only)
```bash
docker run -p 6333:6333 qdrant/qdrant
```

### 5️⃣ Start the App
```bash
npm run dev
```

App will run at: http://localhost:3000

---

## 📘 Usage

1. Open the app in your browser
2. Upload a PDF/CSV/TXT file or enter a website URL
3. Data will be chunked, embedded, and indexed into Qdrant
4. Ask questions in the chat window
5. Bot responds with answers grounded in your uploaded data

---

## 📹 Demo

* File Upload: Upload PDF → Ask → Get answer
* Website Input: Enter URL → Ask → Get answer

## 📌 Future Improvements

* Add support for images (OCR-based extraction)
* Multi-file search with citations
* Persistent chat history with memory
* UI polish with persona prompts

👨‍💻 Author

Made with ❤️ in one-night hack by [Harsh Shukla]