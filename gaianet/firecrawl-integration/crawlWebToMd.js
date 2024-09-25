import FirecrawlApp from '@mendable/firecrawl-js';
import * as dotenv from "dotenv";
import {promises as fs} from 'fs';
import readline from 'node:readline/promises';
import {stdin as input, stdout as output} from "process";

dotenv.config();

const app = new FirecrawlApp({apiKey: process.env.FIRECRAWL_KEY});
const rl = readline.createInterface({input, output});

async function saveMarkdown(mdContent, titleList, filePath) {
    try {
        await fs.writeFile(filePath, mdContent, 'utf8');
        titleList.map(title => {
            console.log(`Markdown file——"${title}" has been saved to: ${filePath}`);
        })
    } catch (error) {
        console.error('Error saving Markdown file:', error);
    }
}

const url = await rl.question("https://docs.gaianet.ai https://docs.gaianet.ai/category/user-guide/ https://docs.gaianet.ai/user-guide/nodes/ https://docs.gaianet.ai/user-guide/mynode/ https://docs.gaianet.ai/category/agent-frameworks-and-apps/ https://docs.gaianet.ai/user-guide/apps/intro/ https://docs.gaianet.ai/user-guide/apps/dify/ https://docs.gaianet.ai/user-guide/apps/openwebui/ https://docs.gaianet.ai/user-guide/apps/anything_llm/ https://docs.gaianet.ai/user-guide/apps/cursor/ https://docs.gaianet.ai/user-guide/apps/stockbot/ https://docs.gaianet.ai/user-guide/apps/flowiseai/ https://docs.gaianet.ai/user-guide/apps/flowiseai-tool-call/ https://docs.gaianet.ai/user-guide/apps/lobechat/ https://docs.gaianet.ai/user-guide/apps/llamaparse/ https://docs.gaianet.ai/user-guide/apps/zed/ https://docs.gaianet.ai/user-guide/apps/obsidian/ https://docs.gaianet.ai/user-guide/apps/codegpt/ https://docs.gaianet.ai/user-guide/apps/continue/ https://docs.gaianet.ai/user-guide/apps/llamacoder/ https://docs.gaianet.ai/user-guide/apps/agent-zero/ https://docs.gaianet.ai/user-guide/apps/translation-agent/ https://docs.gaianet.ai/user-guide/apps/gpt-planner/ https://docs.gaianet.ai/user-guide/apps/llamaedgebook/ https://docs.gaianet.ai/user-guide/apps/llamatutor/ https://docs.gaianet.ai/user-guide/api-reference/ https://docs.gaianet.ai/category/node-operator-guide/ https://docs.gaianet.ai/creator-guide/knowledge/concepts/ https://docs.gaianet.ai/creator-guide/knowledge/text/ https://docs.gaianet.ai/creator-guide/knowledge/markdown/ https://docs.gaianet.ai/creator-guide/knowledge/csv/ https://docs.gaianet.ai/creator-guide/knowledge/pdf/ https://docs.gaianet.ai/creator-guide/knowledge/firecrawl/ https://docs.gaianet.ai/creator-guide/knowledge/web-tool/ https://docs.gaianet.ai/category/gaianet-node-with-finetuned-llms/ https://docs.gaianet.ai/creator-guide/finetune/intro/ https://docs.gaianet.ai/creator-guide/finetune/llamacpp/ https://docs.gaianet.ai/category/tutorial/ https://docs.gaianet.ai/tutorial/tool-call/ https://docs.gaianet.ai/tutorial/translator-agent/ https://docs.gaianet.ai/litepaper/ ");
let limit
let scrapeResult
if (url && url.endsWith("/")) {
    // limit = await rl.question("Crawl limit(default value is no limit, maybe will use up a lot of your usage): ");
    scrapeResult = await app.crawlUrl(url, {
        crawlerOptions: {
            excludes: [], includes: [], limit: limit ? limit : null
        },
    }, true, 2);
    console.log(scrapeResult)
} else {
    const res = await app.scrapeUrl(url);
    scrapeResult = {0: res.data}
}

// Scrape a website:

console.log("total crawl " + Object.values(scrapeResult).length + " page")
let allMdData
let titleList = []
Object.values(scrapeResult).map(data => {
    allMdData += data.markdown
    titleList.push(data.metadata.title)
})
await saveMarkdown(allMdData, titleList, "output.md")

rl.close()
