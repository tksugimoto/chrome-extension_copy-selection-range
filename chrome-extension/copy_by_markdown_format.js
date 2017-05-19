{
	const NEW_LINE = "\n";
	const INDENT = "\t";

	class transformFormat {
		constructor({isMatch, transform}) {
			this._isMatch = isMatch;
			this._transform = transform;
		}
		checkAndTransform(element, state, getChildrenText) {
			const tagName = element.tagName || "";
			const isMatch = this._isMatch({element, tagName});
			if (isMatch) {
				const matchArgs = isMatch;
				return {
					matched: true,
					text: this._transform({element, matchArgs, getChildrenText, state})
				};
			} else {
				return {matched: false};
			}
		}
	}
	const formats = [new transformFormat({
		isMatch: ({element}) => element instanceof Text,
		transform: ({element}) => element.textContent.trim()
	}), new transformFormat({
		isMatch: ({tagName}) => tagName.match(/^H(\d+)$/),
		transform: ({matchArgs, getChildrenText}) => {
			const level = parseInt(matchArgs[1]);
			return NEW_LINE.repeat(2) + "#".repeat(level) + " " + getChildrenText();
		}
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "UL",
		transform: ({state, getChildrenText}) => {
			state.listTypeHistory.push("*");
			const childrenText = getChildrenText();
			state.listTypeHistory.pop();
			const newLineIfTopLevel = state.listTypeHistory.length === 0 ? NEW_LINE : "";
			// TopLevel(=リストの中のリストではない)リストの場合、改行が必要
			return newLineIfTopLevel + childrenText;
		}
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "OL",
		transform: ({state, getChildrenText}) => {
			state.listTypeHistory.push("1.");
			const childrenText = getChildrenText();
			state.listTypeHistory.pop();
			const newLineIfTopLevel = state.listTypeHistory.length === 0 ? NEW_LINE : "";
			// TopLevel(=リストの中のリストではない)リストの場合、改行が必要
			return newLineIfTopLevel + childrenText;
		}
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "LI",
		transform: ({state, getChildrenText}) => {
			const liIsTopLevel = state.listTypeHistory.length === 0;
			if (liIsTopLevel) {
				// <LI>途中から選択した場合、親要素情報が消えるため親要素を<UL>に決め打ち
				state.listTypeHistory.push("*");
			}
			const listDepth = state.listTypeHistory.length;
			const listType = state.listTypeHistory[listDepth - 1];
			const childrenText = NEW_LINE + INDENT.repeat(listDepth - 1) + `${listType} ` + getChildrenText();
			if (liIsTopLevel) {
				state.listTypeHistory.pop();
			}
			return childrenText;
		}
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "A",
		transform: ({element, getChildrenText}) => {
			const text = getChildrenText();
			if (!text) return "";
			return `[${text}](${element.href} "${element.title}")`;
		}
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "EM",
		transform: ({getChildrenText}) => `*${getChildrenText()}*`
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "STRONG",
		transform: ({getChildrenText}) => `**${getChildrenText()}**`
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "DEL",
		transform: ({getChildrenText}) => `~~${getChildrenText()}~~`
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "IMG",
		transform: ({element}) => {
			return `![${element.alt}](${element.src})`;
		}
	}), new transformFormat({
		isMatch: ({element, tagName}) => tagName === "INPUT" && element.type === "checkbox",
		transform: ({element}) => `[${element.checked ? "x" : " "}] `
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "PRE",
		transform: ({element}) => {
			return NEW_LINE.repeat(2) + "```" + NEW_LINE + element.innerText + NEW_LINE + "```" + NEW_LINE;
		}
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "CODE",
		transform: ({getChildrenText}) => "`" + getChildrenText() + "`"
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "P",
		transform: ({getChildrenText}) => NEW_LINE.repeat(2) + getChildrenText()
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "BR",
		transform: () => NEW_LINE
	})];

	// 上記にマッチしなかった場合
	formats.push(new transformFormat({
		isMatch: () => true,
		transform: ({getChildrenText}) => getChildrenText()
	}));

	const transformToMarkdownFormat = (element, state = {listTypeHistory: []}) => {
		const getChildrenText = () => {
			let childrenText = "";
			element.childNodes.forEach(child => {
				childrenText += transformToMarkdownFormat(child, state);
			});
			return childrenText;
		};
		const initialResult = {
			done: false,
			text: ""
		};
		return formats.reduce((result, format) => {
			if (result.done) {
				return result;
			} else {
				const {matched, text} = format.checkAndTransform(element, state, getChildrenText);
				if (matched) {
					return {
						done: true,
						text
					};
				} else {
					return result;
				}
			}
		}, initialResult).text;
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
