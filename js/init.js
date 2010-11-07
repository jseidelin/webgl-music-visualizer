/* global vis,$ */

vis.init = function() {

	var canvas = $("#screen")[0];
	canvas.width = 1024;
	canvas.height = 512;

	if (typeof sandbox === "undefined") {
		var iframe = document.createElement("iframe");
		iframe.style.display = "none";
		document.body.appendChild(iframe);
		frames[frames.length - 1].document.write(
			"<script>parent.sandbox={eval:function(s){return eval(s)}}<\/script>"
		);
		frames[frames.length - 1].document.close();
	}

	vis.settings = {
		backgroundColor : {
			hue : "0.0", saturation : "0.0", lightness : "0.0"
		},
		aspect : $(canvas).width() / $(canvas).height(),
		width : canvas.width,
		height : canvas.height,
		debug : (location.hash === "#debug")
	};

	// setup GL canvas
	if (!vis.gl.setup()) {
		$("#main").hide();
		$("#webgl-error").show();
		vis.error("Could not initialize WebGL canvas!");
		return;
	}

	// load shader data
	var numLoaders = 0;
	var check = function() {
		if (--numLoaders === 0) {
			step2();
		}
	};

	for (var name in vis.data.shaders) {
		if (vis.data.shaders.hasOwnProperty(name)) {
			numLoaders++;
			(function(name) {
				$.ajax({
					url : "./shaders/" + name,
					dataType : "text",
					cache : false,
					success : function(text) {
						vis.log("Loaded shader: " + name);
						vis.data.shaders[name] = text;
						check();
					},
					error : function() {
						vis.error("Failed loading shader: " + name);
						check();
					}
				});
			})(name);
		}
	}

	function step2() {
		vis.input.setup();
		vis.scene.setup();

		// setup ui
		for (var a in vis.ui) {
			if (vis.ui.hasOwnProperty(a) && a !== "audioplayer" && a !== "editobject") {
				vis.ui[a].setup();
			}
		}

		setTimeout(function() {
			vis.ui.editobject.setup();
		}, 500);


		vis.loadScript("js/extern/soundmanager2.js", function() {
			vis.audio.setup();
			vis.ui.audioplayer.setup();
		});

		setInterval(function() {
			var fps = vis.gl.getFps().toFixed(1);
			$("#scene h3").html("Scene <span class='fps'>" + fps + " fps</span>");
			$("#fps").html(fps);
			//console.log(fps);
		},500);

		vis.scene.run();

	}

};