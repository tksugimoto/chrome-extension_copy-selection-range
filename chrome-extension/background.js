
const generateContextMenuId = (() => {
	let count = 0;
	return () => String(count++);
})();

const menus = [{
	id: generateContextMenuId(),
	title: '選択範囲をMarkdown書式でコピー',
	contentScriptFile: '/transformFromElement/markdown.js',
}, {
	id: generateContextMenuId(),
	title: '選択範囲のHTMLをコピー',
	contentScriptFile: '/transformFromElement/html.js',
}, {
	id: generateContextMenuId(),
	title: '選択範囲をBacklog書式でコピー',
	contentScriptFile: '/transformFromElement/backlog.js',
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

chrome.contextMenus.onClicked.addListener(info => {
	const matchedMenu = menus.find(menu => info.menuItemId === menu.id);
	if (matchedMenu) {
		chrome.tabs.executeScript({
			frameId: info.frameId,
			file: matchedMenu.contentScriptFile,
		}, () => {
			chrome.tabs.executeScript({
				frameId: info.frameId,
				file: '/get_selection_and_transform.js',
			});
		});
	}
});

chrome.runtime.onMessage.addListener(({type, value}) => {
	if (type === 'transformedText') {
		copy(value);
	}
});

const copy = text => {
	let textarea = document.createElement('textarea');
	document.body.appendChild(textarea);
	textarea.value = text;
	textarea.select();
	document.execCommand('copy');
	document.body.removeChild(textarea);
	textarea = null;
};
