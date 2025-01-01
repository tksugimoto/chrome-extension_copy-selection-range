const copy = (() => {
	const textarea = document.getElementById('textarea');
	return text => {
		console.log({text});
		textarea.value = text;
		console.log({value: textarea.value});
		setTimeout(() => {
			textarea.select();
		}, 200);
		setTimeout(() => {
			document.execCommand('copy');
			// textarea.value = '';
		}, 500);
	};
})();

chrome.runtime.onMessage.addListener((message) => {
	if (message.type === 'write-clipboard-text') {
		copy(message.text);
	}
});
