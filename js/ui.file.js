/* global vis,$ */

vis.ui.file = (function() {

	function setup() {

		// save
		$("#io-win button[name=save]").click(function() {
			$("#overlay").show();
			$("#save-win textarea").val(
				vis.scene.saveToString()
			);
			$("#save-win").show();
		});

		// reset
		$("#io-win button[name=reset]").click(function() {
			if (window.confirm("This will clear the scene of all objects.")) {
				vis.scene.reset();
				vis.ui.sceneobjects.update();
			}
		});


		$("#save-win button[name=close]").click(function() {
			$("#save-win").hide();
			$("#overlay").hide();
		});

		// load

		$("#io-win button[name=load]").click(function() {
			$("#overlay").show();
			$("#load-win").show();
		});

		$("#load-json-win textarea").click(function() {
			if (this.value === this.defaultValue) {
				this.select();
			}
		});

		$("#save-win textarea").click(function() {
			this.select();
		});

		$("#load-win button[name=load-json]").click(function() {
			$("#load-json-win textarea").val($("#load-json-win textarea")[0].defaultValue);
			$("#load-win").hide();
			$("#load-json-win").show();
			$("#load-json-win textarea").focus();
		});
		$("#load-win button[name=cancel]").click(function() {
			$("#load-win").hide();
			$("#overlay").hide();
		});
		$("#load-json-win button[name=cancel]").click(function() {
			$("#load-json-win").hide();
			$("#overlay").hide();
		});
		$("#load-json-win button[name=load]").click(function() {
			vis.ui.main.waitWindow(function() {
				var str = $("#load-json-win textarea").val();
				vis.scene.loadFromString(str);
				vis.ui.sceneobjects.update();
				$("#load-json-win").hide();
				$("#overlay").hide();
			}, "#load-json-win");
		});

		var $exampleList = $("#load-win ul[name=examples]");
		vis.data.presets.forEach(function(p) {
			$exampleList.append(
				$("<li>")
					.attr("title", p.name)
					.attr("name", p.name)
					//.css("backgroundImage", "url(" + p.thumb + ")")
					.css("backgroundPosition", -(p.thumb * 64) + "px 0")
					.click(function(e) {
						$.ajax({
							url : p.file,
							dataType : "text",
							cache : false,
							success : function(text) {
								vis.ui.main.waitWindow(function() {
									vis.scene.loadFromString(text);
									vis.ui.sceneobjects.update();
									$("#overlay").hide();
									$("#load-win").hide();
								}, "#load-win");
							},
							error : function() {
								vis.error("Failed loading preset : " + p.file);
							}
						});
					})
			);
		});
	}

	return  {
		setup : setup
	};
})();