<div align="center">
  <h1>🌲 Content Forest</h1>
  <h3>Building an automated content ecosystem using Evolution as the algorithm and AI as the workers.</h3>

  <p>
    <a href="./README.en.md">English</a> | 
    <a href="./README.md">简体中文</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
    <img src="https://img.shields.io/badge/Status-Experimental-orange.svg" alt="Status">
    <img src="https://img.shields.io/badge/AI-Powered-blueviolet.svg" alt="AI">
    <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg" alt="PRs">
  </p>
</div>

---

## 🌟 Vision

**Leverage code to leverage media, creating a zero marginal cost automated content factory.**

Content Forest is not just a content generation tool; it is an **AI-based self-evolving content system**. It simulates natural selection by cycling through "Generation-Distribution-Feedback-Iteration", allowing content to optimize itself based on real market feedback (user attention), ultimately selecting the "super species" with the highest vitality and virality.

> "Only content tested by the market (user attention) is good content."

## 🚀 Core Logic

This project is built upon the following first principles:

1.  **Evolution**: Survival of the fittest.
2.  **Compounding**: Iteration based on success leads to exponential quality improvement.
3.  **Code Leverage**: AI Agents reduce marginal costs to near zero.
4.  **Media Leverage**: Content is an asset that can be distributed infinitely without permission.

## 🔄 The 5-Step Loop

The process of content incubation is like the growth of a tree, spiraling upwards.

```mermaid
graph TD
    A[Phase 1: Genesis] -->|Inject Intent| B(Phase 2: Growth)
    B -->|Agent Scale Production| C(Phase 3: Harvest)
    C -->|Market Validation| D(Phase 4: Feedback)
    D -->|Data Feedback| E(Phase 5: Evolution)
    E -->|Algorithm Optimization| A
    style A fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style B fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style C fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#ffebee,stroke:#c62828,stroke-width:2px
```

### 1. Genesis 🌱
Define the core intent and metadata (The Seed). This is the only part requiring deep human involvement.
- **Input**: Product selling points, brand values, target audience.

### 2. Growth 🌿
AI Agents act as gardeners, generating diverse content variants based on the seed.
- **Fission**: One core idea, 10 different title styles.
- **Cross-Modal**: Text script -> Short video script -> Podcast outline.
- **Mutation**: Introduce 10% randomness to avoid local optima.

### 3. Harvest 🌾
Distribute the "fruits" (actual content) to the market (TikTok, Twitter, etc.) to test their survival capability.

### 4. Feedback 📊
Collect platform feedback (views, likes, comments) as the objective truth of the market.

### 5. Evolution 🧬
Modify growth strategies based on data feedback.
- **Natural Selection**: Prune poor-performing content.
- **Gene Extraction**: Solidify viral features into the Gene Bank.
- **Crossover**: "Hybridize" successful genes from different platforms.

## 🧬 Key Features

### 🧪 Mutation Mechanism
To prevent the system from getting stuck in a "local optimum", the Agent autonomously decides whether to introduce mutation:
- **Style Mutation**: Rational ↔ Emotional, Serious ↔ Humorous.
- **Element Remix**: Title structure of Viral A + Visual style of Viral B.
- **Anti-Logic Probe**: Deliberately violating rules to explore blue ocean traffic.

### 🖐️ Human-in-the-loop
- **Pick Up**: Inject human judgment between "Generation" and "Distribution".
- **Nutrient Extraction**: Users manually extract success factors from high-conversion fruits to feed the system.

### 🌳 Iteration Tree
Records the complete evolutionary path of content:
`Seed → Fruit A → Fruit A1 (Optimized) → Fruit A1-1 (Video Version)`

## 🏗️ Architecture

### Logical View
```mermaid
graph LR
    User[User] --> Seed[Seed Manager]
    Seed --> Gen[Generation Engine]
    Know[Nutrient Bank] -.-> Gen
    Gen --> Fruit[Fruit Pool]
    Fruit --> Monitor[Monitor & Extract]
    Monitor --> Analyze[Data Analysis]
    Analyze --> Gen
```

### Domain Language (DDD)
- **Seed**: The source of creativity.
- **Nutrient**: Accumulated knowledge (Platform/Domain/Seed).
- **Generator**: Agent + Skills.
- **Fruit**: Generated content ready for publishing.

## 🛠️ Tech Stack

- **Frontend**: React / Vue + TypeScript + Tailwind CSS
- **Backend**: Python / Node.js
- **AI Core**: LLM APIs (OpenAI, Claude), LangChain / AutoGPT
- **Storage**: Markdown (Content), JSON (Data)

## 🤝 Contributing

PRs and Issues are welcome! We are building an open content evolution ecosystem.

## 📄 License

MIT License &copy; 2026 Content Forest Team
