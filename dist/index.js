"use strict";
const http = require('http');
const https = require('https');
const PORT = 3001;
// Функция получения курсов валют от ЦБ РФ
function getCurrencyRates() {
    return new Promise((resolve, reject) => {
        const url = 'https://www.cbr-xml-daily.ru/daily_json.js';
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({
                        usd: json.Valute.USD.Value,
                        eur: json.Valute.EUR.Value,
                        cny: json.Valute.CNY.Value,
                        date: json.Date
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}
function makeResponse(text) {
    return {
        response: {
            text: text,
            end_session: false
        },
        version: "1.0"
    };
}
const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => {
        body += chunk.toString();
    });
    req.on("end", async () => {
        console.log("Получен запрос:", body);
        let responseText = "";
        try {
            const request = JSON.parse(body);
            let message = request.request?.command || "";
            message = message.toLowerCase().trim();
            console.log(`Сообщение: "${message}"`);
            const rates = await getCurrencyRates();
            // Курс доллара
            if (message.includes("курс доллара") || message.includes("курс usd") || message === "доллар") {
                responseText = `Курс доллара: ${rates.usd.toFixed(2)} рублей. Данные на ${rates.date.slice(0, 10)}.`;
            }
            // Курс евро
            else if (message.includes("курс евро") || message.includes("курс eur") || message === "евро") {
                responseText = `Курс евро: ${rates.eur.toFixed(2)} рублей. Данные на ${rates.date.slice(0, 10)}.`;
            }
            // Курс юаня
            else if (message.includes("курс юаня") || message.includes("курс cny") || message === "юань") {
                responseText = `Курс юаня: ${rates.cny.toFixed(2)} рублей. Данные на ${rates.date.slice(0, 10)}.`;
            }
            // Все курсы
            else if (message.includes("все курсы") || message === "все курсы") {
                responseText = `Курсы на ${rates.date.slice(0, 10)}: Доллар: ${rates.usd.toFixed(2)} руб., Евро: ${rates.eur.toFixed(2)} руб., Юань: ${rates.cny.toFixed(2)} руб.`;
            }
            // Конвертация (поддерживает: доллар, долларов, евро, юань, юаней)
            else if (/(\d+)\s*(доллар|долларов|евро|юань|юаней)/i.test(message)) {
                const match = message.match(/(\d+)\s*(доллар|долларов|евро|юань|юаней)/i);
                if (match) {
                    const amount = parseFloat(match[1]);
                    const currency = match[2].toLowerCase();
                    let rubAmount = 0;
                    let currencyName = "";
                    if (currency === "доллар" || currency === "долларов") {
                        rubAmount = amount * rates.usd;
                        currencyName = "долларов";
                    }
                    else if (currency === "евро") {
                        rubAmount = amount * rates.eur;
                        currencyName = "евро";
                    }
                    else if (currency === "юань" || currency === "юаней") {
                        rubAmount = amount * rates.cny;
                        currencyName = "юаней";
                    }
                    responseText = `${amount} ${currencyName} = ${rubAmount.toFixed(2)} рублей.`;
                }
                else {
                    responseText = "Скажите, например: '100 долларов', '50 евро' или '100 юаней'.";
                }
            }
            // Помощь
            else if (message.includes("помощь") || message === "что делать" || message === "команды") {
                responseText = "Курс валют. Команды: 'курс доллара', 'курс евро', 'курс юаня', '100 долларов', '100 евро', '100 юаней', 'все курсы'.";
            }
            // Запуск навыка
            else if (message.includes("запусти") || message === "привет" || message === "старт" || message === "начать") {
                responseText = "Добро пожаловать в навык 'Курс валют'! Команды: 'курс доллара', 'курс евро', 'курс юаня', '100 долларов', '100 евро', '100 юаней'.";
            }
            // Если ничего не подошло
            else {
                responseText = "Скажите 'помощь' для списка команд. Например: 'курс доллара' или '100 юаней'.";
            }
        }
        catch (error) {
            console.error("Ошибка:", error);
            responseText = "Произошла ошибка. Попробуйте ещё раз.";
        }
        const response = makeResponse(responseText);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
    });
});
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
