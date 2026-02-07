# AI Chat Application

A ChatGPT-like AI chat application built with Python Flask, Google Gemini API, and vanilla JavaScript.

---

## Features

- **Chat with AI** – Send messages and get responses from Google Gemini
- **Chat history** – All conversations saved in SQLite
- **Sidebar** – New chat, previous chats list, theme toggle
- **ChatGPT-style UI** – Clean, minimal, modern design
- **Light/Dark mode** – Toggle between themes
- **Markdown support** – Code blocks, bold text, lists in AI responses

---

## Tech Stack

| Layer      | Technology        |
| ---------- | ----------------- |
| Backend    | Python, Flask     |
| AI         | Google Gemini API |
| Frontend   | HTML, CSS, vanilla JavaScript |
| Database   | SQLite            |

---

## Folder Structure

```
CGT AI CHAT APP/
│
├── backend/
│   ├── app.py           # Flask server + API + database
│   ├── requirements.txt # Python dependencies
│   ├── database.db      # SQLite (created automatically)
│   └── .env.example     # Copy to .env and add your API key
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── .gitignore
└── README.md
```

---

## Setup Instructions

### 1. Get API Keys (Gemini or OpenAI)

- For Google Gemini: create an API key in Google AI Studio.
- For OpenAI: create an API key in your OpenAI account.

Either key can be used by the app. If both are present, Gemini will be attempted first, then OpenAI.

### 2. Configure the Backend

1. Open the `backend` folder
2. Copy `.env` (already provided) or create `.env` from `.env.example` and fill values
3. Put your keys into `.env` without committing the file to git. Example:
   ```
   GEMINI_API_KEY=your_gemini_key_here
   OPENAI_API_KEY=your_openai_key_here
   ```
4. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

Note: If a secret key was previously committed to the repository by mistake, rotate that key immediately.

### 3. Run the Application

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```
2. Open your browser and go to:
   ```
   http://127.0.0.1:5000
   ```
3. Start chatting!

---

## How to Run Backend

### Development
```bash
cd backend
python app.py
```
The server will start on `http://127.0.0.1:5000`.

### Production (example using Gunicorn)
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```
For production, put a reverse-proxy (Nginx) in front and use HTTPS.

---

## How to Open Frontend

- **Option A (recommended):** Run the backend and open `http://127.0.0.1:5000` in your browser. The frontend is served automatically.

- **Option B:** If you want to run the frontend separately (e.g. for development), use a simple HTTP server:
  ```bash
  cd frontend
  python -m http.server 8080
  ```
  Then open `http://127.0.0.1:8080`. You must also run the backend and update `API_BASE` in `script.js` to `"http://127.0.0.1:5000"`.

---

## API Endpoints

| Method | Endpoint        | Description                    |
| ------ | --------------- | ------------------------------ |
| POST   | `/chat`         | Send message, get AI response  |
| GET    | `/chats`        | List all chats                 |
| GET    | `/chats/<id>`   | Get messages for a chat        |

---

## Notes for DevOps / Deployment

- **Environment variables:** Ensure `GEMINI_API_KEY` is set in production (do not commit `.env`).
- **CORS:** The app uses `flask-cors`; for production, restrict allowed origins.
- **Database:** `database.db` is created in the `backend` folder. For production, consider PostgreSQL or another database.
- **Static files:** The Flask app serves the frontend from the `frontend` folder. For production, you may want to use a reverse proxy (e.g. Nginx) to serve static files.
- **HTTPS:** Use HTTPS in production.

---

## Troubleshooting

- **"Error: Failed to fetch"** – Make sure the backend is running (`python app.py` in the `backend` folder).
- **"Invalid API key"** – Check that `.env` exists and contains a valid `GEMINI_API_KEY`.
- **Empty chat list** – Start a new chat and send a message; the list will populate.

---

## License

MIT – Feel free to use this project for learning or your portfolio.
