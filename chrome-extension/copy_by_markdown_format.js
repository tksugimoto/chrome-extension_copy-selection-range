{
	const NEW_LINE = "\n";
	const INDENT = "\t";

	const transformToMarkdownFormat = (element, state = {listTypeHistory: []}) => {
		if (element instanceof Text) {
			return element.textContent.trim();
		}
		let text = "";
		const tagName = element.tagName.toLowerCase();

		// 開始
		if (tagName.match(/^h(\d+)$/)) {
			const level = parseInt(RegExp.$1);
			text += NEW_LINE + "#".repeat(level) + " ";
		} else if (tagName === "ul" || tagName === "ol") {
			state.listTypeHistory.push(tagName === "ul" ? "*" : "1.");
		} else if (tagName === "li") {
			const listDepth = state.listTypeHistory.length;
			const listType = state.listTypeHistory[listDepth - 1]
			text += NEW_LINE + INDENT.repeat(listDepth - 1) + `${listType} `;
		} else if (tagName === "a") {
			text += "["
		} else if (tagName === "img") {
			text += `![${element.alt}](${element.src})`;
		} else if (tagName === "pre") {
			return NEW_LINE + "```" + NEW_LINE + element.innerText + NEW_LINE + "```";
		} else if (tagName === "code") {
			text += "`";
		} else if (tagName === "p") {
			text += NEW_LINE.repeat(2);
		} else if (tagName === "br") {
			text += NEW_LINE;
		}

		// 子
		element.childNodes.forEach(child => {
			text += transformToMarkdownFormat(child, state);
		});

		// 終了
		if (tagName === "ul" || tagName === "ol") {
			state.listTypeHistory.pop();
		} else if (tagName === "a") {
			text += `](${element.href})`;
		} else if (tagName === "code") {
			text += "`";
		}
		return text;
	};

	const selection = window.getSelection();
	const container = document.createElement("div");
	for (let i = 0, len = selection.rangeCount; i < len; i++) {
		container.appendChild(selection.getRangeAt(i).cloneContents());
	}
	const markdownFormat = transformToMarkdownFormat(container);

	chrome.runtime.sendMessage({
		method: "copy",
		type: "markdown",
		value: markdownFormat
	});
}
