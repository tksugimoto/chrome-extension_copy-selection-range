const formats = [{
    formatName: 'html',
    transformFunction: window.transformFunctions.html,
}, {
    formatName: 'markdown',
    transformFunction: window.transformFunctions.markdown,
}, {
    formatName: 'backlog',
    transformFunction: window.transformFunctions.backlog,
}];

const outputContainer = document.getElementById('output-container');
const logOutput = document.getElementById('log');


formats.forEach(format => {
    const output = document.createElement('div');
    output.classList.add('output');

    const heading = document.createElement('h2');
    heading.innerText = format.formatName;
    output.appendChild(heading);

    const outputTextarea = document.createElement('textarea');
    output.appendChild(outputTextarea);

    outputContainer.appendChild(output);


    format.transformAndUpdateOutput = htmlElement => {
        const transformedText = format.transformFunction(htmlElement);
        outputTextarea.value = transformedText;
    };

    format.clearOutput = () => outputTextarea.value = '';
});

function htmlToElement(htmlText) {
    const div = document.createElement('div');
    div.innerHTML = htmlText;
    return div;
}

document.getElementById('input').addEventListener('paste', evt => {
	evt.preventDefault();
	const clipboardData = evt.clipboardData;
    const htmlText = clipboardData.getData('text/html');

    if (!htmlText) {
        logOutput.innerText = 'クリップボードにhtmlが見つかりません';
        formats.forEach(format => {
            format.clearOutput();
        });
        return;
    }

    const htmlElement = htmlToElement(htmlText);

    formats.forEach(format => {
        format.transformAndUpdateOutput(htmlElement);
    });

    logOutput.innerText = '変換完了';
});
