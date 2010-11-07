/* global vis,$ */

vis.ui.settings = (function() {

	function close() {
		$("#overlay, #preset-settings-win, #color-picker-win").hide();
	}

	function setup() {

		$("#io-win button[name=settings]").click(function() {
			showSettingsWindow();
		});

		var $win = $("#preset-settings-win");

		var $buttons = $("div[name=buttons]", $win);
		$("button[name=cancel]", $buttons).click(function() {
			close();
		});
		$("button[name=ok]", $buttons).click(function() {
			saveSettingsData();
			close();
		});
		$("button[name=apply]", $buttons).click(function() {
			saveSettingsData();
		});

		$("div.color-button", $win).click(function() {
			$("#overlay").show();
			var name = $(this).attr("name");
			$("#color-picker-win")
				.show()
				.bind("colorpick", function(e, color) {
					$("input[name=" + name + "-hue]", $win).val((color.h / 360).toFixed(2));
					$("input[name=" + name + "-saturation]", $win).val((color.s / 100).toFixed(2));
					$("input[name=" + name + "-lightness]", $win).val((color.l / 100).toFixed(2));
					$("div[name=" + name + "]", $win)
						.css("backgroundColor", "rgb(" + color.r + "," + color.g + "," + color.b + ")");
					$(this).unbind(e);
					$(this).hide();
				});
		});

	}

	function showSettingsWindow() {

		var color = vis.settings.backgroundColor;

		var $win = $("#preset-settings-win");

		var hue = parseFloat(color.hue),
			saturation = parseFloat(color.saturation),
			lightness = parseFloat(color.lightness);

		$("input[name=color-hue]", $win).val(color.hue);
		$("input[name=color-saturation]", $win).val(color.saturation);
		$("input[name=color-lightness]", $win).val(color.lightness);
		if (!isNaN(hue) && !isNaN(saturation) && !isNaN(lightness)) {
			$("div[name=color]", $win).css(
				"backgroundColor",
				"hsl(" + ((hue*360)>>0) + "," + ((saturation*100)>>0) + "%," + ((lightness*100)>>0) + "%)");
		} else {
			$("div[name=color]", $win).css("backgroundColor", "");
		}

		$("#overlay").show();
		$win.show();
	}

	function saveSettingsData() {

		var $win = $("#preset-settings-win");

		function getField(name) {
			return $("input[name=" + name + "]", $win);
		}

		vis.settings.backgroundColor.hue = getField("color-hue").val();
		vis.settings.backgroundColor.saturation = getField("color-saturation").val();
		vis.settings.backgroundColor.lightness = getField("color-lightness").val();

		vis.scene.updateSceneSettings();

		if (vis.scene.isPaused()) {
			vis.scene.draw();
		}
	}

	return {
		setup : setup,
		show : showSettingsWindow
	};

})();