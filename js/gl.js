/* global vis,$,WebGLDebugUtils,Matrix,GL */
vis.gl = (function() {

var settings = {
	showFps : false,
	fpsLimit : 30,
	shaderUrl : "shaders/",
	textureUrl : "textures/",
	maxLogLines : 25
};

var canvas, gl;

var activeScene;

var textureImages = [];

var paused = false;
var fps = 0,
	fpsHistory = [],
	fpsMaxFrames = 100,
	lastTime = 0;

function throwOnGLError(err, funcName, args) {
	args = Array.prototype.slice.apply(args);
	var str = WebGLDebugUtils.glEnumToString(err) + " was caused by call to " + funcName + " - args: [" + args.toString() + "]";
	vis.error(str);
	throw str;
}

function setup() {

	canvas = document.getElementById("screen");
	if (!canvas.getContext) {
		return false;
	}
	gl = canvas.getContext("experimental-webgl");
	if (!gl) {
		return false;
	}
	if (vis.settings.debug) {
		// Need to include webgl-debug.js (see http://khronos.org/webgl/wiki/Debugging)
		// to call the following.
		gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);
	}

	if (!gl) {
		vis.error("Could not get 3d context, is WebGL enabled?", "red");
		return false;
	}

	gl.clearDepth(1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	testFlipFragCoord(gl);
	testHasPointCoord(gl);

	canvas.offset = $(canvas).offset();

	setInterval(function() {
		var totalTime = 0;
		for (var i=0;i<fpsHistory.length;i++) {
			totalTime += fpsHistory[i];
		}
		fps = fpsHistory.length / totalTime * 1000;
	},500);

	return true;
}

function processShaderIncludes(source) {
	var error = false;

	source = source.replace(/\/\*INCLUDE ((.*)\..*)\*\//g,
		function(a,fileName,name){
			var incSource = vis.data.shaders[fileName];
			if (incSource)	{
				return incSource;
			} else {
				vis.error("Could not find source for shader include [" + fileName + "]");
				error = true;
				return "";
			}
		}
	);

	source = source.replace("/*GET_POINT_COORD_FS*/",
		"vec2 getPointCoord() {\r\n" + (testHasPointCoord(gl) ?
			"	vec2 point = (gl_PointCoord - 0.5) * 2.0;\r\n" +
			(!testFlipFragCoord(gl) ? "point.y *= -1.0;\r\n" : "") +
			"	return point;\r\n"
		:
			"	vec2 frag = vec2(gl_FragCoord.xy);\r\n" +
			(testFlipFragCoord(gl) ? "frag.y = uViewport.w - frag.y;\r\n" : "") +
			"	return vec2(\r\n" +
			"		((frag.x - vPoint.x) / (vPoint.w * 2.0) - 0.5) * 2.0,\r\n" +
			"		((frag.y - vPoint.y) / (vPoint.w * 2.0) - 0.5) * 2.0\r\n" +
			"	);\r\n"
		) + "}\r\n"
	);

	if (!testHasPointCoord(gl)) {
		source = source.replace("/*GET_POINT_COORD_VS*/",
			"vPoint.w = gl_PointSize * 0.5;\r\n" +
			"vec2 windowHalf = uViewport.zw * 0.5;\r\n" +
			"vec2 screenPos = (gl_Position.xy / gl_Position.w + 1.0) / 2.0;\r\n" +
			"vPoint.x = screenPos.x * uViewport.z - vPoint.w;\r\n" +
			"vPoint.y = screenPos.y * uViewport.w - vPoint.w;\r\n"
		);
	}

	if (error) {
		return false;
	} else {
		return source;
	}
}

// creates a shader object of type shaderType
// from the given source
function createShader(shaderType, source) {
	source = processShaderIncludes(source);

	if (source === false) {
		vis.error("Where was a problem processing shader includes");
		return false;
	}
	var shader = gl.createShader(shaderType === "vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		vis.log(source);
		vis.error(gl.getShaderInfoLog(shader));
		return null;
	}
	shader.source = source;
	return shader;
}


function createProgram(vertexShader, fragmentShader) {
	var program = gl.createProgram();

	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);

	gl.linkProgram(program);
	if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
		vis.log("Program successfully created and linked.");
	} else {
		console.log(gl.getProgramInfoLog(program));
		vis.error("Program creation failed.");
		vis.error(gl.getProgramInfoLog(program));
		vis.log(vertexShader.source);
		vis.log(fragmentShader.source);
	}
	return program;
}


