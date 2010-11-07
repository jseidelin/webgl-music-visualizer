/* global vis,$ */

vis.ui.main = (function() {

	function setup() {
		// setup tab lists
		$("ul.tabs > li > h3").click(function(e) {
			$(this).parent().children("div").toggle();
		});

		// highlight selected item in lists
		$("ul.selectable li").live("click dblclick", function(e) {
			var $target = $(e.currentTarget);

			// yeah... some kind of rendering bug on Chrome where the
			// list items aren't properly redrawn. Hiding and showing fixes it.
			setTimeout(function() {
				$target.parent().children().removeClass("selected").hide();
				$target.addClass("selected");
			},1);
			setTimeout(function() {
				$target.parent().children().show();
			},1);
		});

		$("#overlay .tool-window").draggable({handle:"h3"});

		$("input[type=range]").bind("change", function() {
			var $this = $(this);
			$("*[name=" + $this.attr("name") + "-output]", $this.parent()).html($this.val());
		});
	}

	function waitWindow(taskFnc, id) {
		$(id + " .content").css("opacity", 0.75);
		setTimeout(function() {
			taskFnc();
			$(id + " .content").css("opacity", 1);
		}, 1);
	}

	function closeAllWindows() {
		$("#overlay .tool-window").hide();
		$("#overlay").hide();
	}

	return {
		setup : setup,
		waitWindow : waitWindow,
		closeAllWindows : closeAllWindows
	};

})();