console.log("Content script loaded on:", window.location.href);
function getArticleText() {
    const article = document.querySelector("article");
    if (article) return article.innerText;

    const paragraphs = Array.from(document.querySelectorAll("p"));
    return paragraphs.map((p) => p.innerText).join('\n');
    
}
        
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    console.log("Message received in content script:", req);
    if( req.type === "GET_ARTICLE_TEXT") {
        const text = getArticleText();
        console.log("Extracted text length:", text?.length);
        sendResponse({ text });
    }
    return true;
});