// creates a 2D GL texture object, image must be power of two
function createTexture(image) {

	var tex = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, tex);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	//gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
	return tex;
}



function tick() {
	var now = new Date().getTime();
	var delta = now - lastTime;
	fpsHistory.push(delta);
	if (fpsHistory.length > fpsMaxFrames) {
		fpsHistory.shift();
	}
	lastTime = now;
}


function setModelView(program, mv) {
	var loc = getUniformLocation(program, "uModelViewMatrix");
	if (loc !== null) {
		gl.uniformMatrix4fv(
			loc,
			false,
			new Float32Array(mv.flatten())
		);
	}
	return mv;
}


function setProjection(program, camera) {
	var perspective = Matrix.Perspective(camera.fov, camera.aspect, 0.1, 10000);

	var projection = perspective;
	var loc = getUniformLocation(program, "uProjMatrix");
	if (loc !== null) {
		gl.uniformMatrix4fv(
			loc,
			false,
			new Float32Array(projection.flatten())
		);
	}
	return projection;
}

function setNormalMatrix(program, mv) {
	var normalMatrix = mv.inverse().transpose();
	var loc = getUniformLocation(program, "uNormalMatrix");
	if (loc !== null) {
		gl.uniformMatrix4fv(
			loc,
			false,
			new Float32Array(normalMatrix.flatten())
		);
	}
	return normalMatrix;
}


/*
 * Uniforms
 */

function setUniform(functionToCall, originalArgs) {
	var program = originalArgs[0];
	var name = originalArgs[1];
	if (typeof program[name] === "undefined") {
		program[name] = getUniformLocation(program, name);
	}
	var location = program[name];

	if (location !== null && location !== -1) {
		var args = [location];
		for (var i=2;i<originalArgs.length;i++) {
			args.push(originalArgs[i]);
		}
		gl[functionToCall].apply(gl, args);
	} else {
		//vis.error("No uniform location for " + name);
	}
}

function setUniform1i()  { setUniform("uniform1i", arguments);  }
function setUniform1iv() { setUniform("uniform1iv", arguments); }
function setUniform1f()  { setUniform("uniform1f", arguments);  }
function setUniform1fv() { setUniform("uniform1fv", arguments); }
function setUniform2i()  { setUniform("uniform2i", arguments);  }
function setUniform2iv() { setUniform("uniform2iv", arguments); }
function setUniform2f()  { setUniform("uniform2f", arguments);  }
function setUniform2fv() { setUniform("uniform2fv", arguments); }
function setUniform3i()  { setUniform("uniform3i", arguments);  }
function setUniform3iv() { setUniform("uniform3iv", arguments); }
function setUniform3f()  { setUniform("uniform3f", arguments);  }
function setUniform3fv() { setUniform("uniform3fv", arguments); }
function setUniform4i()  { setUniform("uniform4i", arguments);  }
function setUniform4iv() { setUniform("uniform4iv", arguments); }
function setUniform4f()  { setUniform("uniform4f", arguments);  }
function setUniform4fv() { setUniform("uniform4fv", arguments); }
function setUniformMatrix4fv() { setUniform("uniformMatrix4fv", arguments); }
function setUniformMatrix3fv() { setUniform("uniformMatrix3fv", arguments); }

function getUniformLocation(program, name) {
	if (typeof program[name] === "undefined" || program[name] === null) {
		program[name] = gl.getUniformLocation(program, name);
	}
	return program[name];
}

/*
 * Attribs
 */

function getAttribLocation(program, name) {
	if (typeof program[name] === "undefined" || program[name] === null) {
		program[name] = gl.getAttribLocation(program, name);
	}
	return program[name];
}

/*
 * Buffers
 */

function enableBuffer(program, attribName, data, n) {
	var attribLocation = program[attribName] || getAttribLocation(program, attribName);
	if (attribLocation > -1) {
		gl.bindBuffer(gl.ARRAY_BUFFER, data);
		gl.enableVertexAttribArray(attribLocation);
		gl.vertexAttribPointer(attribLocation, n, gl.FLOAT, false, 0, 0);
	}
}

