jQuery.fn.center = function () {
	var $win = $(window);
   this.css("position","absolute")
		.css("top", ( $win.height() - this.outerHeight() ) / 2+$win.scrollTop() + "px")
		.css("left", ( $win.width() - this.outerWidth() ) / 2+$win.scrollLeft() + "px");
    return this;
}

jQuery.fn.showAtCenter = function () {
	this.css("position","absolute")
		.css("left", "-10000px")
		.show();
	var me = this;
	setTimeout(function() {
		me.center();
	},10);
    return this;
}