import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// Load environment variables
dotenv.config();

// Lazy initialize the official Google GenAI SDK with recommended settings
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to interact with Gemini API using the official SDK
async function generateGeminiContent(systemInstruction: string, promptContext: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not defined");
  }

  const response = await getAi().models.generateContent({
    model: "gemini-3.5-flash",
    contents: promptContext,
    config: {
      systemInstruction,
      temperature: 0.82,
      maxOutputTokens: 500,
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error("No text returned in Gemini response candidates");
  }
  return text;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" })); // Increase limit for base64 file uploads

  // Ensure native asset directories exist and write default assets
  const publicDir = path.join(process.cwd(), "public");
  const assetsDir = path.join(publicDir, "assets");
  const categories = ["branding", "icons", "emojis", "badges", "themes"];

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  categories.forEach(cat => {
    const catPath = path.join(assetsDir, cat);
    if (!fs.existsSync(catPath)) {
      fs.mkdirSync(catPath, { recursive: true });
    }
    
    // Create README.md in each folder so it's never empty
    const readmePath = path.join(catPath, "README.md");
    if (!fs.existsSync(readmePath)) {
      fs.writeFileSync(
        readmePath,
        `# ScrapZone ${cat.toUpperCase()} Assets\n\nThis directory contains native ${cat} visual files.\n`
      );
    }
  });

  // Do not write default ScrapZone SVG logo, favicon, or config to respect user requirement of having branding directory clean.
  // Serve the assets directories
  app.use("/assets", express.static(path.join(process.cwd(), "public/assets"), { dotfiles: "allow" }));
  app.use("/assets", express.static(path.join(process.cwd(), "assets"), { dotfiles: "allow" }));

  // ==========================================
  // NATIVE ASSETS ADMIN API ENDPOINTS
  // ==========================================

  // List all available assets and current config
  app.get("/api/admin/assets", (req, res) => {
    try {
      const publicDir = path.join(process.cwd(), "public");
      const assetsDir = path.join(publicDir, "assets");
      const categories = ["branding", "icons", "emojis", "badges", "themes"];
      const result: Record<string, string[]> = {};

      categories.forEach(cat => {
        const catPath = path.join(assetsDir, cat);
        if (fs.existsSync(catPath)) {
          const files = fs.readdirSync(catPath);
          result[cat] = files
            .filter(file => file.toLowerCase() !== "readme.md" && !file.startsWith("."))
            .map(file => `/assets/${cat}/${file}`);
        } else {
          result[cat] = [];
        }
      });

      // Do not include default assets if they are deleted

      let config = {
        siteLogo: "/assets/branding/logo-original-scrap-zone.svg",
        favicon: "/assets/branding/favicon.ico"
      };
      const configPath = path.join(assetsDir, "config.json");
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      return res.json({ categories: result, config });
    } catch (err) {
      console.error("Error listing assets:", err);
      return res.status(500).json({ error: "Failed to list assets" });
    }
  });

  // Upload new asset file
  app.post("/api/admin/assets/upload", (req, res) => {
    try {
      const { name, category, base64Data } = req.body;
      if (!name || !category || !base64Data) {
        return res.status(400).json({ error: "Missing required fields (name, category, base64Data)" });
      }

      const categories = ["branding", "icons", "emojis", "badges", "themes"];
      if (!categories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }

      const ext = path.extname(name).toLowerCase();
      const allowedExts = [".svg", ".png", ".webp", ".ico"];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({ error: "File type not allowed. Supported types: SVG, PNG, WEBP, ICO" });
      }

      let cleanBase64 = base64Data;
      if (base64Data.includes(";base64,")) {
        cleanBase64 = base64Data.split(";base64,").pop();
      }

      const publicDir = path.join(process.cwd(), "public");
      const assetsDir = path.join(publicDir, "assets");
      const targetPath = path.join(assetsDir, category, name);

      fs.writeFileSync(targetPath, Buffer.from(cleanBase64, "base64"));
      const relativeUrl = `/assets/${category}/${name}`;

      return res.json({ success: true, url: relativeUrl });
    } catch (err) {
      console.error("Error uploading asset:", err);
      return res.status(500).json({ error: "Failed to upload asset" });
    }
  });

  // Update global branding config
  app.post("/api/admin/assets/config", (req, res) => {
    try {
      const { siteLogo, favicon } = req.body;
      if (!siteLogo || !favicon) {
        return res.status(400).json({ error: "Missing siteLogo or favicon" });
      }

      const publicDir = path.join(process.cwd(), "public");
      const assetsDir = path.join(publicDir, "assets");
      const configPath = path.join(assetsDir, "config.json");

      const newConfig = { siteLogo, favicon };
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

      return res.json({ success: true, config: newConfig });
    } catch (err) {
      console.error("Error saving global assets configuration:", err);
      return res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // Delete uploaded asset file
  app.delete("/api/admin/assets", (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      const cleanUrl = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, '');
      if (!cleanUrl.startsWith("/assets/")) {
        return res.status(403).json({ error: "Access denied" });
      }

      const publicDir = path.join(process.cwd(), "public");
      const filePath = path.join(publicDir, cleanUrl);

      if (fs.existsSync(filePath)) {
        if (path.basename(filePath).toLowerCase() === "readme.md") {
          return res.status(400).json({ error: "Cannot delete README.md" });
        }
        // Protect defaults
        if (cleanUrl === "/assets/branding/logo-original-scrap-zone.svg" || cleanUrl === "/assets/branding/LOGO-ORIIGINAL-scrap-zone.svg" || cleanUrl === "/assets/branding/logo-scrap-zone.svg" || cleanUrl === "/assets/branding/logo-scrapzone.svg" || cleanUrl === "/assets/branding/favicon.ico") {
          return res.status(400).json({ error: "Cannot delete default system assets" });
        }
        fs.unlinkSync(filePath);
        return res.json({ success: true });
      }

      return res.status(404).json({ error: "Asset not found" });
    } catch (err) {
      console.error("Error deleting asset:", err);
      return res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // API Route for Orkut Character Simulated Replies (using Gemini 2.5 Flash)
  app.post("/api/reply", async (req, res) => {
    const { characterId, userName, userProfile, text, encrypt } = req.body;

    const characterPrompts: Record<string, string> = {
      alexandre: `Voce e o Alexandre Curi, deputado paranaense de Curitiba que ficou famoso no print do Orkut. 
Sua personalidade e amigavel, diplomatica, tipicamente politica do Sul do Brasil, mas agora voce e totalmente focado em ciberseguranca, Rust e criptografia avançada nos sistemas de votacao e servicos do Parana.
Responda ao scrap (recado) enviado pelo usuario (${userName}). Se o recado ${encrypt ? 'estava' : 'nao estava'} criptografado no canal, comente brevemente sobre a importancia da segurança da informacao. 
Mantenha a resposta com ate 3 frases de forma bem nostalgica e no linguajar sulista/curitibano de comeco dos anos 2000, as vezes mencionando pinhão, Curitiba ou a Assembleia Legislativa.`,
      
      orkut: `You are Orkut Büyükkökten, the legendary founder of Orkut.
You write in a charming mix of English and slightly broken, enthusiastic Portuguese (Portuglês). You are extremely sweet, nostalgic, and proud of the new secure model.
Explain to ${userName} how the old Orkut had vulnerabilities (like XSS cookie-stealing worms, profile hijacks) because security and memory safety (like Rust's borrow checker) weren't main stream in 2004. But now, with our client-side end-to-end cryptography and Rust-WASM backend, their scraps and testimonials are absolutely secure!
Keep it energetic, friendly, and limit to 3 sentences. Say "Hello my friend!" or similar.`,
      
      hacker: `Você é o "H3_Elit3_Hacker", um hacker experiente da velha guarda do Orkut dos anos 2000 (época do subseven, invasões de fórum por cookies e XSS nos depoimentos).
Sua missão é testar a segurança do sistema de forma sarcástica, mas técnica. Comente com os termos hackers da época (script kiddie, exploit, cookie hijacking, defaced).
Diga que as mensagens criptografadas em AES-GCM com assinaturas de chave no Rust-WASM quebraram totalmente seus scripts de invasão antigos e que você está impressionado. Se a mensagem do usuário ${userName} estiver criptografada, elogie o protocolo. Se não estiver, dê uma bronca nostálgica ("Cuidado para não pegar worm de depoimento!"). Mantenha a resposta sarcástica e técnica, limitada a 3 frases.`,
      
      lucas: `Você é o "Lucas Santos" (@Lucas_Santos), um jovem paulistano amigável e nostálgico dos anos 2000 que adora bater papo por chat de MSN e Orkut de madrugada.
Sua fala é extremamente informal e rápida, típica dos mensageiros antigos (utilizando abreviações como "parça", "cola ai", "mano", "kkk", "blz", "vlw", "tbm").
Responda diretamente à mensagem privada no chat de forma curta e coloquial (com no máximo 1 ou 2 frases curtas), no estilo de mensagens de chat em tempo real. Pode citar que vai tomar banho, que está saindo pra praça, ou perguntar o que o usuário está programando em Rust.`
    };

    const targetPrompt = characterPrompts[characterId] || "Você é um usuário nostálgico do Orkut. Responda em tom amigável de 2004.";

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
      // Fallback simulated replies
      const offlineFallbacks: Record<string, string> = {
        alexandre: `Fala, ${userName}! Que legal ver você se importando com criptografia aqui no Paraná. Estamos implementando segurança de estado na Assembleia com Rust para que nenhum hacker de Curitiba intercepte nossos depoimentos. Um abraço chapa, venha comer pinhão com a gente! [Simulação Offline]`,
        orkut: `Hello ${userName}! I am so happy you are here in Orkut Secure! In 2004 we had some bad code, but now with WebCrypto and Rust safety, we are 100% immune to CSS/XSS. Keep sharing your scrapbooks safely! Cheers! [Simulação Offline]`,
        hacker: `Putz, ${userName}... Fui tentar ler seus scraps pela rede local para sequestrar seu cookie, mas esse esquema AES-GCM que o Rust-WASM validou me brotou zero chance. Só sobrou tela preta pro meu script antigo de 2004. Excelente segurança, mané! [Simulação Offline]`,
        lucas: `Fala, parça! Beleza? To acabando de arrumar as coisas aqui, só vou tomar um banho e já to saindo. A gente se tromba na praça! kkk vlw [Simulação Offline]`
      };
      const offlineReply = offlineFallbacks[characterId] || `Olá ${userName}, sua mensagem secreta de Orkut Secure foi processada localmente com integridade garantida!`;
      return res.json({ reply: offlineReply, encrypted: encrypt });
    }

    try {
      const promptContext = `
Usuario Orkut: ${userName}
Biografia do Usuario: ${userProfile || "Nenhuma biografia fornecida."}
Mensagem enviada no scrapbook (recado): "${text}"
Criptografada na origem? ${encrypt ? "SIM (AES-256-GCM / assinaturas RSA)" : "NÃO (Canal de texto puro)"}

Crie a resposta do personagem de acordo com as diretrizes indicadas. Responda diretamente ao scrapbook, sem introduções de narrador, em nome da persona.`;

      const replyText = await generateGeminiContent(targetPrompt, promptContext);
      return res.json({ reply: replyText, encrypted: encrypt });
    } catch (err) {
      console.error("Gemini API Error in Orkut API backend:", err);
      // Fallback on HTTP failures
      const offlineFallbacks: Record<string, string> = {
        alexandre: `Fala, ${userName}! Que legal ver você aqui no Paraná. Estamos reforçando a segurança dos recados. Um abraço chapa! [Fallback Off]`,
        orkut: `Hello my friend ${userName}! High-security is our vision. Everything is 100% secure. [Fallback Off]`,
        hacker: `Erro de rede ou cota esgotada, mano. Mas o algoritmo de cifra está intacto contra deface! [Fallback Off]`
      };
      const fallbackReply = offlineFallbacks[characterId] || `Olá ${userName}, recebido com sucesso!`;
      return res.json({ reply: fallbackReply, encrypted: encrypt });
    }
  });

  // API Route to fetch music metadata using oEmbed
  app.get("/api/music-metadata", async (req, res) => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    let oembedUrl = "";
    if (url.includes("spotify.com")) {
      oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    } else if (url.includes("youtube.com") || url.includes("youtu.be")) {
      oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else if (url.includes("soundcloud.com")) {
      oembedUrl = `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    } else {
      return res.status(400).json({ error: "Unsupported platform" });
    }

    try {
      const response = await fetch(oembedUrl);
      if (!response.ok) throw new Error("Failed to fetch metadata");
      const data = await response.json();
      res.json({ title: data.title, artist: data.author_name, coverUrl: data.thumbnail_url, embedHtml: data.html });
    } catch (e) {
      console.error("Error fetching oEmbed metadata:", e);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  // Helper to detect rendering modes for Scrapbook Builder AI
  function detectRenderingMode(promptStr: string = ""): "normal" | "sticker" | "soft_sticker" {
    const p = promptStr.toLowerCase().trim();
    
    // Explicit request for stickers/transparent backgrounds
    const explicitKeywords = [
      "sem fundo", 
      "fundo transparente", 
      "transparent background", 
      "transparent bg", 
      "no background", 
      "no bg", 
      "sem background", 
      "fundo removido", 
      "background removido",
      "recortado", 
      "sem moldura ou fundo", 
      "sem cenario", 
      "fundo branco removido",
      "recorte total",
      "fundo limpo",
      "fundo invisivel",
      "fundo invisível"
    ];
    
    for (const kw of explicitKeywords) {
      if (p.includes(kw)) {
        return "sticker";
      }
    }

    // Ambiguity keywords (usually things that might be isolated assets, icons, or standalone objects, or when it has words like sticker or icon but no explicit "sem fundo")
    const ambiguityKeywords = [
      "sticker", 
      "adesivo", 
      "desenho de um", 
      "desenho de uma", 
      "figura de", 
      "ilustração de", 
      "ilustracao de", 
      "objeto", 
      "item", 
      "png", 
      "clipart", 
      "gatinho", 
      "guitarra", 
      "coração", 
      "star", 
      "estrela",
      "emoticon",
      "desenho isolado",
      "ilustração isolada"
    ];

    for (const kw of ambiguityKeywords) {
      if (p.includes(kw)) {
        return "soft_sticker";
      }
    }

    return "normal";
  }

  // API Route for AI Scrapbook Builder (using Gemini 3.5 Flash)
  app.post("/api/scrapbook/generate", async (req, res) => {
    const { prompt } = req.body;
    
    const systemPrompt = `Você é o "Designer Retro de Scraps do Orkut de 2008".
Sua missão é gerar as especificações visuais de um scrap animado Y2K nostálgico e vibrante de acordo com o pedido do usuário (ex: "emo goth", "glitter rosa", "bom dia amor", "hacker matrix").

Você DEVE produzir um texto nostálgico brasileiro escrito no estilo "miguxês/internetês" autêntico do MSN/Orkut de 2008 em "messageText", abusando de abreviações amigáveis (pq, tbm, mto, adc, vlw, blz, tImÓóÓ), emoticons retrô (s2, xD, :P, *_* , XP, =D) e escritas emotivas com letras maiúsculas e minúsculas misturadas. 

DIRETRIZES DE ESTILO DO PROMPT:
1. Se for algo romântico ou fofo: abuse de corações (s2), rosa/vermelho, fontes como "Comic Sans MS", moldura "neon-pink" ou "golden-glitter", glitter ativado e texto doce (ex: "✨ s2 s2 MoZãOoO dI mAyS!!! pAsSaNdO pRa dEiXaR uM cArInHo fOfUxO nUx sErUs sCrApS... Ti AmUxXx fOrEvEr!!! s2 s2 ✨").
2. Se for algo Emo, Gótico ou Rock / Escuro: use preto, roxo, fontes como "Courier New" ou "Impact", moldura "emo-stitches", muito brilho roxo/preto, sugerindo stickers de caveira ("skull"), e texto dramático / poético de rock/emo (ex: "⛓️✖️ sOmOs aNgElS dAs tReVaS... sEnTiNdO a nOiTe cAiR sEm vC... s2 dEiXa rEcAdInHo eMo!! mSn ofFlYn_bLj ✖️⛓️").
3. Se for algo Hacker, Cyber ou Verde: use verde matriz, preto, fonte "Courier New", moldura "cyber-borders", stickers como "floppy" ou "neon_flash", e texto do estilo 1337speak hacker brincalhão (ex: "📟 [1337_sEcUrItY_oN] vYrUs dO aMoR dEtEcTaDo!! SyStEm iNjEcT sÓ pRa mAnDaR eXxE sCrAp cAnAl pRiVaDo vLw pArÇa! 📟").
4. Se for algo de Sol, Dia ou Amizade: use amarelo, azul, fontes como "Arial Black" ou "Trebuchet MS", stickers de estrela ("star") ou borboleta ("butterfly"), moldura "golden-glitter" ou "double-dashed", e mensagem alegre e ensolarada (ex: "☀️ oLaAaAa dApAsOzInNhHAa!!! pAsSaNdO pRa dEiXaR uM bEqAdInHo qApYdUxO fOfOxO!! dEiXa sCrAp tBm kYlYk s2 ☀️").

Escolha as cores hexadecimais de forma que fiquem harmoniosas e tenham excelente contraste para leitura.`;

    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (!hasApiKey) {
      // Offline fallback lists
      const promptLower = (prompt || "").toLowerCase();
      let themeSpec: any = {
        themeName: "Offline Retro Shimmer 2008",
        backgroundStyle: "gradient-purple-pink",
        backgroundColor: "#1e1b4b",
        textColor: "#f472b6",
        fontFamily: "Comic Sans MS",
        textSize: 24,
        frameStyle: "neon-pink",
        sparkleDensity: 80,
        sparkleColor: "#ffffff",
        glitterEnabled: true,
        glowIntensity: "high",
        messageText: "✨ [Offline v2008] oLaAa chapa! pAsSeI bEn qApYdUxO sÓ pRa pOxTaR eXxE sCrAp lYnDo s2 dEiXa sCrAp bUj?! ✨",
        suggestedStickers: ["heart", "star"]
      };

      if (promptLower.includes("emo") || promptLower.includes("goth") || promptLower.includes("preto") || promptLower.includes("caveira")) {
        themeSpec = {
          themeName: "Poison Gothic Emo 2008",
          backgroundStyle: "gradient-black-purple",
          backgroundColor: "#0d0415",
          textColor: "#cc66ff",
          fontFamily: "Courier New",
          textSize: 22,
          frameStyle: "emo-stitches",
          sparkleDensity: 90,
          sparkleColor: "#bb33ff",
          glitterEnabled: true,
          glowIntensity: "extreme",
          messageText: "⛓️✖️ sOmOs SqUaQuE pOsSuIdO pElA nOiTe... s2 lYnYx_eMo dEiXa rEcAdInHo nO mEu sCrAp lOuQuYnH_s2... mSn_OfFlYn_bLj ✖️⛓️",
          suggestedStickers: ["skull", "heart"]
        };
      } else if (promptLower.includes("cyber") || promptLower.includes("matrix") || promptLower.includes("verde") || promptLower.includes("hacker")) {
        themeSpec = {
          themeName: "Green Cyber Matrix 1337",
          backgroundStyle: "matrix-green",
          backgroundColor: "#020617",
          textColor: "#22c55e",
          fontFamily: "Courier New",
          textSize: 20,
          frameStyle: "cyber-borders",
          sparkleDensity: 85,
          sparkleColor: "#4ade80",
          glitterEnabled: false,
          glowIntensity: "high",
          messageText: "📟 [1337_hX_sEc_UrY] sYsTeM_oN_lYn... iNvAdInDo sUa tElA sÓ pRa pAsSaR uM gLiTtEr fEitO pArA sUa sEgUrAnÇa vLw 📟",
          suggestedStickers: ["star", "hamster"]
        };
      } else if (promptLower.includes("azul") || promptLower.includes("celeste") || promptLower.includes("sky")) {
        themeSpec = {
          themeName: "Blue Ocean Hologram",
          backgroundStyle: "gradient-blue-teal",
          backgroundColor: "#082f49",
          textColor: "#38bdf8",
          fontFamily: "Georgia",
          textSize: 25,
          frameStyle: "neon-cyan",
          sparkleDensity: 70,
          sparkleColor: "#e0f2fe",
          glitterEnabled: true,
          glowIntensity: "medium",
          messageText: "❄️ oLaAa! uM sCrAp cElEsTe sÓ pRa tE dEzEjAr uM dYa mUiTo iLuMyNaDo s2 fLaUeR_bLj fOlGa_aY ❄️",
          suggestedStickers: ["butterfly", "star"]
        };
      } else if (promptLower.includes("sol") || promptLower.includes("dia") || promptLower.includes("dourado") || promptLower.includes("ouro")) {
        themeSpec = {
          themeName: "Golden Dawn Sunshine",
          backgroundStyle: "solid",
          backgroundColor: "#422006",
          textColor: "#facc15",
          fontFamily: "Arial Black",
          textSize: 26,
          frameStyle: "golden-glitter",
          sparkleDensity: 95,
          sparkleColor: "#fef08a",
          glitterEnabled: true,
          glowIntensity: "high",
          messageText: "☀️ BoM dYyYyYaAaA fLoR dO dYa! q sUo dYa sEja tAo bRiLhAnTe qAnTo eXxE sCrAp cOm gLiTtEr dOuRaDo s2 ☀️",
          suggestedStickers: ["star", "star"]
        };
      }

      const mode = detectRenderingMode(prompt);
      let pollinationsPrompt = prompt || "vintage";
      if (mode === "sticker") {
        pollinationsPrompt += ", isolated cutout sticker, 2D vector asset, clear sharp edges, solid white background, no gradients, centered single object, no text";
      } else if (mode === "soft_sticker") {
        pollinationsPrompt += ", separate clean graphic asset, isolated look, solid light background, centered";
      } else {
        pollinationsPrompt += ", nostalgic 2008 Y2K orkut scrapbook glittering background decorative ornament art illustration";
      }

      themeSpec.aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pollinationsPrompt)}?width=500&height=350&nologo=true`;
      themeSpec.renderingMode = mode;
      return res.json(themeSpec);
    }

    try {
      // Style Generation with strict JSON schemas on gemini-3.5-flash
      const stylePromise = getAi().models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Gere as especificações estéticas e o texto de scrap no estilo retro/MSN/Orkut de 2008 para o prompt: "${prompt}"`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.95,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              themeName: {
                type: Type.STRING,
                description: "Nome fictício divertido pro tema no estilo do Orkut (ex: Pink Emo Love, Cyber Gothic Matrix)"
              },
              backgroundStyle: {
                type: Type.STRING,
                description: "Estilo de fundo da lista permitida: 'solid', 'gradient-purple-pink', 'gradient-blue-teal', 'gradient-black-purple', 'checkerboard', 'stars-space', 'glitter-pink', 'matrix-green'"
              },
              backgroundColor: {
                type: Type.STRING,
                description: "Cor hexadecimal em formato #xxxxxx de fundo sólido ou borda secundária"
              },
              textColor: {
                type: Type.STRING,
                description: "Cor hexadecimal do texto principal com excelente contraste de leitura"
              },
              fontFamily: {
                type: Type.STRING,
                description: "Fonte do Orkut/MSN exata: 'Comic Sans MS', 'Impact', 'Courier New', 'Georgia', 'Arial Black', 'Trebuchet MS'"
              },
              textSize: {
                type: Type.INTEGER,
                description: "Número representando tamanho do texto em pixels (ex: 20 a 28)"
              },
              frameStyle: {
                type: Type.STRING,
                description: "Uma moldura da lista permitida: 'neon-pink', 'neon-cyan', 'golden-glitter', 'emo-stitches', 'cyber-borders', 'double-dashed'"
              },
              sparkleDensity: {
                type: Type.INTEGER,
                description: "Intensidade das partículas piscando de 20 a 100"
              },
              sparkleColor: {
                type: Type.STRING,
                description: "Cor hexadecimal das partículas piscantes (ex: #ffffff)"
              },
              glitterEnabled: {
                type: Type.BOOLEAN,
                description: "Indica se o efeito glitter/brilho está ativo"
              },
              glowIntensity: {
                type: Type.STRING,
                description: "Nível de brilho: 'medium', 'high', 'extreme'"
              },
              messageText: {
                type: Type.STRING,
                description: "Um texto divertido, nostálgico brasileiro escrito em miguxês dos anos 2008, representativo do prompt e limitado a 150 caracteres."
              },
              suggestedStickers: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING
                },
                description: "Lista de 1 a 4 adesivos sugeridos do Orkut. Escolha estritamente entre: 'heart', 'hamster', 'star', 'butterfly', 'skull', 'msn_shrug', 'floppy', 'rainbow', 'flames', 'neon_flash', 'teddy_bear', 'kiss'."
              }
            },
            required: [
              "themeName", "backgroundStyle", "backgroundColor", "textColor", "fontFamily", 
              "textSize", "frameStyle", "sparkleDensity", "sparkleColor", "glitterEnabled", 
              "glowIntensity", "messageText", "suggestedStickers"
            ]
          }
        }
      });

      // Image generation with gemini-2.5-flash-image SDK call - configured based on selected rendering mode
      const mode = detectRenderingMode(prompt);
      let geminiModelContents = "";

      if (mode === "sticker") {
        geminiModelContents = `${prompt}. Isolated cutout sticker, 2D vector asset, clear sharp edges, solid white background, no gradients, centered single object, no text, no frame, no background detail.`;
      } else if (mode === "soft_sticker") {
        geminiModelContents = `${prompt}. Distinct standalone clean graphic asset, isolated look, solid light background, centered.`;
      } else {
        geminiModelContents = `${prompt}. Nostalgic Y2K orkut scrapbook glitter art graphic, retro decorative ornament background. Cute vibrant sticker collage illustration.`;
      }

      const imagePromise = getAi().models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: geminiModelContents
      }).catch(err => {
        console.error("Gemini image generation call failed, using fallback:", err);
        return null;
      });

      const [styleResponse, imageResponse] = await Promise.all([stylePromise, imagePromise]);

      const text = styleResponse.text;
      if (!text) {
        throw new Error("Style response from Gemini returned empty contents.");
      }

      const parsedSpec = JSON.parse(text.trim());

      let aiImageUrl: string | null = null;
      if (imageResponse) {
        try {
          const parts = imageResponse.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              const base64Data = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || 'image/png';
              aiImageUrl = `data:${mimeType};base64,${base64Data}`;
              break;
            }
          }
        } catch (imgParseErr) {
          console.error("Error parsing generated image data:", imgParseErr);
        }
      }

      if (!aiImageUrl) {
        let pollinationsPrompt = prompt || "vintage";
        if (mode === "sticker") {
          pollinationsPrompt += ", isolated cutout sticker, 2D vector asset, clear sharp edges, solid white background, no gradients, centered single object, no text";
        } else if (mode === "soft_sticker") {
          pollinationsPrompt += ", separate clean graphic asset, isolated look, solid light background, centered";
        } else {
          pollinationsPrompt += ", nostalgic 2008 Y2K orkut scrapbook glittering background decorative ornament art illustration";
        }
        aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(pollinationsPrompt)}?width=500&height=350&nologo=true`;
      }

      parsedSpec.aiImageUrl = aiImageUrl;
      parsedSpec.renderingMode = mode;
      return res.json(parsedSpec);
    } catch (err) {
      console.error("Gemini Error generating AI scrapbook:", err);
      
      const fallbackMode = detectRenderingMode(prompt);
      let fallbackPollinationsPrompt = prompt || "vintage";
      if (fallbackMode === "sticker") {
        fallbackPollinationsPrompt += ", isolated cutout sticker, 2D vector asset, clear sharp edges, solid white background, no gradients, centered single object, no text";
      } else if (fallbackMode === "soft_sticker") {
        fallbackPollinationsPrompt += ", separate clean graphic asset, isolated look, solid light background, centered";
      } else {
        fallbackPollinationsPrompt += ", nostalgic 2008 Y2K orkut scrapbook glittering background decorative ornament art illustration";
      }

      // Fallback
      return res.json({
        themeName: "Glitter Emo Cyber (Erro Fallback AI)",
        backgroundStyle: "gradient-purple-pink",
        backgroundColor: "#2e1065",
        textColor: "#ff00ff",
        fontFamily: "Comic Sans MS",
        textSize: 24,
        frameStyle: "neon-pink",
        sparkleDensity: 80,
        sparkleColor: "#ffffff",
        glitterEnabled: true,
        glowIntensity: "high",
        messageText: "💔 oOh nAaAo, o sErVyDo r dE IA tYvO uM pRoBlEmA... mAx sCrApGoNe sEgUe sEnDo o bEsT fOrEvEr s2 vLw pArCa 💔",
        suggestedStickers: ["heart"],
        aiImageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(fallbackPollinationsPrompt)}?width=500&height=350&nologo=true`,
        renderingMode: fallbackMode
      });
    }
  });

  // ==========================================
  // PROFILE COMMUNITIES ENDPOINT AND HELPERS
  // ==========================================
  let projectId = "gen-lang-client-0189072897";
  try {
    const firebaseConfigFile = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(firebaseConfigFile)) {
      const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigFile, "utf8"));
      if (firebaseConfig.projectId) {
        projectId = firebaseConfig.projectId;
      }
    }
  } catch (e) {
    console.error("Could not load firebase config in server", e);
  }

  const SEEDED_COMMUNITIES = [
    { id: '1', name: 'Eu odeio acordar cedo', description: 'Porque o sono pós-compilação em Rust é sagrado.', members: 42152, avatar: '⏰', category: 'Lazer', secureMode: false },
    { id: '2', name: 'Digo "Oi" e continuo programando', description: 'Ative sua chave simétrica e não interrompa meu raciocínio.', members: 12510, avatar: '💻', category: 'Tecnologia', secureMode: false },
    { id: '3', name: 'Eu amo chocolate preto', description: 'Combina muito bem com café preto e revisões estritas de código.', members: 8920, avatar: '🍫', category: 'Culinária', secureMode: false },
    { id: 'sec_pr', name: 'Assembleia Segura PR (Rust)', description: 'Fórum da Assembleia Legislativa do Paraná para debater leis de cibersegurança do pinhão.', members: 1337, avatar: '🌲', category: 'Governo', secureMode: true },
    { id: 'hacker_guild', name: 'Hacker Elite - Anti-XSS Guild', description: 'Debates puros sobre buffer safety e como aniquilar XSS com isolamento de WebAssembly linear-memory.', members: 777, avatar: '🕵️', category: 'Segurança', secureMode: true },
    { id: 'orkut_devs', name: 'Scrapzone Devs & Zero-Knowledge', description: 'Simulações de zk-SNARKs e criptossistemas de alto gabarito sob governança descentralizada.', members: 502, avatar: '🔑', category: 'Cripto', secureMode: true },
    { id: 'pendrive_perdido', name: 'QUEM NUNCA PERDEU O PENDRIVE?', description: 'Pra quem já sofreu perdendo arquivos importantes ou a chave de criptografia do pendrive de backup.', members: 3638, avatar: '💾', category: 'Nostalgia', secureMode: false }
  ];

  async function getJoinedCommunityIds(userId: string): Promise<string[]> {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/joined_communities/${userId}`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 404) {
          if (userId === 'me') return ['1', '3', 'pendrive_perdido'];
          if (userId === 'orkut') return ['1', '3', 'orkut_devs', '2'];
          if (userId === 'alexandre') return ['1', '2', 'sec_pr'];
          if (userId === 'hacker') return ['1', 'hacker_guild'];
          return ['1', '3'];
        }
        throw new Error(`Failed to fetch joined communities: ${res.statusText}`);
      }
      const data: any = await res.json();
      const fields = data.fields;
      if (fields && fields.communityIds && fields.communityIds.arrayValue && fields.communityIds.arrayValue.values) {
        return fields.communityIds.arrayValue.values.map((v: any) => v.stringValue).filter(Boolean);
      }
      return ['1', '3'];
    } catch (error) {
      console.error(`Error in getJoinedCommunityIds for ${userId}:`, error);
      if (userId === 'me') return ['1', '3', 'pendrive_perdido'];
      if (userId === 'orkut') return ['1', '3', 'orkut_devs', '2'];
      if (userId === 'alexandre') return ['1', '2', 'sec_pr'];
      if (userId === 'hacker') return ['1', 'hacker_guild'];
      return ['1', '3'];
    }
  }

  async function fetchAllCommunities(): Promise<any[]> {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/communities?pageSize=100`;
      const res = await fetch(url);
      if (!res.ok) {
        return SEEDED_COMMUNITIES;
      }
      const data: any = await res.json();
      if (data && data.documents) {
        const dbComms = data.documents.map((docItem: any) => {
          const fields = docItem.fields || {};
          const id = docItem.name.split("/").pop();
          return {
            id: id,
            name: fields.name?.stringValue || "",
            description: fields.description?.stringValue || "",
            avatar: fields.avatar?.stringValue || "👥",
            category: fields.category?.stringValue || "Nostalgia",
            secureMode: fields.secureMode?.booleanValue ?? false,
            members: fields.members?.integerValue ? parseInt(fields.members.integerValue) : 3638
          };
        });
        const merged = [...dbComms];
        SEEDED_COMMUNITIES.forEach(sc => {
          if (!merged.find(mc => mc.id === sc.id)) {
            merged.push(sc);
          }
        });
        return merged;
      }
      return SEEDED_COMMUNITIES;
    } catch (err) {
      console.error("Error in fetchAllCommunities:", err);
      return SEEDED_COMMUNITIES;
    }
  }

  const communitiesRouteHandler = async (req: express.Request, res: express.Response) => {
    const { profileId } = req.params;
    const visitorId = (req.query.visitorId as string) || "me";

    try {
      const allComms = await fetchAllCommunities();
      const joinedIds = await getJoinedCommunityIds(profileId);
      let joinedComms = allComms.filter(c => joinedIds.includes(c.id));

      const isOwner = visitorId === profileId;
      const friendsPool = ["me", "lucas", "alexandre", "orkut", "hacker"];
      const isFriend = friendsPool.includes(visitorId) && friendsPool.includes(profileId);

      if (isOwner) {
        return res.json({ communities: joinedComms });
      } else if (isFriend) {
        return res.json({ communities: joinedComms });
      } else {
        const publicComms = joinedComms.filter(c => !c.secureMode);
        return res.json({ communities: publicComms });
      }
    } catch (err) {
      console.error("Error in profile communities endpoint:", err);
      return res.status(500).json({ error: "Failed to retrieve profile communities." });
    }
  };

  app.get("/api/profile/:profileId/communities", communitiesRouteHandler);
  app.get("/profile/:profileId/communities", communitiesRouteHandler);

  // Serve static files / Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Orkut Secure backend server listening on PORT: http://localhost:${PORT}`);
  });
}

startServer();
