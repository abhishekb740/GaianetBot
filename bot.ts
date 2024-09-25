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
]

let vectorStore: null | MemoryVectorStore = null;

async function buildVectorDB() {
    let allSplits: any = [];

    for (const link of links) {
        const loader = new CheerioWebBaseLoader(link);
        const docs = await loader.load();

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const splits = await textSplitter.splitDocuments(docs);
        allSplits = allSplits.concat(splits);
    }

    const embeddings = new HuggingFaceInferenceEmbeddings({
        apiKey: process.env.HF_API_KEY,
        model: "sentence-transformers/all-MiniLM-L6-v2",
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(allSplits, embeddings);

    console.log("Vector store is built and ready to use.");
    return vectorStore;
}

async function retrieveRelevantDocs(question: string, vectorStore: MemoryVectorStore) {
    const retriever = vectorStore.asRetriever();
    const retrievedDocs = await retriever.invoke(question);
    return retrievedDocs.map((doc) => doc.pageContent).join("\n\n");
}

const bot = new Bot(process.env.TELEGRAM_BOT_KEY!);

function escapeMarkdown(text: string) {
    return text
        .replace(/_/g, "\\_")   // Escapes underscore
        .replace(/\*/g, "\\*")  // Escapes asterisk
        .replace(/\[/g, "\\[")  // Escapes square brackets
        .replace(/\]/g, "\\]")  // Escapes square brackets
        .replace(/`/g, "\\`")   // Escapes backtick
        .replace(/\(/g, "\\(")  // Escapes parenthesis
        .replace(/\)/g, "\\)")  // Escapes parenthesis
        .replace(/>/g, "\\>")   // Escapes angle brackets
        .replace(/</g, "\\<")   // Escapes angle brackets
        .replace(/-/g, "\\-");  // Escapes dash (hyphen)
}

async function initializeBot() {
    try {
        console.log("Initializing bot and building vector store...");

        vectorStore = await buildVectorDB();

        console.log("Bot is ready.");

        bot.command("start", (ctx) => {
            const welcomeMessage = `*Welcome to the Gaianet Bot!*\n\n
Ask me anything related to the Gaianet protocol, and I'll do my best to help.\n
Check out the [Gaianet Docs](https://docs.gaianet.ai/intro) for more information.`;
            ctx.reply(welcomeMessage, { parse_mode: "Markdown" });
        });

        bot.on("message:text", async (ctx) => {
            const userMessage = ctx.message.text;

            try {
                await ctx.replyWithChatAction("typing");

                if (!vectorStore) {
                    throw new Error("Vector store not initialized yet. Please try again later.");
                }

                const relevantDocs = await retrieveRelevantDocs(userMessage, vectorStore);

                let gaiaResponse;
                try {
                    const response = await fetch("https://gemma.us.gaianet.network/v1/chat/completions", {
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

                    const data = await response.json() as { choices: { message: { content: string } }[] };
                    gaiaResponse = data.choices[0].message.content;
                }
                catch (err) {
                    console.error("Error interacting with Gaianet Gemma API:", err);
                }

                const inlineKeyboard = new InlineKeyboard()
                    .text("Ask Another Question", "ask_again")
                    .row()
                    .url("View Docs", "https://docs.gaianet.ai/intro");

                let sanitizedRes = telegramifyMarkdown(gaiaResponse ?? '', 'escape');
                await ctx.reply(`${sanitizedRes}`, {
                    parse_mode: "MarkdownV2",
                    reply_markup: inlineKeyboard,
                });
            } catch (error) {
                console.error("Error interacting with Gaianet LLM:", error);
                ctx.reply("There was an issue reaching Gaianet's knowledge base. Please try again later.");
            }
        });

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
    } catch (error) {
        console.error("Failed to initialize bot:", error);
    }
}

// Call the bot initialization function
initializeBot();
