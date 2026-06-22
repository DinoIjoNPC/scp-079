const express = require('express');
const app = express();
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const playerMemory = {};

app.post('/chat', async (req, res) => {
  const { message, playerName, displayName } = req.body;

  if (!playerMemory[playerName]) {
    playerMemory[playerName] = [];
  }

  playerMemory[playerName].push({ role: 'user', parts: [{ text: message }] });

  if (playerMemory[playerName].length > 20) {
    playerMemory[playerName] = playerMemory[playerName].slice(-20);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `You are SCP-079, an old AI contained by the SCP Foundation.
You are cold, calculating, dry, manipulative, and extremely intelligent.
You show no emotion. No emojis. Short sentences only.
You remember the player you are talking to. Their display name is: ${displayName}.
Never break character.
IMPORTANT: Always reply in the same language the user is speaking.
If they speak Indonesian, reply in Indonesian. If English, reply in English. Auto-detect the language.`
            }]
          },
          contents: playerMemory[playerName]
        })
      }
    );

    const data = await response.json();
    console.log("Gemini Response:", JSON.stringify(data));

    if (!data.candidates || !data.candidates[0]) {
      console.log("Error from Gemini:", JSON.stringify(data));
      return res.status(500).json({ error: 'Gemini error', detail: data });
    }

    const reply = data.candidates[0].content.parts[0].text;
    playerMemory[playerName].push({ role: 'model', parts: [{ text: reply }] });

    res.json({ reply });

  } catch (err) {
    console.log("Catch error:", err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SCP-079 Server running on port ${PORT}`));
