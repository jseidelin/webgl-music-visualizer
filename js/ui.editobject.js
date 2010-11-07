/* global vis,$ */

vis.ui.editobject = (function() {

	var editObject;

	function close() {
		$("#overlay, #edit-object-win, #color-picker-win").hide();
	}

	function setup() {
		var $buttons = $("#edit-object-win div[name=buttons]");
		$("button[name=cancel]", $buttons).click(function() {
			close();
		});
		$("button[name=ok]", $buttons).click(function() {
			saveAndClose();
		});
		$("button[name=apply]", $buttons).click(function() {
			vis.ui.main.waitWindow(function() {
				saveEditObjectData();
			}, "#edit-object-win");
		});

		$("#edit-object-win div.color-button").click(function() {
			$("#overlay").show();
			var name = $(this).attr("name");
			$("#color-picker-win")
				.show()
				.bind("colorpick", function(e, color) {
					var $win = $("#edit-object-win");
					$("input[name=" + name + "-hue]", $win).val((color.h / 360).toFixed(2));
					$("input[name=" + name + "-saturation]", $win).val((color.s / 100).toFixed(2));
					$("input[name=" + name + "-lightness]", $win).val((color.l / 100).toFixed(2));
					$("div[name=" + name + "]", $win)
						.css("backgroundColor", "rgb(" + color.r + "," + color.g + "," + color.b + ")");
					$(this).unbind(e);
					$(this).hide();
				});

		});

		$("#edit-object-win").keydown(function(e) {
			var $target = $(e.target);
			if (e.keyCode === 13 && $target.attr("tagName") === "INPUT" && $target.attr("type") === "text") {
				saveAndClose();
			}
		});

		// populate texture list in edit window
		var $textureList = $("#edit-object-win div[name=texture-list]");
		var $tex = $("<div>")
			.attr("name", "");
		$textureList.append($tex);
		for (var i=0;i<vis.data.textures.length;i++) {
			var texture = vis.data.textures[i],
				ty = -(i % 8) * 64,
				tx = -((i / 8)>>0) * 64;
			$tex = $("<div>")
				.attr("name", texture.name)
				//.append($("<img src='textures/thumbs/" + texture.file + "'>"));
				.css("backgroundPosition", ty + "px " + tx + "px");
			$textureList.append($tex);
		}
		$textureList.children().click(function(e) {
			$(this).parent().children().removeClass("selected");
			$(this).addClass("selected");
			$("#edit-object-win input[name=texture]").val($(this).attr("name"));
		});


	}

	function saveAndClose() {
		vis.ui.main.waitWindow(function() {
			if (saveEditObjectData()) {
				close();
			}
		}, "#edit-object-win");
	}

	function showEditWindow(obj) {
		editObject = obj;

		var $win = $("#edit-object-win");

		$("ul.tabs > li > div", $win).hide();
		$("ul.tabs > li[name=properties] > div", $win).show();
		$("ul.tabs > li[name=help] > div", $win).show();
		$("ul.tabs > li[data-types=" + obj.type + "] > div", $win).show();

		$("input.modifier", $win)
			.removeClass("error")
			.attr("title", "");

		var $allSections = $("ul[name=property-sections] > li" , $win);
		$allSections.hide();
		$("input", $allSections).attr("data-enabled", false);

		var $sections = $("ul[name=property-sections]", $win);
		$sections = $(">li[data-types~=" + obj.type + "],>li[data-types=all]" , $sections);
		$("input", $sections).attr("data-enabled", true);
		$sections.show();

		var isGeom = ["sphere", "cube", "cylinder", "plane", "torus"].indexOf(obj.type) > -1;
		var isParticles = obj.type === "particles";

		$("#object-properties-type").html(obj.type);
		$("#object-properties-name").val(obj.name);
		$("input[name=enabled]", $win).attr("checked", obj.enabled);

		$("input[name=translation-x]", $win).val(obj.translationX);
		$("input[name=translation-y]", $win).val(obj.translationY);
		$("input[name=translation-z]", $win).val(obj.translationZ);

		var hue = parseFloat(obj.color.hue),
			saturation = parseFloat(obj.color.saturation),
			lightness = parseFloat(obj.color.lightness);

		$("input[name=color-hue]", $win).val(obj.color.hue);
		$("input[name=color-saturation]", $win).val(obj.color.saturation);
		$("input[name=color-lightness]", $win).val(obj.color.lightness);
		if (!isNaN(hue) && !isNaN(saturation) && !isNaN(lightness)) {
			$("div[name=color]", $win).css(
				"backgroundColor",
				"hsl(" + ((hue*360)>>0) + "," + ((saturation*100)>>0) + "%," + ((lightness*100)>>0) + "%)");
		} else {
			$("div[name=color]", $win).css("backgroundColor", "");
		}

		if (isGeom) {
			$("div[name=texture-list]", $win).children().removeClass("selected");
			var texture = obj.texture || "";
			$("div[name=texture-list] div[name=" + texture + "]", $win).addClass("selected");
			$("input[name=texture]", $win).val(texture);
			$("input[name=texture-repeat-x]", $win).val(obj.textureRepeatX);
			$("input[name=texture-repeat-y]", $win).val(obj.textureRepeatY);

			$("input[name=lighting]", $win).attr("checked", obj.lighting);
			$("input[name=specular]", $win).attr("checked", obj.specular);
			$("input[name=smooth]", $win).attr("checked", obj.smooth);

			$("input[name=scaling-x]", $win).val(obj.scalingX);
			$("input[name=scaling-y]", $win).val(obj.scalingY);
			$("input[name=scaling-z]", $win).val(obj.scalingZ);

			$("input[name=blur]", $win).attr("checked", obj.blur);
			$("input[name=blur-amount]", $win).val(obj.blurAmount);
		}

		if (isGeom || isParticles) {
			$("input[name=rotation-x]", $win).val(obj.rotationX);
			$("input[name=rotation-y]", $win).val(obj.rotationY);
			$("input[name=rotation-z]", $win).val(obj.rotationZ);

			$("input[name=glow]", $win).attr("checked", obj.glow);
			$("input[name=glow-strength]", $win).val(obj.glowStrength);
		}

		if (isGeom || isParticles) {
			var varNames = "ABCDEFGH".split("");
			for (var i=0;i<varNames.length;i++) {
				$("input[name=variable-" + varNames[i] + "]", $win).val(obj.variables[varNames[i]]);
			}
		}

		if (isParticles) {
			$("input[name=particle-size]", $win).val(obj.particleSize);
			$("input[name=particle-number]", $win).val(obj.particleNumber);
		}

		if (obj.type === "torus") {
			$("input[name=torus-radius]", $win).val(obj.torusRadius);
			$("input[name=torus-thickness]", $win).val(obj.torusThickness);
		}

		if (obj.type === "cylinder") {
			$("input[name=cylinder-radius]", $win).val(obj.cylinderRadius);
			$("input[name=cylinder-height]", $win).val(obj.cylinderHeight);
		}

		$("input", $win).each(function() {
			$(this).data("originalValue",
				$(this).attr("type") === "checkbox" ? $(this).attr("checked") : $(this).val()
			);
		});
		$("input", $win).trigger("change");

		$("#overlay").show();
		$("#edit-object-win").show();
	}

	function saveEditObjectData() {
		var obj = editObject;
		var geometryDirty = false;

		var isGeom = ["sphere", "cube", "cylinder", "plane", "torus"].indexOf(obj.type) > -1;
		var isParticles = obj.type === "particles";

		var $win = $("#edit-object-win");

		// has anything even changed?
		var dirty = false;
		$("input", $win).each(function() {
			var val = $(this).attr("type") === "checkbox" ? $(this).attr("checked") : $(this).val();
			if (val !== $(this).data("originalValue")+"") {
				dirty = true;
			}
		});
		if (!dirty) {
			return true;
		}

		var $fields = $("input[data-enabled=true].modifier", $win);
		// clear all previous field errors
		$fields.removeClass("error").attr("title", "");
		// validate all modifier fields
		var errors = 0;
		$fields.each(function() {
			var $field = $(this);
			var code = $field.val().trim();
			if (code === "") code = "0.0";
			var valid = vis.scene.validateModifier(code);
			if (valid !== true) {
				$field.addClass("error");
				$field.attr("title", valid+"");
				// open the section (in case it's been closed) so the invalid field is visible
				$field.parents("ul[name=property-sections] li").children("div").show();
				errors++;
			}
		});
		if (errors > 0) {
			return false;
		}

		// ok, all clear

		function getField(name) {
			return $("input[name=" + name + "][data-enabled=true]", $win);
		}

		obj.name = getField("name").val();
		obj.enabled = getField("enabled").attr("checked");

		obj.translationX = getField("translation-x").val();
		obj.translationY = getField("translation-y").val();
		obj.translationZ = getField("translation-z").val();

		obj.color.hue = getField("color-hue").val();
		obj.color.saturation = getField("color-saturation").val();
		obj.color.lightness = getField("color-lightness").val();

		if (isGeom) {
			var texture = getField("texture").val();
			obj.texture = texture === "" ? null : texture;
			obj.textureRepeatX = getField("texture-repeat-x").val();
			obj.textureRepeatY = getField("texture-repeat-y").val();

			obj.lighting = getField("lighting").attr("checked");
			obj.smooth = getField("smooth").attr("checked");
			obj.specular = getField("specular").attr("checked");

			obj.scalingX = getField("scaling-x").val();
			obj.scalingY = getField("scaling-y").val();
			obj.scalingZ = getField("scaling-z").val();

			obj.blur = getField("blur").attr("checked");
			obj.blurAmount = getField("blur-amount").val();
		}

		if (isGeom || isParticles) {
			obj.rotationX = getField("rotation-x").val();
			obj.rotationY = getField("rotation-y").val();
			obj.rotationZ = getField("rotation-z").val();

			obj.glow = getField("glow").attr("checked");
			obj.glowStrength = getField("glow-strength").val();

			var varNames = "ABCDEFGH".split("");
			for (var i=0;i<varNames.length;i++) {
				obj.variables[varNames[i]] = getField("variable-" + varNames[i]).val();
			}
		}

		if (isParticles) {
			obj.particleSize = getField("particle-size").val();
			if ($("input[name=particle-number]", $win).val() !== $("input[name=particle-number]", $win).data("originalValue")) {
				obj.particleNumber = parseInt($("input[name=particle-number]", $win).val(), 10) || 1.0;
				geometryDirty = true;
			}
		}

		if (obj.type === "torus") {
			if ($("input[name=torus-radius]", $win).val() !== $("input[name=torus-radius]", $win).data("originalValue")) {
				obj.torusRadius = parseFloat($("input[name=torus-radius]", $win).val()) || 1.0;
				geometryDirty = true;
			}
			if ($("input[name=torus-thickness]", $win).val() !== $("input[name=torus-thickness]", $win).data("originalValue")) {
				obj.torusThickness = parseFloat($("input[name=torus-thickness]", $win).val()) || 1.0;
				geometryDirty = true;
			}
		}

		if (obj.type === "cylinder") {
			if ($("input[name=cylinder-radius]", $win).val() !== $("input[name=cylinder-radius]", $win).data("originalValue")) {
				obj.cylinderRadius = parseFloat($("input[name=cylinder-radius]", $win).val()) || 1.0;
				geometryDirty = true;
			}
			if ($("input[name=cylinder-height]", $win).val() !== $("input[name=cylinder-height]", $win).data("originalValue")) {
				obj.cylinderHeight = parseFloat($("input[name=cylinder-height]", $win).val()) || 1.0;
				geometryDirty = true;
			}
		}

		var res = vis.scene.updateObject(obj, geometryDirty);
		if (res !== true) {
			alert("Error while updating object. Check the modifier fields for wrong function arguments, etc.");
			return false;
		}

		vis.ui.sceneobjects.update();
		if (vis.scene.isPaused()) {
			vis.scene.draw();
		}

		obj.selected = false;
		return true;
	}

	return {
		setup : setup,
		show : showEditWindow
	};

})();