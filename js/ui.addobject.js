/* global vis,$ */

vis.ui.addobject = (function() {

	function setup() {
		$("#add-object-win div[name=buttons] button[name=cancel]").click(function() {
			$("#overlay, #add-object-win").hide();
		});
		$("#add-object-win ul[name=object-icons]").click(function(e) {
			if (e.target.tagName === "LI") {
				$("#overlay, #add-object-win").hide();

				var obj = vis.scene.addObject($(e.target).attr("name"));
				if (obj) {
					if (vis.scene.isPaused()) {
						vis.scene.draw();
					}
					vis.ui.editobject.show(obj);
					vis.ui.sceneobjects.update();
				}
			}
		});
	}

	return {
		setup : setup
	};

})();
