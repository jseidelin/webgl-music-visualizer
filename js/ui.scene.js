/* global vis,$ */

vis.ui.scene = (function() {

	var fullscreen = false;

	function setup() {

		$("#screen").dblclick(function() {
			if (fullscreen) {
				$("body").remove($(this));
				$("#scene .content").append($(this));
				$(this).removeClass("fullscreen");
				$("#main").show();
				vis.scene.resetDimensions();
			} else {
				$("#main").hide();
				$(this).parent().get(0).removeChild(this);
				$("body").append($(this));
				var w = window.innerWidth;// * this.width / this.height;
				var h = window.innerHeight;
				$(this).addClass("fullscreen");
				vis.scene.resize(w, h);
			}
			fullscreen = !fullscreen;
		});

		$(window).resize(function() {
			if (fullscreen) {
				vis.scene.resize(window.innerWidth, window.innerHeight);
			}
		});
	}

	return {
		setup : setup
	};

})();