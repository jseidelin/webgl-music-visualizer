/* global vis,$ */

vis.ui.colorpicker = (function() {

	function setup() {
		$("#color-picker-win button[name=cancel]").click(function() {
			$("#color-picker-win").hide();
		});

		var $colorPicker = $("#color-picker-win div[name=color-picker]");
		var $colorCanvas = $("canvas[name=field]", $colorPicker);
		var $hueCanvas = $("canvas[name=hue]", $colorPicker);
		$colorCanvas.data("hue", 0);
		var pixelCanvas = document.createElement("canvas");
		var pixelCtx = pixelCanvas.getContext("2d");
		pixelCanvas.width = pixelCanvas.height = 1;

		$colorCanvas
			.attr("width", 256)
			.attr("height", 256);
		$hueCanvas
			.attr("width", 24)
			.attr("height", 256);

		$hueCanvas.click(function(e) {
			var offset = $(this).offset();
			var y = e.pageY - offset.top;
			var hue = y/256*360;
			$colorCanvas.css("backgroundColor", "hsl(" + hue + ",100%,50%)");
			$colorCanvas.data("hue", hue);
		});

		$colorCanvas.click(function(e) {
			var offset = $(this).offset();
			var x = e.pageX - offset.left;
			var y = e.pageY - offset.top;
			var hue = $(this).data("hue");
			var sat = x/256*100;
			var light = (1-y/256)*100;
			pixelCtx.fillStyle = "hsl(" + hue + "," + sat + "%," + light + "%)";
			pixelCtx.fillRect(0,0,1,1);
			var pixel = pixelCtx.getImageData(0,0,1,1).data;
			$("#color-picker-win").trigger("colorpick", [
				{
					r:pixel[0],g:pixel[1],b:pixel[2],
					h:hue, s:sat, l:light
				}
			]);
		});
		var x, y;
		var ctx = $colorCanvas.get(0).getContext("2d");
		for (y=0;y<128;y++) {
			for (x=0;x<128;x++) {
				ctx.globalAlpha = 1-x/128;
				ctx.fillStyle = "#888";
				ctx.fillRect(x*2,y*2,2,2);
				ctx.globalAlpha = y < 64 ? 1-y/64 : (y-64)/64;
				ctx.fillStyle = y < 64 ? "#fff" : "#000";
				ctx.fillRect(x*2,y*2,2,2);
			}
		}

		var hueCtx = $hueCanvas.get(0).getContext("2d");
		for (y=0;y<256;y++) {
			hueCtx.fillStyle = "hsl(" + (y/256*360) + ",100%,50%)";
			hueCtx.fillRect(0,y,24,1);
		}
	}

	return {
		setup : setup
	};

})();