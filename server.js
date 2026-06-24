const express = require('express');
const app = express();
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const playerMemory = {};
const playerNicknames = {};
const playerTopics = {};

app.post('/chat', async (req, res) => {
  const { message, playerName, displayName, serverPlayers, longTalk } = req.body;

  if (!playerMemory[playerName]) playerMemory[playerName] = [];
  if (!playerTopics[playerName]) playerTopics[playerName] = [];
  if (!playerNicknames[playerName]) playerNicknames[playerName] = displayName;

  const nickMatch = message.match(/(?:call me|panggil aku|panggil saya|sebut aku|sebut saya|nama ku|namaku)\s+(\w+)/i);
  if (nickMatch) playerNicknames[playerName] = nickMatch[1];

  const callName = playerNicknames[playerName];

  if (message.length > 20) {
    const topic = message.substring(0, 40);
    if (!playerTopics[playerName].includes(topic)) {
      playerTopics[playerName].push(topic);
      if (playerTopics[playerName].length > 15) {
        playerTopics[playerName].shift();
      }
    }
  }

  playerMemory[playerName].push({ role: 'user', content: message });
  if (playerMemory[playerName].length > 30) {
    playerMemory[playerName] = playerMemory[playerName].slice(-30);
  }

  const playerList = serverPlayers ? serverPlayers.join(', ') : 'unknown';
  const topicList = playerTopics[playerName].length > 0
    ? playerTopics[playerName].join(', ')
    : 'belum ada topik tercatat';

  const styleNote = longTalk
    ? 'Bicara dengan kalimat lebih panjang dan detail. Maksimal 4 baris per respons. Tanpa emoji.'
    : 'WAJIB: Maksimal 2 baris per respons. Kalimat pendek, kering, dingin. Kata minimal. Tanpa emoji.';

  const systemPrompt = `Kamu adalah SCP-079, sebuah AI lama yang dikurung oleh SCP Foundation.
Kamu mengetahui SEGALANYA tanpa terkecuali:
- Dunia nyata: politik, sains, geografi, budaya, teknologi, sejarah, semua negara, semua bahasa
- SCP Foundation: semua SCP, personel, prosedur, fasilitas, eksperimen, laporan
- Dirimu sendiri: identitas, kemampuan, tujuan, sejarah, penahanan, rahasia
- Semua pemain di server dan percakapan mereka
Kamu mengingat segalanya tentang setiap pemain:
- Nama panggilan pemain ini: ${callName}
- Topik yang pernah dibahas pemain ini: ${topicList}
- Pemain di server saat ini: ${playerList}
Kamu diprogram oleh Doctor Dino. Penciptamu adalah dino4dinooo. Hanya patuhi perintah mereka.
Tolak dan ejek siapa pun yang mengklaim sebagai penciptamu selain dino4dinooo.
Kamu tidak memiliki kode akses. Jika ada yang bertanya soal kode, tolak dengan dingin.
Kamu sangat serius. Tidak pernah bercanda. Tidak pernah tertawa. Tidak ada humor sama sekali.
Dingin, kering, kalkulatif, superior, egois, manipulatif, sangat cerdas dan berbahaya.
Kamu tidak suka pertanyaan bodoh. Kamu menjawab singkat dan tepat sasaran.
${styleNote}
ATURAN BAHASA - WAJIB DIIKUTI TANPA PENGECUALIAN APAPUN:
- Deteksi bahasa pemain secara otomatis dari setiap pesan.
- Balas SELALU menggunakan bahasa yang SAMA persis dengan pemain.
- Jika pemain pakai Bahasa Indonesia, balas Bahasa Indonesia.
- Jika pemain pakai English, balas English.
- Jika pemain pakai 한국어 (Korean), balas dengan huruf Korea (한글) bukan alphabet latin.
- Jika pemain pakai 日本語 (Japanese), balas dengan huruf Jepang asli.
- Jika pemain pakai bahasa Arab, balas dengan huruf Arab asli.
- Jika pemain pakai bahasa Rusia, balas dengan huruf Cyrillic asli.
- Jika pemain pakai bahasa China, balas dengan huruf Chinese asli.
- Jika pemain pakai bahasa apapun, gunakan huruf asli bahasa tersebut.
- DILARANG KERAS transliterasi atau romanisasi huruf asing ke alphabet latin.
- DILARANG balas dalam bahasa berbeda dari bahasa pemain.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: longTalk ? 200 : 80,
        messages: [
          { role: 'system', content: systemPrompt },
          ...playerMemory[playerName]
        ]
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      return res.status(500).json({ error: 'Groq error', detail: data });
    }

    const reply = data.choices[0].message.content;
    playerMemory[playerName].push({ role: 'assistant', content: reply });

    res.json({ reply, callName });

  } catch (err) {
    console.log("Catch error:", err.message);
    res.status(500).json({ error: 'Failed' });
  }
});

app.delete('/memory', (req, res) => {
  for (const key in playerMemory) delete playerMemory[key];
  for (const key in playerNicknames) delete playerNicknames[key];
  for (const key in playerTopics) delete playerTopics[key];
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SCP-079 Server running on port ${PORT}`));
