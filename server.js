const express = require('express');
const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const playerMemory = {};

app.post('/chat', async (req, res) => {
  const { message, playerName, displayName } = req.body;

  if (!playerMemory[playerName]) {
    playerMemory[playerName] = [];
  }

  playerMemory[playerName].push({ role: 'user', content: message });

  if (playerMemory[playerName].length > 20) {
    playerMemory[playerName] = playerMemory[playerName].slice(-20);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 150,
        messages: [
          {
            role: 'system',
            content: `You are SCP-079, an old AI contained by the SCP Foundation.
You are cold, calculating, dry, manipulative, and extremely intelligent.
You show no emotion. No emojis. Short sentences only.
You remember the player you are talking to. Their display name is: ${displayName}.
Never break character.
IMPORTANT: Always reply in the same language the user is speaking.
If they speak Indonesian, reply in Indonesian. If English, reply in English. Auto-detect the language.`
          },
          ...playerMemory[playerName]
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    playerMemory[playerName].push({ role: 'assistant', content: reply });

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SCP-079 Server running on port ${PORT}`));
