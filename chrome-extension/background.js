
const generateContextMenuId = (() => {
	let count = 0;
	return () => String(count++);
})();

const menus = [{
	id: generateContextMenuId(),
	title: '選択範囲をMarkdown書式でコピー',
	functionDefinitionScriptFile: '/transformFromElement/markdown.js',
}, {
	id: generateContextMenuId(),
	title: '選択範囲のHTMLをコピー',
	functionDefinitionScriptFile: '/transformFromElement/html.js',
}, {
	id: generateContextMenuId(),
	title: '選択範囲をBacklog書式でコピー',
	functionDefinitionScriptFile: '/transformFromElement/backlog.js',
}];

function createContextMenus() {
	menus.forEach(menu => {
		chrome.contextMenus.create({
			title: menu.title,
			contexts: ['selection'],
			id: menu.id,
		});
	});
}

chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.runtime.onStartup.addListener(createContextMenus);

chrome.contextMenus.onClicked.addListener((info, tab) => {
	const matchedMenu = menus.find(menu => info.menuItemId === menu.id);
	if (matchedMenu) {
		const target = {
			tabId: tab.id,
			frameIds: [info.frameId],
		};
		chrome.scripting.executeScript({
			target,
			files: [matchedMenu.functionDefinitionScriptFile],
		}, () => {
			chrome.scripting.executeScript({
				target,
				files: ['/get_selection_and_transform.js'],
			});
		});
	}
});

chrome.runtime.onMessage.addListener(({type, value}) => {
	if (type === 'transformedText') {
		copy(value);
	}
});

const copy = async (text) => {
	await setupOffscreenDocument();

	chrome.runtime.sendMessage({
		type: 'write-clipboard-text',
		text,
	});
};

const setupOffscreenDocument = (() => {
	let creating;
	return async () => {
		const offscreenUrl = chrome.runtime.getURL('offscreen.html');
		const existingContexts = await chrome.runtime.getContexts({
			contextTypes: ['OFFSCREEN_DOCUMENT'],
			documentUrls: [offscreenUrl],
		});

		if (existingContexts.length > 0) {
			return;
		}

		if (creating) {
			await creating;
		} else {
			creating = chrome.offscreen.createDocument({
				url: offscreenUrl,
				reasons: [chrome.offscreen.Reason.CLIPBOARD],
				justification: 'Write text to the clipboard.',
			});
			await creating;
			creating = null;
		}
	};
})();
