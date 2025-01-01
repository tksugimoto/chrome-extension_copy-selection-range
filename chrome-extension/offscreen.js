const copy = (() => {
	const textarea = document.getElementById('textarea');
	return text => {
		textarea.value = text;
		textarea.select();
		document.execCommand('copy');
	};
})();

chrome.runtime.onMessage.addListener((message) => {
	if (message.type === 'write-clipboard-text') {
		copy(message.text);
	}
});
