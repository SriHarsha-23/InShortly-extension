chrome.runtime.onInstalled.addListener(() => {
    console.log("Background script loaded");
    chrome.storage.sync.get(["geminiApiKey"],(result)=>{
        if (!result.ApiKey) {
            chrome.tabs.create({ url: "options.html" });
        }
    })
})
