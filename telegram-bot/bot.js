var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Bot } from "grammy";
import { config } from "dotenv";
import fetch from "node-fetch"; // Import fetch for HTTP requests
config(); // Load environment variables
// Set up the Telegram bot using the bot token from .env
const bot = new Bot(process.env.TELEGRAM_BOT_KEY);
// Start command - Welcomes the user
bot.command("start", (ctx) => {
    ctx.reply("Welcome to the Gaianet Bot! Ask me anything related to the Gaianet protocol.");
});
// Message handler for user queries
bot.on("message:text", (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const userMessage = ctx.message.text;
    try {
        // Call the Gaianet Gemma API via fetch
        const response = yield fetch(process.env.GAIA_LLM_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: "You are a knowledgeable assistant designed to answer questions strictly related to Gaianet, including its protocol, network architecture, nodes, APIs, and all public features. You have access to the official Gaianet documentation at https://docs.gaianet.ai/intro and general information at https://www.gaianet.ai/. Provide detailed, precise answers based on this information. If a question is unrelated to Gaianet, inform the user that you can only respond to questions about the Gaianet ecosystem."
                    },
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                model: "gemma"
            })
        });
        // Parse the response from Gemma
        const data = yield response.json();
        // Accessing the actual content inside the message object
        const gaiaResponse = data.choices[0].message.content;
        // Log the full response for debugging
        console.log(gaiaResponse);
        // Reply with the Gaianet LLM's response
        ctx.reply(gaiaResponse || "I couldn't find an answer for that.");
    }
    catch (error) {
        console.error("Error interacting with Gaianet LLM:", error);
        ctx.reply("There was an issue reaching Gaianet's knowledge base. Please try again later.");
    }
}));
// Start the bot and begin polling Telegram servers for updates
bot.start();