require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const { tavily } = require("@tavily/core");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..")));

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


function createSearchQuery(type, query) {

    query = query.trim();

    switch (type) {

        case "name":
            return `"${query}"`;

        case "nickname":
            return `"${query}"`;

        case "email":
            return `"${query}"`;

        case "phone":
            return `"${query}"`;

        case "other":
            return query;

        default:
            return query;
    }
}


app.post("/search", async (req, res) => {

    const { type, query } = req.body;

    if (!query || query.trim() === "") {

        return res.status(400).json({
            error: "Пустой запрос"
        });

    }

    console.log("");
    console.log("================================");
    console.log("Новый поиск");
    console.log("Тип:", type);
    console.log("Запрос:", query);

    try {

        const searchQuery =
            createSearchQuery(type, query);

        console.log(
            "Поисковый запрос:",
            searchQuery
        );


        // ПОИСК
        const response =
            await tvly.search(searchQuery, {

                search_depth: "basic",

                max_results: 10

            });


        console.log(
            "Найдено:",
            response.results.length
        );


        // ГОТОВИМ РЕЗУЛЬТАТЫ ДЛЯ AI
        const sources =
            response.results.map(
                (item, index) => {

                    return `
ИСТОЧНИК ${index + 1}

Название:
${item.title || "Нет названия"}

Ссылка:
${item.url || "Нет ссылки"}

Содержание:
${item.content || "Нет содержания"}
`;

                }
            ).join("\n");


        console.log(
            "Отправляем данные в OpenAI..."
        );


        // AI
        const aiResponse =
            await openai.responses.create({

                model: "gpt-5.6-luna",

                instructions: `
Ты анализируешь результаты поиска
по публичным источникам.

Нужно:

1. Кратко объяснить, что найдено.
2. Сгруппировать похожие результаты.
3. Указать совпадения имени, никнейма,
   профессии, компании и других
   открытых признаков.
4. Не утверждать, что разные профили
   принадлежат одному человеку,
   если доказательств недостаточно.
5. Не выдумывать информацию.
6. Не использовать приватные данные,
   документы, пароли, банковские данные
   или утечки.

Отвечай на русском языке.
`,

                input: `
Тип поиска: ${type}

Запрос:
${query}

Результаты поиска:

${sources}
`

            });


        console.log(
            "OpenAI ответ получен."
        );


        const analysis =
            aiResponse.output_text ||
            "AI-анализ не получен";


        // ОТПРАВЛЯЕМ ВСЁ НА САЙТ
        res.json({

            success: true,

            type: type,

            query: query,

            analysis: analysis,

            results: response.results

        });


    } catch (error) {

        console.error(
            "ОШИБКА:",
            error
        );

        res.status(500).json({

            error:
                error.message ||
                "Ошибка поиска"

        });

    }

});


app.listen(3000, () => {

    console.log("================================");

    console.log(
        "Сервер запущен!"
    );

    console.log(
        "http://localhost:3000"
    );

    console.log("================================");

});