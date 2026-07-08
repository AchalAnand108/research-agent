# AI-Powered Research Agent
### IBM watsonx.ai · Granite 3 · 8B Instruct · Flask

A full-stack research assistant that leverages IBM Granite models to help researchers search academic literature, generate literature reviews, compare papers, identify research gaps, manage citations, and produce structured reports — all via a modern responsive web interface.

---

## Features

| Feature | Description |
|---|---|
| 🔬 **Research Chat** | Conversational AI for any research question, with session memory |
| 🔍 **Paper Search** | arXiv search with AI-powered synthesis of results |
| 📚 **Literature Review** | Auto-generated structured reviews with full citation lists |
| ⚖️ **Compare Papers** | Side-by-side AI comparison of methodologies and findings |
| 💡 **Research Gaps** | Identifies unexplored areas and suggests future directions |
| 📄 **Document Upload** | Analyze PDF / DOCX / TXT papers (summarize, extract, review) |
| 📌 **Citation Manager** | APA / IEEE / MLA / Chicago / Harvard formatting, export |
| 📝 **Report Generation** | Full reports, executive summaries, or structured abstracts |
| 🕐 **Research History** | Persistent sessions, reload and continue past research |
| 🌙 **Dark Mode** | System-friendly dark / light toggle |
| 📱 **Mobile Responsive** | Full Bootstrap 5 responsive layout |
| ⬇️ **Export** | PDF (ReportLab) and DOCX (python-docx) export |

---

## Quick Start

### 1. Clone / Download

```bash
git clone <your-repo-url>
cd research-agent
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your IBM Cloud credentials:

```env
IBM_API_KEY=your_ibm_cloud_api_key_here
IBM_PROJECT_ID=your_watsonx_project_id_here
IBM_WATSONX_URL=https://us-south.ml.cloud.ibm.com
FLASK_SECRET_KEY=change_this_to_a_long_random_string
```

#### How to obtain IBM watsonx.ai credentials

1. Go to [IBM Cloud](https://cloud.ibm.com) and log in (or create an account).
2. Navigate to **IBM watsonx.ai** and create or open a project.
3. Copy your **Project ID** from the project settings.
4. Go to **Manage → Access (IAM) → API keys** and create an **IBM Cloud API key**.
5. Paste both into your `.env` file.

### 5. Run the application

```bash
python app.py
```

Open your browser at **http://localhost:5000**

---

## Customizing the Agent

Open [`app.py`](app.py) and edit the `AGENT_INSTRUCTIONS` dictionary near the top of the file:

```python
AGENT_INSTRUCTIONS = {
    "RESEARCH_DOMAIN":      "General Academic Research",  # ← Your domain
    "WRITING_STYLE":        "academic",   # academic | technical | plain-language | concise
    "CITATION_FORMAT":      "APA",        # APA | IEEE | MLA | Chicago | Harvard
    "SOURCE_PREFERENCES":   [
        "peer-reviewed journals",
        "conference papers",
        "preprints (arXiv)",
    ],
    "SAFETY_RULES": {
        "always_cite":          True,   # Every factual claim must have a citation
        "admit_uncertainty":    True,   # Flag low-evidence claims as [UNCERTAIN]
        "no_fabricated_refs":   True,   # Never invent paper titles / DOIs
        "trusted_sources_only": True,   # Prefer peer-reviewed sources
    },
    "MAX_PAPERS_PER_SEARCH": 10,   # arXiv results per query
    "REPORT_MAX_TOKENS":     2048, # Token budget for reports
}
```

No restart needed beyond saving and re-running `python app.py`.

---

## API Reference

All endpoints accept and return JSON unless noted.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service health & model status |
| POST | `/api/chat` | Research conversation turn |
| POST | `/api/search` | arXiv paper search + AI insight |
| POST | `/api/summarize` | Summarize a paper by title/abstract |
| POST | `/api/literature-review` | Generate literature review |
| POST | `/api/compare` | Compare multiple papers |
| POST | `/api/gaps` | Research gap analysis |
| POST | `/api/upload` | Upload & analyze PDF/DOCX/TXT |
| GET | `/api/citations` | List session citations |
| POST | `/api/citations/add` | Add a citation manually |
| POST | `/api/citations/delete` | Remove a citation |
| POST | `/api/citations/format` | Format citations in chosen style |
| POST | `/api/report` | Generate research report |
| POST | `/api/export` | Export report as PDF or DOCX |
| GET | `/api/history` | Get session history |
| GET | `/api/sessions` | List all sessions |
| POST | `/api/sessions/delete` | Delete a session |

---

## Project Structure

```
research-agent/
├── app.py                  # Flask backend + AGENT_INSTRUCTIONS
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .env                    # Your credentials (never commit this!)
├── templates/
│   └── index.html          # Full SPA frontend
├── static/
│   ├── css/
│   │   └── styles.css      # Dark/light theme + all UI styles
│   └── js/
│       └── app.js          # Frontend logic (fetch, chat, modals)
├── uploads/                # Temp folder for uploaded docs (auto-created)
└── README.md
```

---

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
```

```bash
docker build -t research-agent .
docker run -p 5000:5000 --env-file .env research-agent
```

### IBM Code Engine / Cloud Foundry

```bash
# Build and push image, then deploy
ibmcloud ce application create \
  --name research-agent \
  --image your-registry/research-agent:latest \
  --env-from-secret research-agent-secrets \
  --port 5000
```

### Gunicorn (Production)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 app:app
```

---

## Security Notes

- **Never commit `.env`** — it contains your IBM API key.
- The `.env.example` file is safe to commit (no real credentials).
- For production, use IBM Secrets Manager or environment variables injected at runtime.
- The `uploads/` folder is cleared after each request; files are not persisted.

---

## Supported Models

The default model is `ibm/granite-3-8b-instruct`. Other IBM Granite models you can use:

| Model ID | Description |
|---|---|
| `ibm/granite-3-8b-instruct` | Default — fast, accurate (8B) |
| `ibm/granite-3-2b-instruct` | Lightweight (2B) |
| `ibm/granite-13b-instruct-v2` | Larger, higher quality (13B) |
| `ibm/granite-20b-multilingual` | Multilingual research |

Change the model in [`app.py`](app.py) in the `get_watsonx_model()` function.

---

## License

MIT License — see LICENSE file.

---

*Built with IBM watsonx.ai · Granite · Flask · Bootstrap 5*
