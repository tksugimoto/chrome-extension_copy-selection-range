{
	const NEW_LINE = '\n';
	const transformToBacklogFormat = (element, state = {listTypeHistory: []}) => {
		if (element instanceof Text) {
			return element.textContent.replace(/^\n+|\n+$/g, '');
		}
		let text = '';
		const tagName = element.tagName.toLowerCase();

		// 開始
		if (tagName.match(/^h(\d+)$/)) {
			const level = parseInt(RegExp.$1);
			text += NEW_LINE + '*'.repeat(level) + ' ';
		} else if (tagName === 'ul' || tagName === 'ol') {
			state.listTypeHistory.push(tagName);
		} else if (tagName === 'li') {
			const listDepth = state.listTypeHistory.length;
			const listType = state.listTypeHistory[listDepth - 1];
			text += NEW_LINE + (listType === 'ul' ? '-' : '+').repeat(listDepth) + ' ';
		} else if (tagName === 'a') {
			text += '[[';
		} else if (tagName === 'img') {
			text += `#image(${element.src})`;
		} else if (tagName === 'p') {
			text += NEW_LINE;
		}

		// 子
		element.childNodes.forEach(child => {
			text += transformToBacklogFormat(child, state);
		});

		// 終了
		if (tagName === 'ul' || tagName === 'ol') {
			state.listTypeHistory.pop();
		} else if (tagName === 'a') {
			text += `>${element.href}]]`;
		}
		return text;
	};

	window.transformFromElement = transformToBacklogFormat;

	// demo page用
	try {
		window.transformFunctions.backlog = transformToBacklogFormat;
	} catch (e) {}
}