function disableBuffer(program, attribName) {
	var attribLocation = program[attribName] || getAttribLocation(program, attribName);
	if (attribLocation > -1) {
		gl.disableVertexAttribArray(attribLocation);
	}
}

function drawElements(data, n, type) {
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data);
	gl.drawElements(type, n, gl.UNSIGNED_SHORT, 0);
}

function testFlipFragCoord() {
	if (typeof gl.flipFragCoord !== "undefined") {
		return gl.flipFragCoord;
	}
	vis.log("Testing gl_FragCoord y-axis");

	var fragSrc = "" +
		"#ifdef GL_ES\r\n" +
		"precision highp float;\r\n" +
		"#endif\r\n" +
		"void main(void) {\r\n" +
		"	gl_FragColor = (gl_FragCoord.x < 1.0 && gl_FragCoord.y < 1.0) ? vec4(1.0) : vec4(0.0);\r\n" +
		"}\r\n";
	var vertSrc = "" +
		"attribute vec2 aVertex;\r\n" +
		"void main(void) {\r\n" +
		"	gl_Position = vec4(aVertex, 1.0, 1.0);\r\n" +
		"}\r\n";


	var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragShader, fragSrc);
	gl.compileShader(fragShader);

	var vertShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertShader, vertSrc);
	gl.compileShader(vertShader);

	var program = createProgram(vertShader, fragShader);
	gl.useProgram(program);

	var screen = vis.geometry.quad(gl, 2);
	gl.viewport(0,0,gl.canvas.width,gl.canvas.height);
	gl.clear(gl.COLOR_BUFFER_BIT);
	enableBuffer(program, "aVertex", screen.vertexObject, 3);
	drawElements(screen.indexObject, screen.numIndices, gl.TRIANGLE_STRIP);

	var pixel = new Uint8Array(4);
	gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
	gl.flipFragCoord = (pixel[0] !== 255);

	vis.log("gl_FragCoord result: " + gl.flipFragCoord);
	return gl.flipFragCoord;
}


function testHasPointCoord() {
	if (typeof gl.hasPointCoord !== "undefined") {
		return gl.hasPointCoord;
	}
	vis.log("Testing for gl_PointCoord");
	var fragSrc = "" +
		"#ifdef GL_ES\r\n" +
		"precision highp float;\r\n" +
		"#endif\r\n" +
		"void main(void) {\r\n" +
		"	gl_FragColor = vec4(gl_PointCoord.x);\r\n" +
		"}\r\n";
	try {
		var shader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(shader, fragSrc);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			gl.hasPointCoord = false;
		} else {
			gl.hasPointCoord = true;
		}
	} catch(e) {
		gl.hasPointCoord = false;
	}
	vis.log("gl_PointCoord result: " + gl.hasPointCoord);
	return gl.hasPointCoord;
}


/*
 * Return public interface
 */

return {
	setup : setup,

	getContext : function() { return gl; },

	setModelView : setModelView,
	setProjection : setProjection,
	setNormalMatrix : setNormalMatrix,

	createTexture : createTexture,
	getTextureImage : function(id) {
		return textureImages[id];
	},

	settings : settings,

	createShader : createShader,
	createProgram : createProgram,

	scenes : {},
	shapes : {},
	controllers : {},

	setUniform1i : setUniform1i,
	setUniform1iv : setUniform1iv,
	setUniform1f : setUniform1f,
	setUniform1fv : setUniform1fv,
	setUniform2i : setUniform2i,
	setUniform2iv : setUniform2iv,
	setUniform2f : setUniform2f,
	setUniform2fv : setUniform2fv,
	setUniform3i : setUniform3i,
	setUniform3iv : setUniform3iv,
	setUniform3f : setUniform3f,
	setUniform3fv : setUniform3fv,
	setUniform4i : setUniform4i,
	setUniform4iv : setUniform4iv,
	setUniform4f : setUniform4f,
	setUniform4fv : setUniform4fv,
	setUniformMatrix4fv : setUniformMatrix4fv,
	setUniformMatrix3fv : setUniformMatrix3fv,

	getUniformLocation : getUniformLocation,

	getAttribLocation : getAttribLocation,

	enableBuffer : enableBuffer,
	disableBuffer : disableBuffer,
	drawElements : drawElements,

	testFlipFragCoord : testFlipFragCoord,
	testHasPointCoord : testHasPointCoord,

	tick : tick,
	getFps : function() { return fps; }
};


})();


