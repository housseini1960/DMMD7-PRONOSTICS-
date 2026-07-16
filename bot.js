const TelegramBot = require('node-telegram-bot-api');
const { Octokit } = require("@octokit/rest");

// Récupération des clés sécurisées de Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "housseini1960";
const REPO = "DMMD7-PRONOSTICS";

if (!TELEGRAM_TOKEN || !GITHUB_TOKEN) {
    console.error("❌ Erreur : Clés manquantes dans l'environnement !");
    process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const octokit = new Octokit({ auth: GITHUB_TOKEN });

console.log("🚀 Le robot s'est connecté avec succès à l'environnement Render !");

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Bonjour mon frère ! Je suis prêt. Envoie tes modifications ainsi :\n`/update Lundi | Équipe1 vs Équipe2 | Cote | Prono`", { parse_mode: "Markdown" });
});

bot.onText(/\/update (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const text = match[1];
    const parts = text.split('|').map(p => p.trim());

    if (parts.length < 4) {
        return bot.sendMessage(chatId, "❌ Format incorrect ! Utilise : Jour | Équipes | Cote | Prono");
    }

    const [jour, equipes, cote, prono] = parts;
    bot.sendMessage(chatId, "🔄 Connexion à GitHub... Modification de ton site en cours...");

    try {
        const { data: fileData } = await octokit.repos.getContent({
            owner: OWNER,
            repo: REPO,
            path: "index.html"
        });

        let content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        let modifie = false;

        if (jour.toLowerCase() === "lundi") {
            // Expression régulière pour cibler le premier match (Lundi)
            content = content.replace(/(<div class="card">[\s\S]*?<div class="teams">)(.*?)(<\/div>)/, `$1${equipes}$3`);
            content = content.replace(/(<span class="odds-blur">Cote : )(.*?)(<\/span>)/, `$1${cote}$3`);
            content = content.replace(/1:\s*".*?"/g, `1: "${prono}"`);
            modifie = true;
        }

        if (!modifie) {
            return bot.sendMessage(chatId, `❌ Désolé, le jour '${jour}' n'a pas été configuré ou reconnu.`);
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: OWNER,
            repo: REPO,
            path: "index.html",
            message: `🤖 Bot : Mise à jour automatique du ${jour}`,
            content: Buffer.from(content).toString('base64'),
            sha: fileData.sha
        });

        bot.sendMessage(chatId, `✅ Félicitations mon frère ! Le match du ${jour} a bien été modifié sur ton site.`);
    } catch (error) {
        bot.sendMessage(chatId, "❌ Erreur GitHub : " + error.message);
    }
});
  
