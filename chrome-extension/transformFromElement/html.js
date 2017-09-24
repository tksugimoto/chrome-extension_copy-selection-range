{
	window.transformFromElement = element => element.innerHTML;
	
	// demo page用
	try {
		window.transformFunctions.html = element => element.innerHTML;
	} catch (e) {}
}
