{
	const selection = window.getSelection();
	const container = document.createElement('div');
	for (let i = 0, len = selection.rangeCount; i < len; i++) {
		container.appendChild(selection.getRangeAt(i).cloneContents());
	}
	const transformedText = window.transformFromElement(container);

	chrome.runtime.sendMessage({
		type: 'transformedText',
		value: transformedText,
	});
}
