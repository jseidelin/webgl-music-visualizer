/* global vis,$V,sandbox,Matrix */

vis.scene = (function() {

	var startTime = 0,
		time = 0,
		paused = false;

	var sceneObjects = [],
		sceneLights = [],
		screenQuad;

	var rttTexture, glowTexture;

	var numLights = 0,
		maxLights = 4,
		lightData = [];

	var varNames = "ABCDEFGH".split("");

	var programs = {};

	var aspect,
		originalAspect;

	var sceneVars = {
		variableFunctions : {},
		variableValues : {}
	};

	function setup() {
		originalAspect = aspect = vis.settings.aspect;

		var gl = vis.gl.getContext();

		// setup programs

		function createProgram(fragSrc, vertSrc) {
			var frag = vis.gl.createShader("fragment", vis.data.shaders[fragSrc]);
			var vert = vis.gl.createShader("vertex", vis.data.shaders[vertSrc]);
			var program = vis.gl.createProgram(frag, vert);
			return program;
		}

		programs["blur-pass-1"] = createProgram("blur-horizontal.fs", "blur-horizontal.vs");
		programs["blur-pass-2"] = createProgram("blur-vertical.fs", "blur-vertical.vs");
		programs["screen"] = createProgram("screen.fs", "screen.vs");
		programs["solid-color"] = createProgram("color.fs", "default.vs");

		gl.clearColor(0,0,0,1);

		// screen quad
		screenQuad = vis.geometry.quad(2);

		var program = programs["screen"];
		gl.useProgram(program);

		vis.gl.enableBuffer(program, "aVertex", screenQuad.vertexObject, 3);
		vis.gl.enableBuffer(program, "aTexCoord", screenQuad.texCoordObject, 2);


		gl.activeTexture(gl.TEXTURE0);
		rttTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, rttTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		vis.gl.setUniform1i(program, "uTexture", 0);
		gl.bindTexture(gl.TEXTURE_2D, null);

		gl.activeTexture(gl.TEXTURE0);
		glowTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, glowTexture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		vis.gl.setUniform1i(program, "uTexture", 0);
		gl.bindTexture(gl.TEXTURE_2D, null);


		startTime = new Date().getTime();

	}

	function createSceneObject(type, obj) {
		if (!createSceneObject.factory[type]) {
			vis.error("Tried to add non-existent object type: " + type);
			return;
		}

		//geometryCache[type] = geometryCache[type] || createSceneObject.factory[type]();

		var id = createSceneObject.counter++;

		obj = obj || {};

		var defaults = {
			type : type,

			name : "Object #" + id,
			enabled : true,

			texture : null,
			textureRepeatX : 1,
			textureRepeatY : 1,

			lighting : true,
			smooth : true,
			specular : false,
			color : {
				hue : "0.0",
				saturation : "0.0",
				lightness : "1.0"
			},

			glow : false,
			glowStrength : "1.0",

			particleNumber : 2000,
			particleSize : "1.0",

			blur : false,
			blurAmount : "1.0",

			translationX : "0.0",
			translationY : "0.0",
			translationZ : "0.0",

			rotationX : "0.0",
			rotationY : "0.0",
			rotationZ : "0.0",

			scalingX : "1.0",
			scalingY : "1.0",
			scalingZ : "1.0",

			variables :  {A: "", B: "", C: "", D: "", E: "", F: "", G: "", H: ""},

			cylinderRadius : 0.5,
			cylinderHeight : 1,

			torusRadius : 1,
			torusThickness : 0.25
		};

		// fill out non-set properties
		for (var a in defaults) {
			if (defaults.hasOwnProperty(a) && typeof obj[a] === "undefined") {
				obj[a] = defaults[a];
			}
		}
		//var geometry = geometryCache[type];
		//obj.geometry = geometry;

		obj.geometry = createSceneObject.factory[type](obj);

		updateObject(obj);
		return obj;
	}

	createSceneObject.counter = 0;
	createSceneObject.factory = {
		cube : function() {
			return  vis.geometry.cube(1);
		},
		sphere : function() {
			return vis.geometry.sphere(1, 20, 20);
		},
		plane : function() {
			return vis.geometry.plane(10, 40, 40);
		},
		cylinder : function(obj) {
			return vis.geometry.cylinder(obj.cylinderRadius, obj.cylinderHeight, 30);
		},
		torus : function(obj) {
			return vis.geometry.torus(obj.torusRadius, obj.torusThickness, 40, 20);
		},
		light : function() {
			return vis.geometry.sphere(0.1, 8, 8);
		},
		particles : function(obj) {
			return vis.geometry.particles(obj.particleNumber);
		}
	};

	function deleteGeometry(obj) {
		var geo = obj.geometry;
		var gl = vis.gl.getContext();
		for (var a in geo) {
			if (geo.hasOwnProperty(a) && typeof geo[a] === "object") {
				try {
					if (gl.isBuffer(geo[a])) {
						gl.deleteBuffer(geo[a]);
					}
				} catch(e) {}
				try {
					if (gl.isTexture(geo[a])) {
						gl.deleteTexture(geo[a]);
					}
				} catch(e) {}
				geo[a] = null;
			}
		}
	}

	function updateObject(obj, geometryDirty) {
		if (obj.type !== "light") {
			var res = updateObjectProgram(obj);
			if (res !== true) {
				return res;
			}
		}

		if (geometryDirty) {
			deleteGeometry(obj);
			obj.geometry = createSceneObject.factory[obj.type](obj);
		}

		if (obj.texture) {
			obj.textureObject = null;
			setTexture(obj);
		} else {
			obj.textureObject = null;
		}

		updateObjectVariables(obj);

		resetAllObjectVariables();
		return true;
	}

	function resetAllObjectVariables() {
		for (var i=0;i<sceneObjects.length;i++) {
			var obj = sceneObjects[i];
			for (var a in obj.variableValues) {
				if (obj.variableValues.hasOwnProperty(a)) {
					obj.variableValues[a] = 0;
				}
			}
		}

	}

	function updateObjectProgram(obj) {

		var isGeom = ["sphere", "cube", "cylinder", "plane", "torus"].indexOf(obj.type) > -1;
		var isParticles = obj.type === "particles";

		function sanitize(str) {
			// convert all ints to floats, since that's what we use in the shaders
			str = (str+"").replace(/((\b[0-9]+)?\.)?[0-9]+\b/g, function(v){return v.indexOf(".") > -1 ? v : v+".0";});
			return str;
		}

		var numLights = 0;
		for (var i=0;i<sceneLights.length;i++) {
			if (sceneLights[i].enabled) {
				numLights++;
			}
		}

		var defines = [];
		if (obj.lighting) {
			defines.push("USELIGHTING");
			if (numLights > 0) defines.push("USELIGHT1");
			if (numLights > 1) defines.push("USELIGHT2");
			if (numLights > 2) defines.push("USELIGHT3");
			if (numLights > 3) defines.push("USELIGHT4");
			if (obj.specular) {
				defines.push("USESPECULAR");
			}
		}
		if (obj.glow) {
			defines.push("USEGLOW");
		}
		if (obj.texture) {
			defines.push("USETEXTURE");
		}
		if (parseFloat(obj.color.lightness) !== 1) {
			defines.push("USECOLOR");
		}



		var vertexSource, fragmentSource, fragmentStr;

		if (isParticles) {
			vertexSource = vis.data.shaders["base-particles.vs"];
			fragmentSource = vis.data.shaders["base-particles.fs"];
		} else {
			vertexSource = vis.data.shaders["base.vs"];
			fragmentSource = vis.data.shaders["base.fs"];
		}

		var vertexStr = "";

		vertexStr += "translateX = " + sanitize(obj.translationX) + ";\r\n";
		vertexStr += "translateY = " + sanitize(obj.translationY) + ";\r\n";
		vertexStr += "translateZ = " + sanitize(obj.translationZ) + ";\r\n";

		vertexStr += "rotateX = " + sanitize(obj.rotationX) + ";\r\n";
		vertexStr += "rotateY = " + sanitize(obj.rotationY) + ";\r\n";
		vertexStr += "rotateZ = " + sanitize(obj.rotationZ) + ";\r\n";

		if (isGeom) {
			vertexStr += "scaleX = " + sanitize(obj.scalingX) + ";\r\n";
			vertexStr += "scaleY = " + sanitize(obj.scalingY) + ";\r\n";
			vertexStr += "scaleZ = " + sanitize(obj.scalingZ) + ";\r\n";
		}

		vertexSource = vertexSource.replace("/*VERTEX_TRANSFORM*/", vertexStr);

		vertexStr = "";
		vertexStr += "color.x = " + sanitize(obj.color.hue) + ";\r\n";
		vertexStr += "color.y = " + sanitize(obj.color.saturation) + ";\r\n";
		vertexStr += "color.z = " + sanitize(obj.color.lightness) + ";\r\n";

		vertexSource = vertexSource.replace("/*COLOR*/", vertexStr);

		if (isParticles) {
			vertexStr = "size = " + sanitize(obj.particleSize) + ";\r\n";
			vertexSource = vertexSource.replace("/*PARTICLE_SIZE*/", vertexStr);
		}

		if (obj.glow) {
			fragmentStr = "glowStrength = " + sanitize(obj.glowStrength) + ";\r\n";
			fragmentSource = fragmentSource.replace("/*GLOW_STRENGTH*/", fragmentStr);
		}

		for (i = 0; i < defines.length; i++) {
			vertexSource = "#define " + defines[i] + "\r\n" + vertexSource;
			fragmentSource = "#define " + defines[i] + "\r\n" + fragmentSource;
		}

		var vertexShader,
			fragmentShader,
			program;

		vertexShader = vis.gl.createShader("vertex", vertexSource);
		if (!vertexShader) {
			vis.error("Could not create updated vertex shader");
			return false;
		}

		fragmentShader = vis.gl.createShader("fragment", fragmentSource);
		if (!fragmentShader) {
			vis.error("Could not create updated fragment shader");
			return false;
		}

		program = vis.gl.createProgram(vertexShader, fragmentShader);
		if (!program) {
			vis.error("Could not create updated program");
			return false;
		}

		if (obj.program) {
			var gl = vis.gl.getContext();
			gl.deleteProgram(obj.program);
			gl.deleteShader(obj.vertexShader);
			gl.deleteShader(obj.fragmentShader);
		}
		obj.vertexShader = vertexShader;
		obj.fragmentShader = fragmentShader;
		obj.program = program;

		obj.program.__object = obj;
		return true;

	}

	function updateObjectVariables(obj) {

		obj.variableFunctions = {};
		obj.variableValues = {};

		for (var i=0;i<varNames.length;i++) {
			obj.variableFunctions[varNames[i]] = createVariableFunction(obj.variables[varNames[i]]);
			obj.variableValues[varNames[i]] = 0;
		}

		if (obj.type === "light") {
			obj.variableFunctions["translationX"] = createVariableFunction(obj.translationX);
			obj.variableFunctions["translationY"] = createVariableFunction(obj.translationY);
			obj.variableFunctions["translationZ"] = createVariableFunction(obj.translationZ);
			obj.variableFunctions["colorHue"] = createVariableFunction(obj.color.hue);
			obj.variableFunctions["colorSaturation"] = createVariableFunction(obj.color.saturation);
			obj.variableFunctions["colorLightness"] = createVariableFunction(obj.color.lightness);
		}

	}

	function validateModifier(code) {
		var imports = { time : 1, bass : 1, mid : 1, treb : 1, beat : 1 };
		for (var a in variableImports) {
			if (variableImports.hasOwnProperty(a)) {
				if (typeof variableImports[a] === "function") {
					(function() {
						var fnc = variableImports[a];
						imports[a] = function() {
							if (arguments.length !== fnc.length) {
								throw "Wrong number of arguments to function " + a + ". Expected " + fnc.length + ", got " + arguments.length + ".";
							}
							return fnc.apply(null, arguments);
						};
					})(a);
				}
			}
		}
		var variables = {
			A:1,B:1,C:1,D:1,E:1,F:1,G:1,H:1,
			x:1,y:1,z:1
		};
		try {
			var fnc = createVariableFunction(code);
			var result = fnc(imports, variables);
			if (typeof result !== "number") {
				throw "Expression does not evaluate to a number";
			}
			if (isNaN(result)) {
				throw "Expression evaluates to NaN";
			}
			return true;
		} catch(e) {
			return e;
		}
	}

	function updateSceneSettings() {
		sceneVars.variableFunctions = {};
		sceneVars.variableValues = {};

		sceneVars.variableFunctions["colorHue"] = createVariableFunction(vis.settings.backgroundColor.hue);
		sceneVars.variableFunctions["colorSaturation"] = createVariableFunction(vis.settings.backgroundColor.saturation);
		sceneVars.variableFunctions["colorLightness"] = createVariableFunction(vis.settings.backgroundColor.lightness);
		if (paused) {
			draw();
		}
	}

	var variableImports = {};
	var mathFncs = [
		"sqrt","pow","exp","sin","cos","tan","atan","asin","acos",
		"min","max","abs","log","floor","ceil"
	];
	for (var i=0;i<mathFncs.length;i++) {
		variableImports[mathFncs[i]] = Math[mathFncs[i]];
	}
	variableImports.sign = function(n) { return n > 0 ? 1 : n < 0 ? -1 : 0;};
	variableImports.mod = function(n, d) {return n % d;};
	function createVariableFunction(str) {
		if (str === "") str = "0.0";

		function sanitize(str) {
			return str;
		}

		var fnc = sandbox.eval("(function(imports,variableValues) {with(imports){with(variableValues){ return " + sanitize(str) + "}};})");

		return fnc;
	}

	function callVariableFunction(obj, varName) {
		var fnc = obj.variableFunctions[varName];
		if (!fnc) return;
		variableImports.time = (new Date().getTime() - startTime) / 1000;
		variableImports.bass = vis.audio.data.avgBands[0];
		variableImports.mid = vis.audio.data.avgBands[1];
		variableImports.treb = vis.audio.data.avgBands[2];
		variableImports.beat = vis.audio.data.isBeat ? 1 : 0;

		var res = fnc(variableImports, obj.variableValues);
		obj.variableValues[varName] = res;
	}

	function updateLights() {
		for (var i=0;i<sceneObjects.length;i++) {
			var obj = sceneObjects[i];
			if (obj.lighting) {
				updateObjectProgram(obj);
			}
		}
	}

	function addObject(objType) {
		if (objType === "light") {
			if (numLights >= maxLights) {
				vis.error("Cannot add more lights to scene.");
				return;
			}
		}
		var obj = createSceneObject(objType);
		if (obj) {
			if (obj.type === "light") {
				numLights++;
				sceneLights.push(obj);
				updateLights();
			} else {
				sceneObjects.push(obj);
			}
			return obj;
		}
	}

	function removeObject(obj) {
		if (obj.type === "light") {
			if (sceneLights.indexOf(obj) > -1) {
				numLights--;
				sceneLights.splice(sceneLights.indexOf(obj), 1);
			}
		} else {
			if (sceneObjects.indexOf(obj) > -1) {
				deleteGeometry(obj);
				sceneObjects.splice(sceneObjects.indexOf(obj), 1);
			}
		}
		if (paused) {
			draw();
		}
	}

	function reset() {
		while (sceneObjects.length) {
			removeObject(sceneObjects[0]);
		}
		while (sceneLights.length) {
			removeObject(sceneLights[0]);
		}
		vis.settings.backgroundColor = {
			hue : "0.0", saturation : "0.0", lightness : "0.0"
		};
		createSceneObject.counter = 0;
		updateSceneSettings();
		if (paused) {
			draw();
		}
	}

	function setTexture(obj) {
		var name = obj.texture;
		var texDesc;
		for (var i=0;i<vis.data.textures.length;i++) {
			if (vis.data.textures[i].name === name) {
				texDesc = vis.data.textures[i];
			}
		}
		if (texDesc) {
			vis.log("Loading texture image: " + texDesc.file);
			var image = new Image();
			image.onload = function() {
				vis.log("Finished loading image: " + texDesc.file);
				obj.textureObject = vis.gl.createTexture(image);
				if (paused) {
					draw();
				}
			};
			image.src = "textures/" + texDesc.file;
		} else {
			vis.error("Tried to get non-existent texture [" + name + "]");
		}
	}

	function renderObject(obj, mv, glowPass) {
		var gl = vis.gl.getContext(),
			settings = vis.settings;

		var geo = obj.geometry;

		var isParticles = obj.type === "particles";


		gl.enable(gl.CULL_FACE);
		gl.frontFace(gl.CCW);

		var program = obj.program;
		gl.useProgram(program);

		vis.gl.setUniform1i(program, "uGlowPass", !!glowPass);
		vis.gl.setUniform1i(program, "uUseGlow", !!obj.glow);
		vis.gl.setUniform1f(program, "uDisplayAspect", aspect);

		var numLights = lightData.length;
		for (var i=0;i<numLights;i++) {
			vis.gl.setUniformMatrix3fv(program, "uLight" + (i+1), false, new Float32Array(lightData[i]));
		}
		vis.gl.setUniform1i(program, "uNumLights", numLights);

		var variableValues = [
			obj.variableValues.A, obj.variableValues.B, obj.variableValues.C, obj.variableValues.D,
			obj.variableValues.E, obj.variableValues.F, obj.variableValues.G, obj.variableValues.H
		];
		vis.gl.setUniform1fv(program, "uVariables", variableValues);

		vis.gl.setUniform1f(program, "uTime", (new Date().getTime() - startTime) / 1000);

		vis.gl.setUniform1f(program, "uAudioBass", vis.audio.data.avgBands[0]);
		vis.gl.setUniform1f(program, "uAudioMid", vis.audio.data.avgBands[1]);
		vis.gl.setUniform1f(program, "uAudioTreb", vis.audio.data.avgBands[2]);
		vis.gl.setUniform1f(program, "uAudioBeat", vis.audio.data.isBeat);

		if (!isParticles) {
			vis.gl.setUniform1i(program, "uUseLighting", obj.lighting);
			if (obj.lighting) {
				vis.gl.setUniform1i(program, "uUseSpecular", obj.specular);
				vis.gl.setUniform1i(program, "uSmooth", obj.smooth);
			}
			vis.gl.setUniform3fv(program, "uAmbientColor", [0.1, 0.1, 0.1]);
			vis.gl.setUniform1f(program, "uShininess", 100);
			vis.gl.setUniform1i(program, "uBackface", false);
			vis.gl.setUniform1i(program, "uSingleNormal", !!geo.singleNormal);
			vis.gl.setUniform1i(program, "uUseTexture", !!obj.texture && !!obj.textureObject);

			if (!!obj.texture && !!obj.textureObject) {
				vis.gl.setUniform1f(program, "uTextureRepeatX", parseFloat(obj.textureRepeatX) || 1);
				vis.gl.setUniform1f(program, "uTextureRepeatY", parseFloat(obj.textureRepeatY) || 1);
				vis.gl.setUniform1i(program, "uTexture", 0);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, obj.textureObject);
			}
		}

		vis.gl.setModelView(program, mv);
		vis.gl.setProjection(program, camera);
		if (!isParticles) {
			vis.gl.setNormalMatrix(program, mv);
		}


		vis.gl.enableBuffer(program, "aVertex", geo.vertexObject, 3);
		if (isParticles || !obj.lighting) {
			vis.gl.disableBuffer(program, "aNormal");
		}
		if (isParticles) {
			vis.gl.setUniform4f(program, "uViewport", 0, 0, settings.width, settings.height);
			vis.gl.setUniform1f(program, "uPixelsPerRadian", settings.height / (camera.fov * Math.PI / 180.0) );
			vis.gl.setUniform1f(program, "uRadius", 0.01);
			vis.gl.disableBuffer(program, "aTexCoord");
			gl.drawArrays(gl.POINTS, 0, geo.numParticles);
		} else {
			vis.gl.enableBuffer(program, "aNormal", geo.normalObject, 3);
			vis.gl.enableBuffer(program, "aTexCoord", geo.texCoordObject, 2);

			vis.gl.drawElements(geo.indexObject, geo.numIndices, gl.TRIANGLES);

			if (obj.type === "plane") {
				gl.frontFace(gl.CW);
				vis.gl.setUniform1i(program, "uBackface", true);
				vis.gl.drawElements(geo.indexObject, geo.numIndices, gl.TRIANGLES);
				gl.frontFace(gl.CCW);
			}
		}
	}

	function clearScene() {
		sceneObjects = [];
		sceneLights = [];
		numLights = 0;
		createSceneObject.counter = 0;
		startTime = new Date().getTime();
	}

	// whitelist of properties to import when loading data
	var dataProps = [
		"type", "name", "enabled", "texture", "textureRepeatX",
		"textureRepeatY", "lighting", "smooth", "specular", "color",
		"glow", "glowStrength", "blur", "blurAmount",
		"translationX", "translationY", "translationZ",
		"rotationX", "rotationY", "rotationZ",
		"scalingX", "scalingY", "scalingZ",
		"particleSize", "particleNumber",
		"cylinderRadius", "cylinderHeight",
		"torusRadius", "torusThickness"
	];

	function loadFromString(str) {
		clearScene();

		var data = JSON.parse(str);
		var objects = data.objects;
		var lights = data.lights;
		var i, j, obj;

		numLights = 0;
		for (i = 0; i < lights.length; i++) {
			obj = {};
			for (j = 0; j < dataProps.length; j++) {
				obj[dataProps[j]] = lights[i][dataProps[j]];
			}
			sceneLights.push(createSceneObject(obj.type, obj));
			numLights++;
		}

		updateLights();

		for (i = 0; i < objects.length; i++) {
			obj = {};
			for (j = 0; j < dataProps.length; j++) {
				obj[dataProps[j]] = objects[i][dataProps[j]];
			}
			var variables = objects[i].variables || {};

			for (j = 0; j < varNames.length; j++)
				variables[varNames[j]] = variables[varNames[j]] || "";
			obj.variables = variables;
			sceneObjects.push(createSceneObject(obj.type, obj));
		}

		if (data.backgroundColor) {
			vis.settings.backgroundColor = data.backgroundColor;
		} else {
			vis.settings.backgroundColor = {hue:"0.0",saturation:"0.0",lightness:"0.0"};
		}
		updateSceneSettings();

		if (data.camera) {
			camera.fov = data.camera.fov;
			camera.aspect = data.camera.aspect;
			camera.position = $V(data.camera.position);
			camera.target = $V(data.camera.target);
			camera.up = $V(data.camera.up);
		}
		createSceneObject.counter = data.createSceneObjectCounter;

		if (paused) {
			draw();
		}
	}

	function saveToString() {
		var data = {
			objects : [],
			lights : [],
			camera : camera,
			backgroundColor : vis.settings.backgroundColor,
			createSceneObjectCounter : createSceneObject.counter
		};
		var i, j, obj;

		for (i = 0; i < sceneObjects.length; i++) {
			obj = {};
			for (j = 0; j < dataProps.length; j++) {
				obj[dataProps[j]] = sceneObjects[i][dataProps[j]];
			}
			obj.variables = sceneObjects[i].variables;
			data.objects.push(obj);
		}

		for (i = 0; i < sceneLights.length; i++) {
			obj = {};
			for (j = 0; j < dataProps.length; j++) {
				obj[dataProps[j]] = sceneLights[i][dataProps[j]];
			}
			data.lights.push(obj);
		}

		return JSON.stringify(data);
	}

	function resizeScene(newWidth, newHeight) {
		aspect = newWidth / newHeight;
	}

	function resetSceneDimensions() {
		aspect = originalAspect;
	}

	var camera = (function() {
		var position = $V([0,3,9]),
			target = $V([0,0,0]),
			forward = target.subtract(position),
			side = forward.cross($V([0,1,0])),
			up = side.cross(forward);
		return {
			fov : 60,
			position : position,
			target : target,
			up : up
		};
	})();

	var hsl2rgb = function(h, s, l) {
		var canvas = document.createElement("canvas");
		canvas.width = canvas.height = 1;
		var ctx = canvas.getContext("2d");
		hsl2rgb = function(h, s, l) {
			if (s < 0) s = 0; if (s > 1) s = 1;
			if (l < 0) l = 0; if (l > 1) l = 1;
			ctx.fillStyle = "hsl(" + ((h*360%360)>>0) + "," + ((s*100)>>0) + "%," + ((l*100)>>0) + "%)";
			ctx.fillRect(0,0,1,1);
			var data = ctx.getImageData(0,0,1,1).data;
			return [data[0]/255,data[1]/255,data[2]/255];
		};
		return hsl2rgb(h, s, l);
	};

	function draw() {
		var gl = vis.gl.getContext(),
			settings = vis.settings;

		for (var a in sceneVars.variableFunctions) {
			if (sceneVars.variableFunctions.hasOwnProperty(a)) {
				callVariableFunction(sceneVars, a);
			}
		}

		camera.aspect = aspect;

		var viewMatrix = Matrix.LookAt(camera.position, camera.target, camera.up);

		time = (new Date().getTime() - startTime);

		lightData = [];

		var i, j, obj, light;

		// process variable functions for all scene objects
		for (i = 0; i < sceneObjects.length; i++) {
			obj = sceneObjects[i];
			if (obj.enabled) {
				for (j = 0; j < varNames.length; j++) {
					callVariableFunction(obj, varNames[j]);
				}
			}
		}
		for (i = 0; i < sceneLights.length; i++) {
			light = sceneLights[i];
			if (light.enabled) {
				/*
				for (var j=0;j<varNames.length;j++) {
					callVariableFunction(light, varNames[j]);
				}
				*/
				var lightVars = [
					"translationX", "translationY", "translationZ",
					"colorHue", "colorSaturation", "colorLightness"];
				for (j = 0; j < lightVars.length; j++) {
					callVariableFunction(light, lightVars[j]);
				}
				var lightColor = hsl2rgb(
					light.variableValues["colorHue"],
					light.variableValues["colorSaturation"],
					light.variableValues["colorLightness"]
				);
				lightData.push([
					light.variableValues["translationX"],
					light.variableValues["translationY"],
					light.variableValues["translationZ"],
					lightColor[0],lightColor[1],lightColor[2],
					0,0,0
				]);

			}
		}

		var bgColor = hsl2rgb(
			sceneVars.variableValues["colorHue"],
			sceneVars.variableValues["colorSaturation"],
			sceneVars.variableValues["colorLightness"]
		);
		gl.clearColor(bgColor[0], bgColor[1], bgColor[2], 1);
		gl.viewport(0,0,settings.width,settings.height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// render scene objects, first pass
		for (i = 0; i < sceneObjects.length; i++) {
			obj = sceneObjects[i];
			if (obj.enabled && obj.type !== "light") {
				renderObject(obj, viewMatrix, false);
			}
		}

		gl.bindTexture(gl.TEXTURE_2D, rttTexture);
		gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, settings.width, settings.height, 0);
		gl.bindTexture(gl.TEXTURE_2D, null);

		// set background to black for rest of the rendering
		gl.clearColor(0,0,0,1);
		gl.viewport(0,0,settings.width / 2,settings.height / 2);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// render scene objects, glow pass
		var hasGlowObjects = false;
		for (i = 0; i < sceneObjects.length; i++) {
			obj = sceneObjects[i];
			if (obj.glow) {
				hasGlowObjects = true;
			}
		}

		var program;

		if (hasGlowObjects) {

			for (i = 0; i < sceneObjects.length;i++) {
				obj = sceneObjects[i];
				if (obj.enabled) {
					renderObject(obj, viewMatrix, true);
				}
			}
			gl.disable(gl.CULL_FACE);

			gl.bindTexture(gl.TEXTURE_2D, glowTexture);
			gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, settings.width / 2, settings.height / 2, 0);
			gl.bindTexture(gl.TEXTURE_2D, null);

			// blur pass 1

			gl.viewport(0,0,settings.width/2,settings.height/2);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			program = programs["blur-pass-1"];
			gl.useProgram(program);

			vis.gl.setUniform1f(program, "uDisplayAspect", aspect);

			vis.gl.enableBuffer(program, "aVertex", screenQuad.vertexObject, 3);
			vis.gl.enableBuffer(program, "aTexCoord", screenQuad.texCoordObject, 2);

			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, screenQuad.indexObject);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, glowTexture);

			gl.clear(gl.COLOR_BUFFER_BIT);

			gl.drawElements(gl.TRIANGLE_STRIP, screenQuad.numIndices, gl.UNSIGNED_SHORT, 0);

			// copy blur texture
			gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, settings.width/2, settings.height/2, 0);

			// blur pass 2

			program = programs["blur-pass-2"];
			gl.useProgram(program);

			vis.gl.setUniform1f(program, "uDisplayAspect", aspect);

			vis.gl.enableBuffer(program, "aVertex", screenQuad.vertexObject, 3);
			vis.gl.enableBuffer(program, "aTexCoord", screenQuad.texCoordObject, 2);

			gl.activeTexture(gl.TEXTURE0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, screenQuad.indexObject);
			gl.bindTexture(gl.TEXTURE_2D, glowTexture);

			gl.drawElements(gl.TRIANGLE_STRIP, screenQuad.numIndices, gl.UNSIGNED_SHORT, 0);

			// copy blur texture
			gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, settings.width/2, settings.height/2, 0);

		}

		gl.bindTexture(gl.TEXTURE_2D, null);

		gl.disable(gl.CULL_FACE);

		// final output
		gl.viewport(0,0,settings.width,settings.height);
		program = programs["screen"];
		gl.useProgram(program);

		vis.gl.setUniform1f(program, "uDisplayAspect", aspect);

		vis.gl.enableBuffer(program, "aVertex", screenQuad.vertexObject, 3);
		vis.gl.enableBuffer(program, "aTexCoord", screenQuad.texCoordObject, 2);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, screenQuad.indexObject);

		vis.gl.setUniform1i(program, "uTexture", 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, rttTexture);

		vis.gl.setUniform1i(program, "uEnableGlow", hasGlowObjects);

		if (hasGlowObjects) {
			vis.gl.setUniform1i(program, "uGlowTexture", 1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, glowTexture);
		}

		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawElements(gl.TRIANGLE_STRIP, screenQuad.numIndices, gl.UNSIGNED_SHORT, 0);

		gl.finish();
	}


	function getObjects() {
		return sceneObjects.slice();
	}

	function getLights() {
		return sceneLights.slice();
	}

	function run() {
		paused = false;

		var lastRenderTime = new Date().getTime();

		var nextFrame = function() {
			var now = new Date().getTime();
			if (!paused) {
				vis.gl.tick();
				vis.input.update(now - lastRenderTime);
				draw();
			}
			lastRenderTime = now;
			setTimeout(nextFrame, 1);
		};

		vis.log("Starting scene rendering...");

		nextFrame();

	}

	function pause(value) {
		if (typeof value !== "undefined") {
			paused = value;
		} else {
			paused = !paused;
		}
		vis.log(paused ? "Pausing" : "Unpausing");
	}

	function isPaused() {
		return paused;
	}

	return {
		setup : setup,
		run : run,
		draw : draw,
		pause : pause,
		isPaused : isPaused,

		camera : camera,

		addObject : addObject,
		removeObject : removeObject,
		updateObject : updateObject,
		loadFromString : loadFromString,
		saveToString : saveToString,
		reset : reset,

		validateModifier : validateModifier,

		updateSceneSettings : updateSceneSettings,

		resize : resizeScene,
		resetDimensions : resetSceneDimensions,

		getObjects : getObjects,
		getLights : getLights
	};



})();