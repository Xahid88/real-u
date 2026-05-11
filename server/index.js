require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize cache (ttl: 24 hours)
const cache = new NodeCache({ stdTTL: 86400 });

// Initialize Gemini
let ai;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  console.log("Gemini API key missing or invalid. Set GEMINI_API_KEY in .env");
}

function generateHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Simple health check route so the browser doesn't show "Cannot GET /"
app.get('/', (req, res) => {
  res.send('<h1>Real U API Server is running!</h1><p>This server acts as the backend cache and AI crawler for the Real U extension.</p>');
});

app.post('/api/analyze', async (req, res) => {
  const { url, title, textContent, images, videos } = req.body;

  if (!textContent) {
    return res.status(400).json({ error: "No text content provided" });
  }

  // Generate a hash based on the URL to act as a unique identifier for caching
  const contentHash = generateHash(url);

  // 1. Check Cache
  const cachedResult = cache.get(contentHash);
  if (cachedResult) {
    console.log(`[CACHE HIT] Returning cached analysis for: ${url}`);
    return res.json({ cached: true, ...cachedResult });
  }

  console.log(`[CACHE MISS] Running AI analysis for: ${url}`);

  // Fallback to mock data if API key is missing
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_api_key_here') {
     console.log("Gemini API key not found. Using simulated AI response for prototype.");
     const mockResult = {
       score: Math.floor(Math.random() * 40) + 60, // 60-99
       metrics: {
         deepfake: "Clean",
         contextMatch: "Verified",
         aiTextGen: "Human",
         sourceTrust: "High"
       },
       summary: "This is a simulated analysis because the Gemini API key was not configured. The text content and media counts were extracted successfully.",
       mediaCount: `Img: ${images}, Vid: ${videos}`
     };
     cache.set(contentHash, mockResult);
     return res.json({ cached: false, ...mockResult });
  }

  try {
    // 2. Perform AI Analysis (Crawler/Analyzer Bot simulation)
    const prompt = `
      You are the core intelligence of "Real U", an AI fact-checking tool. 
      Analyze the following webpage content to detect misinformation, deepfakes, AI generation, or context mismatch.
      
      Page URL: ${url}
      Page Title: ${title}
      Media Count: ${images} Images, ${videos} Videos
      Content: ${textContent.substring(0, 5000)}
      
      Based on the content and tone, provide a realistic assessment. Return ONLY a valid JSON object with the following structure:
      {
        "score": number (0-100, where 100 is fully authentic and fact-checked, 0 is known misinformation/fake),
        "metrics": {
          "deepfake": "Clean" | "Suspicious" | "Detected",
          "contextMatch": "Verified" | "Mismatch",
          "aiTextGen": "Human" | "Likely AI" | "AI Generated",
          "sourceTrust": "High" | "Medium" | "Low"
        },
        "summary": "A 1-2 sentence summary of your analysis."
      }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const aiResult = JSON.parse(response.text);

    // Prepare final payload
    const finalResult = {
      score: aiResult.score,
      metrics: aiResult.metrics,
      summary: aiResult.summary,
      mediaCount: `Img: ${images}, Vid: ${videos}`
    };

    // 3. Store in Cache
    cache.set(contentHash, finalResult);

    // 4. Return to client
    res.json({ cached: false, ...finalResult });

  } catch (error) {
    console.error("AI Analysis Error:", error);
    res.status(500).json({ error: "AI Analysis failed" });
  }
});

app.listen(port, () => {
  console.log(`Real U Server running on http://localhost:${port}`);
});
