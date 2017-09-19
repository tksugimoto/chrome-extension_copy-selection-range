{
	const selection = window.getSelection();
	const container = document.createElement('div');
	for (let i = 0, len = selection.rangeCount; i < len; i++) {
		container.appendChild(selection.getRangeAt(i).cloneContents());
	}
	const selectedHtml = container.innerHTML;

	chrome.runtime.sendMessage({
		method: 'copy',
		type: 'html',
		value: selectedHtml
	});
}
