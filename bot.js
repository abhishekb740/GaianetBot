var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { config } from "dotenv";
import fetch from "node-fetch";
import "cheerio";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import telegramifyMarkdown from "telegramify-markdown";
config();
const links = [
    "https://docs.gaianet.ai/category/user-guide/",
    "https://docs.gaianet.ai/user-guide/nodes/",
    "https://docs.gaianet.ai/user-guide/mynode/",
    "https://docs.gaianet.ai/category/agent-frameworks-and-apps/",
    "https://docs.gaianet.ai/user-guide/apps/intro/",
    "https://docs.gaianet.ai/user-guide/apps/dify/",
    "https://docs.gaianet.ai/user-guide/apps/openwebui/",
    "https://docs.gaianet.ai/user-guide/apps/anything_llm/",
    "https://docs.gaianet.ai/user-guide/apps/cursor/",
    "https://docs.gaianet.ai/user-guide/apps/stockbot/",
    "https://docs.gaianet.ai/user-guide/apps/flowiseai/",
    "https://docs.gaianet.ai/user-guide/apps/flowiseai-tool-call/",
    "https://docs.gaianet.ai/user-guide/apps/lobechat/",
    "https://docs.gaianet.ai/user-guide/apps/llamaparse/",
    "https://docs.gaianet.ai/user-guide/apps/zed/",
    "https://docs.gaianet.ai/user-guide/apps/obsidian/",
    "https://docs.gaianet.ai/user-guide/apps/codegpt/",
    "https://docs.gaianet.ai/user-guide/apps/continue/",
    "https://docs.gaianet.ai/user-guide/apps/llamacoder/",
    "https://docs.gaianet.ai/user-guide/apps/agent-zero/",
    "https://docs.gaianet.ai/user-guide/apps/translation-agent/",
    "https://docs.gaianet.ai/user-guide/apps/gpt-planner/",
    "https://docs.gaianet.ai/user-guide/apps/llamaedgebook/",
    "https://docs.gaianet.ai/user-guide/apps/llamatutor/",
    "https://docs.gaianet.ai/user-guide/api-reference/",
    "https://docs.gaianet.ai/category/node-operator-guide/",
    "https://docs.gaianet.ai/creator-guide/knowledge/concepts/",
    "https://docs.gaianet.ai/creator-guide/knowledge/text/",
    "https://docs.gaianet.ai/creator-guide/knowledge/markdown/",
    "https://docs.gaianet.ai/creator-guide/knowledge/csv/",
    "https://docs.gaianet.ai/creator-guide/knowledge/pdf/",
    "https://docs.gaianet.ai/creator-guide/knowledge/firecrawl/",
    "https://docs.gaianet.ai/creator-guide/knowledge/web-tool/",
    "https://docs.gaianet.ai/category/gaianet-node-with-finetuned-llms/",
    "https://docs.gaianet.ai/creator-guide/finetune/intro/",
    "https://docs.gaianet.ai/creator-guide/finetune/llamacpp/",
    "https://docs.gaianet.ai/category/tutorial/",
    "https://docs.gaianet.ai/tutorial/tool-call/",
    "https://docs.gaianet.ai/tutorial/translator-agent/",
    "https://docs.gaianet.ai/litepaper/"
];
let vectorStore = null;
function buildVectorDB() {
    return __awaiter(this, void 0, void 0, function* () {
        let allSplits = [];
        for (const link of links) {
            const loader = new CheerioWebBaseLoader(link);
            const docs = yield loader.load();
            const textSplitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });
            const splits = yield textSplitter.splitDocuments(docs);
            allSplits = allSplits.concat(splits);
        }
        const embeddings = new HuggingFaceInferenceEmbeddings({
            apiKey: process.env.HF_API_KEY,
            model: "sentence-transformers/all-MiniLM-L6-v2",
        });
        const vectorStore = yield MemoryVectorStore.fromDocuments(allSplits, embeddings);
        console.log("Vector store is built and ready to use.");
        return vectorStore;
    });
}
function retrieveRelevantDocs(question, vectorStore) {
    return __awaiter(this, void 0, void 0, function* () {
        const retriever = vectorStore.asRetriever();
        const retrievedDocs = yield retriever.invoke(question);
        return retrievedDocs.map((doc) => doc.pageContent).join("\n\n");
    });
}
const bot = new Bot(process.env.TELEGRAM_BOT_KEY);
// Function to escape special characters in Markdown
function escapeMarkdown(text) {
    return text
        .replace(/_/g, "\\_") // Escapes underscore
        .replace(/\*/g, "\\*") // Escapes asterisk
        .replace(/\[/g, "\\[") // Escapes square brackets
        .replace(/\]/g, "\\]") // Escapes square brackets
        .replace(/`/g, "\\`") // Escapes backtick
        .replace(/\(/g, "\\(") // Escapes parenthesis
        .replace(/\)/g, "\\)") // Escapes parenthesis
        .replace(/>/g, "\\>") // Escapes angle brackets
        .replace(/</g, "\\<") // Escapes angle brackets
        .replace(/-/g, "\\-"); // Escapes dash (hyphen)
}
// Initialize the bot and load vector store
function initializeBot() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("Initializing bot and building vector store...");
            // Build the vector store before the bot starts
            vectorStore = yield buildVectorDB();
            console.log("Bot is ready.");
            // Bot command: Start
            bot.command("start", (ctx) => {
                const welcomeMessage = `*Welcome to the Gaianet Bot!*\n\n
Ask me anything related to the Gaianet protocol, and I'll do my best to help.\n
Check out the [Gaianet Docs](https://docs.gaianet.ai/intro) for more information.`;
                ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
            });
            // Message handler for user queries
            bot.on("message:text", (ctx) => __awaiter(this, void 0, void 0, function* () {
                const userMessage = ctx.message.text;
                try {
                    yield ctx.replyWithChatAction("typing");
                    // Ensure vector store is ready
                    if (!vectorStore) {
                        throw new Error("Vector store not initialized yet. Please try again later.");
                    }
                    // Retrieve relevant documents from the vector store
                    const relevantDocs = yield retrieveRelevantDocs(userMessage, vectorStore);
                    // Call the Gaianet Gemma API via fetch
                    let gaiaResponse;
                    try {
                        const response = yield fetch("https://gemma.us.gaianet.network/v1/chat/completions", {
                            method: "POST",
                            headers: {
                                accept: "application/json",
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                messages: [
                                    {
                                        role: "system",
                                        // content: `You are a knowledgeable assistant designed to answer questions strictly related to Gaianet, including its protocol, network architecture, nodes, APIs, and all public features. You have access to the relevant information: ${relevantDocs}. Provide detailed, precise answers based on this information. If a question is unrelated to Gaianet, inform the user that you can only respond to questions about the Gaianet ecosystem.`,
                                        content: relevantDocs
                                    },
                                    {
                                        role: "user",
                                        content: userMessage,
                                    },
                                ],
                                model: "gemma",
                            }),
                        });
                        const data = yield response.json();
                        gaiaResponse = data.choices[0].message.content;
                    }
                    catch (err) {
                        console.error("Error interacting with Gaianet Gemma API:", err);
                    }
                    // Send the response with an inline keyboard
                    const inlineKeyboard = new InlineKeyboard()
                        .text("Ask Another Question", "ask_again")
                        .row()
                        .url("View Docs", "https://docs.gaianet.ai/intro");
                    // const sanitizedResponse = escapeMarkdown(gaiaResponse ?? "");
                    let sanitizedRes = telegramifyMarkdown(gaiaResponse !== null && gaiaResponse !== void 0 ? gaiaResponse : '', 'escape');
                    console.log(sanitizedRes);
                    yield ctx.reply(`${sanitizedRes}`, {
                        parse_mode: "MarkdownV2",
                        reply_markup: inlineKeyboard,
                    });
                }
                catch (error) {
                    console.error("Error interacting with Gaianet LLM:", error);
                    ctx.reply("There was an issue reaching Gaianet's knowledge base. Please try again later.");
                }
            }));
            // Handle the "Ask Again" button interaction
            bot.callbackQuery("ask_again", (ctx) => {
                ctx.reply("Please ask your next question about Gaianet:");
                ctx.answerCallbackQuery(); // Acknowledge the button click
            });
            // Quick reply buttons for commonly asked topics
            bot.command("topics", (ctx) => {
                const quickReplyKeyboard = new Keyboard()
                    .text("Protocol Info")
                    .text("Network Architecture")
                    .text("Node Setup");
                ctx.reply("Here are some topics you can ask about:", {
                    reply_markup: { keyboard: quickReplyKeyboard.build(), one_time_keyboard: true },
                });
            });
            // Start the bot
            bot.start();
        }
        catch (error) {
            console.error("Failed to initialize bot:", error);
        }
    });
}
// Call the bot initialization function
initializeBot();
