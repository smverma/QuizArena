# 🏆 QuizArena

A multi-category quiz game built with React + Vite. Fully frontend, compatible with GitHub Pages.

## 🎮 Features

- **9 Quiz Categories**: India Politics, Indian Geography, Bollywood, Cricket, World Map, Books & Authors, World History, World Flags, Mixed GK
- **10 Levels per Category** (100 questions per category, 900 total)
- **Difficulty Progression**: Easy (1–3), Medium (4–7), Hard (8–10)
- **3 Lifelines per Level**: 50-50, Double Choice, Swap Question
- **15-second Timer** per question
- **User Accounts**: Username + 4-digit PIN, persisted in localStorage
- **Leaderboard**: Top 10 global scores
- **Sound Effects**: Web Audio API (no files needed)
- **Mobile Responsive**: Works on phones and desktops

## 🚀 Setup & Run Locally

### Prerequisites
- Node.js 18+ and npm

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/smverma/QuizArena.git
cd QuizArena

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open [http://localhost:5173/QuizArena/](http://localhost:5173/QuizArena/) in your browser.

## 🏗️ Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## 🌐 Deploy to GitHub Pages

### Option 1: Manual Deploy

```bash
# Build the project
npm run build

# Deploy the dist/ folder to GitHub Pages
# (using gh-pages package or manual upload)
npm install -g gh-pages
gh-pages -d dist
```

### Option 2: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

Then enable GitHub Pages in your repo Settings → Pages → Source: `gh-pages` branch.

### Option 3: GitHub Pages via Settings

1. Build the project: `npm run build`
2. Go to Settings → Pages
3. Set Source to "Deploy from a branch"
4. Push the `dist/` folder contents to a `gh-pages` branch

After deployment, the app will be available at:
`https://smverma.github.io/QuizArena/`

## 📁 Project Structure

```
src/
├── data/                  # Question JSON files (9 categories × 100 questions)
├── context/
│   ├── AuthContext.jsx    # User authentication state
│   └── GameContext.jsx    # Game state (score, level, category)
├── db/
│   └── database.js        # Simulated in-memory DB with localStorage persistence
├── pages/
│   ├── LoginPage.jsx      # Username + PIN login/register
│   ├── CategoryPage.jsx   # 3×3 category grid
│   ├── QuizPage.jsx       # Quiz with timer, lifelines, lives
│   ├── LevelCompletePage.jsx
│   ├── GameOverPage.jsx
│   └── LeaderboardPage.jsx
├── components/
│   ├── Timer.jsx
│   ├── ProgressBar.jsx
│   ├── LifelineButtons.jsx
│   ├── QuestionCard.jsx
│   └── CategoryCard.jsx
└── utils/
    ├── soundManager.js    # Web Audio API sound effects
    └── quizEngine.js      # Lifeline logic helpers
```

## 🧩 Adding More Questions

Each category JSON in `src/data/` follows this format:

```json
{
  "category": "Category Name",
  "levels": [
    {
      "level": 1,
      "difficulty": "easy",
      "questions": [
        {
          "id": "unique_id",
          "question": "Question text?",
          "options": ["A", "B", "C", "D"],
          "correct": 0
        }
      ]
    }
  ]
}
```

- `correct` is the **0-based index** of the correct option
- Each level should have exactly 10 questions
- Levels 1–3 → `"difficulty": "easy"`, 4–7 → `"medium"`, 8–10 → `"hard"`

## 🎮 How to Play

1. Enter your username on the start screen
2. New users create a 4-digit PIN; returning users enter their PIN
3. Select a category from the home grid
4. Answer 10 questions per level within 15 seconds each
5. Use lifelines (50-50, Double Choice, Swap) to help
6. Complete all 10 levels to master a category
7. Check the Leaderboard to see your global rank
