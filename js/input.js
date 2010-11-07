/* global vis,$,$L,$V */

vis.input = (function() {
	var mouseX = 0,
		mouseY = 0,
		mouseLeftDown = false,
		mouseRightDown = false,
		mouseDownX = 0,
		mouseDownY = 0,
		vecUp = $V([0,1,0]),
		lineUp = $L($V([0,0,0]), $V([0,1,0])),
		zoomDir = 0,
		rotationDirX = 0,
		rotationDirY = 0,
		events;

	function setup() {

		var scene = vis.scene,
			$canvas = $("#screen"),
			pos = $canvas.offset();

		$(document).keydown(function(e) {
			if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") {
				return;
			}
			switch (e.keyCode) {
				case 33:	// page up
					scene.camera.position = scene.camera.position.add($V([0,1,0]));
					scene.camera.target = scene.camera.target.add($V([0,1,0]));
					break;
				case 34:	// page down
					scene.camera.position = scene.camera.position.add($V([0,-1,0]));
					scene.camera.target = scene.camera.target.add($V([0,-1,0]));
					break;
				case 37:	// right
					rotationDirY = -1;
					break;
				case 39:	// left
					rotationDirY = 1;
					break;
				case 38: // up
					rotationDirX = -1;
					break;
				case 40: // down
					rotationDirX = 1;
					break;
				case 107: // +
					zoomDir = 1;
					break;
				case 109: // -
					zoomDir = -1;
					break;
				case 80: // p
					vis.scene.pause();
					break;
				case 27: // esc
					vis.ui.main.closeAllWindows();
					break;
				case 176 : // next
					$("#music-win ul[name=tracks] li.selected").next().trigger("dblclick");
					break;
				case 177 : // previous
					$("#music-win ul[name=tracks] li.selected").prev().trigger("dblclick");
					break;
				case 179 : // play
					if (vis.audio.isPlaying()) {
						vis.audio.pause();
					} else {
						$("#music-win ul[name=tracks] li.selected").trigger("dblclick");
					}
					break;
			}
		})
		.keyup(function(e) {
			if (e.target.tagName === "textarea" ||e.target.tagName === "input") {
				return;
			}
			switch (e.keyCode) {
				case 37:
				case 39:
					rotationDirY = 0;
					break;
				case 38:
				case 40:
					rotationDirX = 0;
					break;
				case 107:
				case 109:
					zoomDir = 0;
					break;
			}
		});

		$canvas.mousewheel(function(e, delta) {
			var camera = scene.camera,
				forward = camera.target.subtract(camera.position);
			camera.position = camera.position.add(
				forward.x(0.02*delta)
			);
		})
		.bind("contextmenu", function(e) {
			e.preventDefault();
		})
		.mousedown(function(e) {
			mouseLeftDown = (e.button === 0);
			mouseRightDown = (e.button === 2);
			mouseDownX = mouseX;
			mouseDownY = mouseY;
			e.preventDefault();
		})
		.mouseup(function(e) {
			mouseLeftDown = (e.button === 0) ? false : mouseLeftDown;
			mouseRightDown = (e.button === 2) ? false : mouseRightDown;
		})
		.mousemove(function(e) {
			var x = e.pageX - pos.left,
				y = e.pageY - pos.top;
			mouseX = x;
			mouseY = y;
		})
		.mouseout(function(e){
			mouseLeftDown = false;
			mouseRightDown = false;
		});
	}

	function update(deltaTime) {
		var timeStep = deltaTime / 30,
			camera = vis.scene.camera,
			rect = vis.gl.getContext().canvas.getBoundingClientRect(),
			rotX, rotY, forward, side, dX, dY;

		if (rotationDirY) {
			rotY = 3 / 180 * Math.PI * rotationDirY * timeStep;

			camera.position = camera.position.rotate(rotY, lineUp);
			forward = camera.target.subtract(camera.position);
			side = forward.cross(vecUp);
			camera.up = side.cross(forward);
		}

		if (rotationDirX) {
			rotX = 3 / 180 * Math.PI * rotationDirX * timeStep;
			forward = camera.target.subtract(camera.position);
			side = forward.cross(vecUp);

			camera.position = camera.position.rotate(rotX, $L($V([0,0,0]),side));
			forward = camera.target.subtract(camera.position);
			side = forward.cross(vecUp);
			camera.up = side.cross(forward);
		}


		if (mouseLeftDown) {
			dX = mouseX - mouseDownX;
			dY = mouseY - mouseDownY;
			rotY = - dX / rect.width * Math.PI;
			rotX = - dY / rect.height * Math.PI;

			camera.position = camera.position.rotate(rotY, lineUp);
			forward = camera.target.subtract(camera.position);
			side = forward.cross(vecUp);
			camera.up = side.cross(forward);

			camera.position = camera.position.rotate(rotX, $L($V([0,0,0]),side));
			forward = camera.target.subtract(camera.position);
			side = forward.cross(vecUp);
			camera.up = side.cross(forward);

			mouseDownX = mouseX;
			mouseDownY = mouseY;
		}

		if (mouseRightDown) {
			dY = (mouseY - mouseDownY) / rect.height * 4;

			camera.position = camera.position.add($V([0,dY,0]));
			camera.target = camera.target.add($V([0,dY,0]));

			mouseDownX = mouseX;
			mouseDownY = mouseY;
		}

		if (zoomDir) {
			forward = camera.target.subtract(camera.position);
			camera.position = camera.position.add(
				forward.x(0.015 * zoomDir)
			);
		}
	}

	return {
		setup : setup,
		update : update
	};

})();
