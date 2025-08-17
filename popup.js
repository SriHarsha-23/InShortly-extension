document.getElementById("summarize").addEventListener("click", () => {
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;

    resultDiv.textContent = "Processing...";

    chrome.storage.sync.get(['geminiApiKey'], ({ geminiApiKey }) => {
        if (!geminiApiKey) {
            alert("Please set your API key in the options.");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.scripting.executeScript(
                {
                    target: { tabId: tab.id },
                    files: ["content.js"]
                },
                () => {
                    //console.log("Sending message to content script...");
                    chrome.tabs.sendMessage(
                        tab.id,
                        { type: "GET_ARTICLE_TEXT" },
                        async (response) => {
                            //console.log("Response from content script:", response);

                            if (chrome.runtime.lastError) {
                                //console.error("No content script found:", chrome.runtime.lastError.message);
                                resultDiv.textContent = "Cannot run on this page.";
                                return;
                            }
                            if (!response || !response.text) {
                                resultDiv.innerHTML = "No article text found.";
                                return;
                            }

                            const { text } = response;
                            try {
                                const summary = await getGeminiSummary(
                                    text,
                                    summaryType,
                                    geminiApiKey
                                );
                                resultDiv.textContent = summary;
                            } catch (error) {
                                //console.error("Error in content script:", error);
                                resultDiv.textContent = "API error: " + error.message;
                            }
                        }
                    );
                }
            );
        });
    });
});

async function getGeminiSummary(rawText, type, apiKey) {
    const max = 40000;
    const text = rawText.length > max ? rawText.slice(0, max) : "..." + rawText;

    const promptMap = {
        brief: `Please provide a concise summary of the following text in 4-5 sentences. Make sure it captures the main ideas clearly and accurately:\n\n${text}`,
        bullets: `Please summarize the following text into 5-10 clear bullet points. Each bullet should start with "->" and highlight key information or main points without adding extra details:\n\n${text}`,
        detailed: `Please provide a detailed and thorough summary of the following text. Include important points, context, and explanations to ensure the summary is comprehensive and easy to understand:\n\n${text}`,
    };


    const prompt = promptMap[type] || promptMap.brief;

    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-goog-api-key": apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
            }),
        }
    );


    if (!res.ok) {
        let errorMessage = `Error ${res.status}`;
        try {
            const { error } = await res.json();
            if (error && error.message) errorMessage += `: ${error.message}`;
        } catch (e) {
            errorMessage += " (no JSON body)";
        }
        throw new Error(errorMessage);
    }

    let data;
    try {
        data = await res.json();
    } catch (e) {
        throw new Error("Empty or invalid JSON in API response");
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";
}
document.getElementById("copy-btn").addEventListener("click", () => {
    const txt = document.getElementById("result").innerText;
    if (!txt) {
        alert("Nothing to copy!");
        return;
    }

    navigator.clipboard.writeText(txt).then(() => {
       const btn = document.getElementById("copy-btn");
       const old = btn.textContent;
        btn.textContent = "Copied!";
            setTimeout(() => {
                btn.textContent = old;
            }, 2000);
    });
});