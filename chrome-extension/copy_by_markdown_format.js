{
	const NEW_LINE = "\n";
	const INDENT = "\t";
	const TEXT_BR = " ".repeat(2);
	const RE_HEAD_LAST_NEW_LINES = new RegExp(`^${NEW_LINE}+|${NEW_LINE}+$`, "g");
	const RE_NEW_LINES = new RegExp(NEW_LINE, "g");
	const RE_SPECIAL_CHARS = /[<>#*`~_\-\[\]\\]/g;
	const RE_EMOJI = /^:.+:$/;

	const escape = text => {
		return text.replace(RE_SPECIAL_CHARS, "\\$&");
	};

	class State {
		constructor() {
			this.listTypeHistory = [];
		}
		get deepestListType() {
			return this.listTypeHistory[this.listTypeHistory.length - 1];
		}
		get listDepth() {
			return this.listTypeHistory.length;
		}
		get inListItem() {
			return this.listDepth !== 0;
		}
	}

	class transformFormat {
		constructor({isMatch, transform, before, after}) {
			this._isMatch = isMatch;
			this._transform = transform;
			this._before = before;
			this._after = after;
		}
		checkAndTransform(element, state, getChildrenText) {
			const tagName = element.tagName || "";
			const isMatch = this._isMatch({element, tagName});
			if (isMatch) {
				const matchArgs = isMatch;
				if (this._before) this._before({element, state});
				const text = this._transform({element, state, matchArgs, getChildrenText});
				if (this._after) this._after({element, state});
				return {
					matched: true,
					text,
				};
			} else {
				return {matched: false};
			}
		}
	}
	const formats = [new transformFormat({
		isMatch: ({element}) => element instanceof Text,
		transform: ({element}) => escape(element.textContent.replace(RE_HEAD_LAST_NEW_LINES, "")),
	}), new transformFormat({
		isMatch: ({tagName}) => tagName.match(/^H(\d+)$/),
		transform: ({matchArgs, getChildrenText}) => {
			const level = parseInt(matchArgs[1]);
			return NEW_LINE.repeat(2) + "#".repeat(level) + " " + getChildrenText();
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "BLOCKQUOTE",
		transform: ({getChildrenText}) => {
			return getChildrenText().replace(RE_NEW_LINES, "$&> ");
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "UL",
		before: ({state}) => state.listTypeHistory.push("*"),
		transform: ({state, getChildrenText}) => {
			// TopLevel(=リストの中のリストではない)リストの場合、改行が必要
			return (state.listDepth === 1 ? NEW_LINE : "") + getChildrenText();
		},
		after: ({state}) => state.listTypeHistory.pop(),
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "OL",
		before: ({state}) => state.listTypeHistory.push("1."),
		transform: ({state, getChildrenText}) => {
			// TopLevel(=リストの中のリストではない)リストの場合、改行が必要
			return (state.listDepth === 1 ? NEW_LINE : "") + getChildrenText();
		},
		after: ({state}) => state.listTypeHistory.pop(),
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "LI",
		transform: ({state, getChildrenText}) => {
			const liIsTopLevel = !state.inListItem;
			if (liIsTopLevel) {
				// <LI>途中から選択した場合、親要素情報が消えるため親要素を<UL>に決め打ち
				state.listTypeHistory.push("*");
			}
			const listDepth = state.listDepth;
			const listType = state.deepestListType;
			const childrenText = NEW_LINE + INDENT.repeat(listDepth - 1) + `${listType} ` + getChildrenText();
			if (liIsTopLevel) {
				state.listTypeHistory.pop();
			}
			return childrenText;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "A",
		transform: ({element, getChildrenText}) => {
			const text = getChildrenText();
			if (!text) return "";
			const url = element.href.replace(/[()]/g, "\\$&");
			const title = element.title.replace(/"\)/g, '"\\)');
			return `[${text}](${url} "${title}")`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "EM",
		transform: ({getChildrenText}) => `*${getChildrenText()}*`,
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "STRONG",
		transform: ({getChildrenText}) => `**${getChildrenText()}**`,
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "DEL",
		transform: ({getChildrenText}) => `~~${getChildrenText()}~~`,
	}), new transformFormat({
		isMatch: ({tagName, element}) => tagName === "G-EMOJI" && element.hasAttribute("alias"),
		transform: ({element}) => `:${element.getAttribute("alias")}:`,
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "IMG",
		transform: ({element}) => {
			if (element.classList.contains("emoji")) {
				if (RE_EMOJI.test(element.alt)) return element.alt;
				if (RE_EMOJI.test(element.title)) return element.title;
			}
			return `![${element.alt}](${element.src})`;
		},
	}), new transformFormat({
		isMatch: ({element, tagName}) => tagName === "INPUT" && element.type === "checkbox",
		transform: ({element}) => `[${element.checked ? "x" : " "}] `,
	}), new transformFormat({
		isMatch: ({element}) => typeof element.hasAttribute === "function" && element.hasAttribute("data-lang"),
		before: ({element, state}) => state.dataLang = element.getAttribute("data-lang"),
		transform: ({getChildrenText}) => getChildrenText(),
		after: ({state}) => state.dataLang = null,
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "PRE",
		transform: ({element, state}) => {
			let contents = ["```" + (state.dataLang || "")].concat(element.innerText.replace(RE_HEAD_LAST_NEW_LINES, "").split(NEW_LINE)).concat("```");
			if (state.inListItem) {
				const indentForPre = INDENT.repeat(state.listDepth);
				contents = contents.map(line => indentForPre + line);
			}
			return NEW_LINE.repeat(2) + contents.join(NEW_LINE) + (!state.inListItem ? NEW_LINE : "");
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "CODE",
		transform: ({element}) => {
			const text = element.innerText;
			const continuingBackquoteLengthList = text.split(/[^`]+/).map(s => s.length);
			const maxContinuingBackquoteLength = Math.max.apply(null, continuingBackquoteLengthList);
			const backquotes = "`".repeat(maxContinuingBackquoteLength + 1);
			return `${backquotes} ${text} ${backquotes}`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "P",
		transform: ({getChildrenText, state}) => {
			return NEW_LINE.repeat(state.inListItem ? 0 : 2) + getChildrenText();
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "DETAILS",
		transform: ({element}) => {
			return `${NEW_LINE}<details>${element.innerHTML.replace(/<br>/g, "")}</details>`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "DL",
		transform: ({getChildrenText}) => {
			return `${NEW_LINE.repeat(2)}<dl>${getChildrenText()}${NEW_LINE}</dl>`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "DT",
		transform: ({element}) => {
			return `${NEW_LINE}${INDENT}<dt>${element.innerHTML}</dt>`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "DD",
		transform: ({element}) => {
			return `${NEW_LINE}${INDENT}<dd>${element.innerHTML}</dd>`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "TABLE",
		transform: ({getChildrenText}) => {
			return `${NEW_LINE}${getChildrenText()}`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "THEAD",
		transform: ({getChildrenText, element}) => {
			const textAligns = Array.from(element.querySelectorAll("tr > *")).map(e => e.style.textAlign);
			const separators = textAligns.map(textAlign => {
				switch (textAlign) {
					case "right": return "--:";
					case "center": return ":-:";
					default: return "---";
				}
			});
			const separator = `|${separators.join("|")}|`;
			return `${getChildrenText()}${NEW_LINE}${separator}`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "TR",
		transform: ({getChildrenText}) => {
			return `${NEW_LINE}|${getChildrenText()}`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "TD" || tagName === "TH",
		transform: ({getChildrenText}) => {
			return ` ${getChildrenText()} |`;
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "HR",
		transform: () => NEW_LINE + "___",
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "BR",
		transform: ({state}) => {
			if (state.inListItem) {
				return TEXT_BR + NEW_LINE + INDENT.repeat(state.listDepth);
			} else {
				return NEW_LINE;
			}
		},
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "SCRIPT",
		transform: () => "",
	}), new transformFormat({
		isMatch: ({tagName}) => tagName === "STYLE",
		transform: () => "",
	})];

	// 上記にマッチしなかった場合
	formats.push(new transformFormat({
		isMatch: () => true,
		transform: ({getChildrenText}) => getChildrenText(),
	}));

	const transformToMarkdownFormat = (element, state = new State()) => {
		const getChildrenText = () => {
			return Array.from(element.childNodes).reduce((previousValue, child) => {
				return previousValue + transformToMarkdownFormat(child, state);
			}, "");
		};
		const initialResult = {
			done: false,
			text: "",
		};
		return formats.reduce((result, format) => {
			if (result.done) {
				return result;
			} else {
				const {matched, text} = format.checkAndTransform(element, state, getChildrenText);
				if (matched) {
					return {
						done: true,
						text,
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
		value: markdownFormat,
	});
}
