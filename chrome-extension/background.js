
const CONTEXT_MENU_ID_COPY_HTML = "a";
const CONTEXT_MENU_ID_COPY_MARKDOWN = "b";

function createContextMenus() {
	chrome.contextMenus.create({
		title: "選択範囲のHTMLをコピー",
		contexts: ["selection"],
		id: CONTEXT_MENU_ID_COPY_HTML
	});
	chrome.contextMenus.create({
		title: "選択範囲をMarkdown書式でコピー",
		contexts: ["selection"],
		id: CONTEXT_MENU_ID_COPY_MARKDOWN
	});
}

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);

chrome.contextMenus.onClicked.addListener(info => {
	if (info.menuItemId === CONTEXT_MENU_ID_COPY_HTML) {
		chrome.tabs.executeScript({
			frameId: info.frameId,
			file: "/copy_html.js"
		});
	} else if (info.menuItemId === CONTEXT_MENU_ID_COPY_MARKDOWN) {
		chrome.tabs.executeScript({
			frameId: info.frameId,
			file: "/copy_by_markdown_format.js"
		});
	}
});

chrome.runtime.onMessage.addListener(({method, value}) => {
	if (method === "copy") {
		copy(value);
	}
});

const copy = text => {
	let textarea = document.createElement("textarea");
	document.body.appendChild(textarea);
	textarea.value = text;
	textarea.select();
	document.execCommand("copy");
	document.body.removeChild(textarea);
	textarea = null;
};
