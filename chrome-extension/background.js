
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

chrome.contextMenus.onClicked.addListener(info => {
	const matchedMenu = menus.find(menu => info.menuItemId === menu.id);
	if (matchedMenu) {
		chrome.tabs.executeScript({
			frameId: info.frameId,
			file: matchedMenu.functionDefinitionScriptFile,
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

const htmlToElement = (htmlText) => {
    const div = document.createElement('div');
    div.innerHTML = htmlText;
    return div;
};

const convertToMarkdown = (() => {
	const pasteTarget = document.createElement('input');
	document.activeElement.appendChild(pasteTarget);

	pasteTarget.addEventListener('paste', evt => {
		evt.preventDefault();
		const clipboardData = evt.clipboardData;

		console.debug(clipboardData.types);

		Array.from(clipboardData.items)
		.filter(({type}) => type === 'text/html')
		.forEach(item => {
			item.getAsString(htmlText => {
				const htmlElement = htmlToElement(htmlText);
				const markdownText = transformFromElement(htmlElement);
				console.debug({
					htmlText,
					markdownText,
				});
				copy(markdownText);
			});
		});
	});

	return () => {
		pasteTarget.focus();
		document.execCommand('Paste', null, null);
	};
})();

chrome.commands.onCommand.addListener(command => {
	if (command === 'convert_to_markdown') {
		convertToMarkdown();
	}
});
