
window.vis = (function() {

	var logLines = [],
		maxLogLines = 100,
		debug = true;

	function error(str) {
		log(str, "red", true);
	}


	function log(str, color, isError) {
		if (!debug) return;

		var logElement = document.getElementById("log");
		if (logElement) {
			logLines.push((color ? ("<span style='color:" + color + "'>" + str + "</span>")	: str));
			if (maxLogLines > 0 && logLines.length > maxLogLines)
				logLines.shift();
			logElement.innerHTML = logLines.join("<br/>").replace(/\n/g, "<br/>");
			logElement.scrollTop = logElement.scrollHeight;
		}

		try {
			if (isError) {
				console.error(str);
			} else {
				console.log(str);
			}
		} catch(e) {}
	}

	function loadScript(src, callback) {
		var script = document.createElement("script");
		script.src = src;
		script.onload = callback;
		var head = document.getElementsByTagName("head")[0] || document.documentElement;
		head.insertBefore(script, head.firstChild);
	}

	return {
		ui : {},
		data : {},
		log : log,
		error : error,
		loadScript : loadScript
	};

})();