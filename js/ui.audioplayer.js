/* global vis,$ */

vis.ui.audioplayer = (function() {

	function setup() {

		vis.audio.onprogress = function(val) {
			$("#music-win div[name=progress-bg]").width(val + "%");
		};
		var $buttons = $("#music-win div[name=buttons]");

		$("button[name=pause]", $buttons).click(function() {
			vis.audio.pause();
		});
		$("button[name=stop]", $buttons).click(function() {
			vis.audio.stop();
		});
		$("button[name=play]", $buttons).click(function() {
			var $track = $("#music-win ul[name=tracks] li.selected");
			if ($track.length) {
				playTrack($track);
			}
		});

		$("#music-win div[name=progress]").click(function(e) {
			var x = e.pageX - $(this).offset().left;
			vis.audio.setPosition(x / $(this).width());
		});

		for (var i=0;i<vis.data.music.length;i++) {
			$("#music-win ul[name=tracks]").append(
				$("<li>")
					.data("filename", vis.data.music[i].file)
					.data("stream", vis.data.music[i].stream)
					.html(vis.data.music[i].name)
					.addClass(i === 0 ? "selected" : "")
					.dblclick(function(e) {
						playTrack($(this));
					})
			);
		}
	}

	function playTrack($track) {
		var file = $track.data("filename");
		var stream = $track.data("stream");
		var isLoading = vis.audio.play(file, stream, function() {
			$("#music-win div[name=buttons] button").attr("disabled", false);
		});
		if (isLoading)
			$("#music-win div[name=buttons] button").attr("disabled", true);
	}

	return {
		setup : setup
	};

})();