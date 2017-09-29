{
	const transformToHtmlFormat = element => element.innerHTML;

	window.transformFromElement = transformToHtmlFormat;
	
	// demo page用
	try {
		window.transformFunctions.html = transformToHtmlFormat;
	} catch (e) {}
}
