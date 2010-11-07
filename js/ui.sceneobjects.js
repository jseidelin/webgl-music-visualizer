/* global vis,$ */

vis.ui.sceneobjects = (function() {

	function setup() {
		var $win = $("#objects-win");
		$("ul[name=scene-objects]", $win)
			.sortable()
			.click(function(e) {
				if (e.target.tagName === "LI") {
					if ($(e.target).data("object").selected) {
						$(e.target).data("object").selected = false;
					} else {
						$(this).children().each(function(){
							$(this).data("object").selected = false;
						});
						$(e.target).data("object").selected = true;
					}
				} else if (e.target.tagName === "UL") {
					$(e.target).children().each(function() {
						$(this)
							.removeClass("selected")
							.data("object").selected = false;
					});
				}
			})
			.dblclick(function(e) {
				if (e.target.tagName === "LI") {
					setTimeout(function() {
						$(e.target).parent().children().each(function() {
							$(this)
								.removeClass("selected")
								.data("object").selected = false;
						});
						$(e.target)
							.addClass("selected")
							.data("object").selected = true;
					},1);
					vis.ui.editobject.show($(e.target).data("object"));
				}
			});

		var $buttons = $("#objects-win div[name=buttons]");

		$("button[name=add]", $buttons).click(function() {
			$("#add-object-win").show();
			$("#overlay").show();
		});

		$("button[name=edit]", $buttons).click(function() {
			var $selected = $("ul[name=scene-objects]", $win).children(".selected");
			if ($selected.length > 0) {
				vis.ui.editobject.show($selected.data("object"));
			}
		});

		$("button[name=delete]", $buttons).click(function() {
			var $selected = $("ul[name=scene-objects]", $win).children(".selected");
			if ($selected.length > 0) {
				var obj = $selected.data("object");
				if (window.confirm("This will complete remove the object \"" + obj.name + "\". This action cannot be undone.")) {
					vis.scene.removeObject(obj);
					updateObjectList();
				}
			}
		});

	}

	function updateObjectList() {
		var $win = $("#objects-win");
		var objects = vis.scene.getObjects().concat(vis.scene.getLights());
		var $list = $("ul[name=scene-objects]", $win);
		$list.html("");
		for (var i=0;i<objects.length;i++) {
			var obj = objects[i];
			$list.append(
				$("<li>")
					.html(obj.name + " (" + obj.type + ")")
					.data("object", obj)
			);
		}
	}

	return {
		setup : setup,
		update : updateObjectList
	};

})();