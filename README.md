# ERPNext AI Audio Chat Bot

A modern, high-fidelity AI voice assistant designed to interact with ERPNext's MariaDB database. Ask business questions via voice and get real-time insights from your ERP.

## 🚀 Features
- **Voice-First Experience**: Premium, pulsing UI for intuitive audio interaction.
- **Smart Data Retrieval**: Uses GPT-4o to generate secure SQL queries against ERPNext tables.
- **Seamless STT/TTS**: Fast transcription using OpenAI Whisper and clear voice feedback.
- **Dynamic Data Panel**: Real-time display of the query trace and MariaDB results.

---

## 🛠 Project Structure
- **Frontend**: React + Vite + Framer Motion + Lucide.
- **Backend**: FastAPI + OpenAI + MySQL Connector.

---

## 📦 Local Setup (Standalone)

### 1. Backend Setup
1. Move to the `backend` directory.
2. Install dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```
3. Update `.env` with your `OPENAI_API_KEY` and MariaDB credentials:
   ```env
   OPENAI_API_KEY=your_key_here
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=_erpnext_db
   ```
4. Start the server:
   ```bash
   python3 main.py
   ```

### 2. Frontend Setup
1. In the root directory, install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

---

## 🏗 ERPNext Site Integration

To integrate this directly into your Frappe/ERPNext site as a custom app:

### 1. Create a Custom Frappe App
```bash
bench new-app ai_chatbot
bench install-app ai_chatbot [your-site-name]
```

### 2. Move Logic to Frappe API
In `ai_chatbot/api.py`, wrap the STT and DB logic in a whitelisted function:
```python
@frappe.whitelist()
def process_voice_query():
    # Use frappe.request.files to get audio
    # Use frappe.db.sql() for MariaDB access
```

### 3. Deploy Frontend Assets
1. Build the React app: `npm run build`
2. Copy the `dist` folder contents to your custom app's public folder.
3. Use a custom Frappe Page to load the assets.

---

## ⚠️ Security Note
Always use parameterized queries or a validation layer when executing AI-generated SQL. Ensure the database user has limited permissions (ideally read-only for Sales/Purchase tables).

---

## 📄 License
MIT
