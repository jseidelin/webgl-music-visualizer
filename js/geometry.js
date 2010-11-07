/* global vis */
// helpers for making various 3D shapes (sphere, cube, etc)

vis.geometry = (function() {

function createFloatBuffer(data) {
	var gl = vis.gl.getContext();
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	return buffer;
}

function createIndexBuffer(data) {
	var gl = vis.gl.getContext();
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data), gl.STATIC_DRAW);
	return buffer;
}

function makeSphere(radius, lats, longs, texture) {

	var vertices = [],
		normals = [],
		texcoords = [],
		indices = [];

	var radLat = Math.PI / lats,
		radLongs = 2 * Math.PI / longs;
	function calcPoint(latNumber, longNumber) {
		var theta = latNumber * radLat,
			phi = longNumber * radLongs,
			sinTheta = Math.sin(theta),
			sinPhi = Math.sin(phi),
			cosTheta = Math.cos(theta),
			cosPhi = Math.cos(phi);
		return {
			x : cosPhi * sinTheta,
			y : cosTheta,
			z : sinPhi * sinTheta,
			u : 1-(longNumber/longs),
			v : latNumber/lats
		};
	}

	var p, latNumber, longNumber;
	for (latNumber = 0; latNumber <= lats; ++latNumber) {
		for (longNumber = 0; longNumber <= longs; ++longNumber) {
			p = calcPoint(latNumber, longNumber);

			normals.push(p.x);
			normals.push(p.y);
			normals.push(p.z);

			texcoords.push(p.u);
			texcoords.push(p.v);

			vertices.push(radius * p.x, radius * p.y, radius * p.z);
		}
	}

	longs += 1;

	for (latNumber = 0; latNumber < lats; ++latNumber) {
		for (longNumber = 0; longNumber < longs; ++longNumber) {
			var first = (latNumber * longs) + (longNumber % longs);
			var second = first + longs;

			if (first+1 < vertices.length/3 && second+1 < vertices.length/3) {
				indices.push(first, first+1, second);
				indices.push(second, first+1, second+1);
			}
		}
	}


	var ret = { };

	ret.numIndices = indices.length;

	ret.normalObject = createFloatBuffer(normals);
	ret.vertexObject = createFloatBuffer(vertices);
	ret.texCoordObject = createFloatBuffer(texcoords);
	ret.indexObject = createIndexBuffer(indices);

	if (texture)
		ret.texture = vis.gl.createTexture(texture);

	return ret;
}


function makeCylinder(radius, height, sides, texture) {
	var vertices = [],
		normals = [],
		indices = [],
		texcoords = [];

	var radStep = Math.PI * 2 / sides;
	var i, t, p, q, x, z;

	// top
	vertices.push(0,height/2,0);
	normals.push(0,1,0);
	texcoords.push(0.5, 0.5);
	for (i = 0; i <sides; i++) {
		t = i * radStep;
		p = Math.sin(t);
		q = Math.cos(t);
		x = p * radius;
		z = q * radius;
		vertices.push(x,height/2,z);
		normals.push(0,1,0);
		texcoords.push((p+1)/2, (q+1)/2);
	}
	for (i = 2; i <= sides; i++) {
		indices.push(0, i-1, i);
	}
	indices.push(0, sides, 1);

	var s = vertices.length / 3;

	// bottom
	vertices.push(0,-height/2,0);
	normals.push(0,-1,0);
	texcoords.push(0.5, 0.5);
	for (i = 0; i <= sides; i++) {
		t = i * radStep;
		p = Math.sin(t);
		q = Math.cos(t);
		x = p * radius;
		z = q * radius;
		vertices.push(x,-height/2,z);
		normals.push(0,-1,0);
		texcoords.push((p+1)/2, (q+1)/2);
	}

	for (i = 2; i <= sides; i++) {
		indices.push(s, i+s, i-1+s);
	}
	indices.push(s, 1+s, sides+s);

	s = vertices.length / 3;

	// sides
	for (i = 0; i <= sides; i++) {
		t = i * radStep;
		p = Math.sin(t);
		q = Math.cos(t);
		x = p * radius;
		z = q * radius;

		var d = Math.sqrt(x*x+z*z);

		vertices.push(x,-height/2,z);
		vertices.push(x,height/2,z);
		normals.push(x/d,0,z/d);
		normals.push(x/d,0,z/d);
		texcoords.push(i/sides, 0);
		texcoords.push(i/sides, 1);
	}
	for (i = 1; i <= sides; i++) {
		indices.push(s + i*2, s + i*2+1, s + i*2-2);
		indices.push(s + i*2-2, s + i*2+1, s + i*2-1);
	}

	var ret = {
		numIndices : indices.length
	};


	ret.normalObject = createFloatBuffer(normals);
	ret.vertexObject = createFloatBuffer(vertices);
	ret.texCoordObject = createFloatBuffer(texcoords);
	ret.indexObject = createIndexBuffer(indices);

	if (texture)
		ret.texture = vis.gl.createTexture(texture);

	return ret;
}


function makeTorus(radius, thickness, sides1, sides2) {

	var vertices = [],
		normals = [],
		indices = [],
		texcoords = [];

	for (var i=0;i<sides1;i++) {
		var theta1 = i / sides1 * Math.PI * 2,
			cx = Math.cos(theta1) * radius,
			cy = Math.sin(theta1) * radius,
			cz = 0;
		for (var j=0;j<sides2;j++) {
			var theta2 = j / sides2 * Math.PI * 2,
				r = radius + Math.sin(theta2) * thickness,
				x = Math.cos(theta1) * r,
				y = Math.sin(theta1) * r,
				z = Math.cos(theta2) * thickness,
				nx = x - cx,
				ny = y - cy,
				nz = z - cz,
				nlen = Math.sqrt(nx*nx+ny*ny+nz*nz);

			vertices.push(x,y,z);
			normals.push(nx/nlen,ny/nlen,nz/nlen);
			texcoords.push(i/sides1,j/sides2);

			var off = i*sides2 + j;
			if (i > 0) {
				if (j>0) {
					indices.push(off, off - 1, off - sides2 - 1);
					indices.push(off, off - sides2 - 1, off - sides2);
				} else {
					indices.push(off, off - 1, off - sides2);
					indices.push(off, off + sides2 - 1, off - 1);
				}
			} else {
				if (j>0) {
					indices.push(off, off - 1, off - sides2 - 1 + sides1*sides2);
					indices.push(off, off - sides2 - 1 + sides1*sides2, off - sides2 + sides1*sides2);
				} else {
					indices.push(off, off - 1 + sides1*sides2, off - sides2 + sides1*sides2);
					indices.push(off, off - 1 + sides2, off + sides1*sides2 - 1);
				}
			}
		}
	}

	var ret = {};

	ret.normalObject = createFloatBuffer(normals);
	ret.vertexObject = createFloatBuffer(vertices);
	ret.texCoordObject = createFloatBuffer(texcoords);
	ret.indexObject = createIndexBuffer(indices);

	ret.numIndices = indices.length;
	return ret;
}


function makeCube(size, texture) {

	var vertices = [
		-1,  1,  1,
		 1,  1,  1,
		 1, -1,  1,
		-1, -1,  1,

		-1,  1, -1,
		 1,  1, -1,
		 1, -1, -1,
		-1, -1, -1,

		 1,  1,  1,
		 1,  1, -1,
		 1, -1, -1,
		 1, -1,  1,

		-1,  1,  1,
		-1,  1, -1,
		 1,  1, -1,
		 1,  1,  1,

		 1, -1,  1,
		 1, -1, -1,
		-1, -1, -1,
		-1, -1,  1,

		-1, -1,  1,
		-1, -1, -1,
		-1,  1, -1,
		-1,  1,  1
	];

	for (var i=0;i<vertices.length;i++) {
		vertices[i] *= size * 0.5;
	}

	var normals = [
		 0,  0,  1,
		 0,  0,  1,
		 0,  0,  1,
		 0,  0,  1,

		 0,  0, -1,
		 0,  0, -1,
		 0,  0, -1,
		 0,  0, -1,

		 1,  0,  0,
		 1,  0,  0,
		 1,  0,  0,
		 1,  0,  0,

		 0,  1,  0,
		 0,  1,  0,
		 0,  1,  0,
		 0,  1,  0,

		 0, -1,  0,
		 0, -1,  0,
		 0, -1,  0,
		 0, -1,  0,

		-1,  0,  0,
		-1,  0,  0,
		-1,  0,  0,
		-1,  0,  0
	];

	var indices = [
		 1,  0,  3,
		 1,  3,  2,

		 4,  5,  7,
		 5,  6,  7,

		 9,  8, 11,
		 9, 11, 10,

		13, 12, 15,
		13, 15, 14,

		17, 16, 19,
		17, 19, 18,

		21, 20, 23,
		21, 23, 22
	];

	var texcoords = [
		0, 1,
		0, 0,
		1, 0,
		1, 1,

		0, 1,
		0, 0,
		1, 0,
		1, 1,

		0, 1,
		0, 0,
		1, 0,
		1, 1,

		0, 1,
		0, 0,
		1, 0,
		1, 1,

		0, 1,
		0, 0,
		1, 0,
		1, 1,

		0, 1,
		0, 0,
		1, 0,
		1, 1
	];
	indices.length = 36;

	var ret = {};

	ret.numIndices = indices.length;

	ret.indexObject = createIndexBuffer(indices);
	ret.normalObject = createFloatBuffer(normals);
	ret.texCoordObject = createFloatBuffer(texcoords);
	ret.vertexObject = createFloatBuffer(vertices);

	if (texture)
		ret.texture = vis.gl.createTexture(texture);

	return ret;
}


function makeQuad(size) {
	var gl = vis.gl.getContext();
	var ret = {
		vertexObject : gl.createBuffer(),
		texCoordObject : gl.createBuffer(),
		indexObject : gl.createBuffer(),
		numIndices : 4,
		texture : gl.createTexture()
	};
	var s = size * 0.5;

	// create data for a screen quad
	var vertices = new Float32Array([-s,-s,0, -s,s,0, s,-s,0, s,s,0]);
	var indices = new Uint16Array([0,1,2,3]);
	var texcoords = new Float32Array([0,0, 0,1, 1,0, 1,1]);

	gl.bindBuffer(gl.ARRAY_BUFFER, ret.vertexObject);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ARRAY_BUFFER, ret.texCoordObject);
	gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ret.indexObject);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	return ret;
}


function makePlane(size, resX, resY) {
	var gl = vis.gl.getContext();

	var ret = {
		texture : gl.createTexture()
	};
	var s = size * 0.5;

	var stepX = size / resX;
	var stepY = size / resY;

	//[-s,0,-s, -s,0,s, s,0,-s, s,0,s]
	var vertices = [];

	//0,0, 0,1, 1,0, 1,1]
	var texcoords = [];

	// [0,1,2, 1,3,2]
	var indices = [];

	// [0,1,0, 0,1,0, 0,1,0, 0,1,0]
	var normals = [];

	var n = 0;
	for (var x=0;x<resX;x++) {
		for (var y=0;y<resY;y++) {
			vertices.push(
				x*stepX,0,y*stepY,
				x*stepX,0,(y+1)*stepY,
				(x+1)*stepX,0,y*stepY,
				(x+1)*stepX,0,(y+1)*stepY
			);

			indices.push(
				n, n+1, n+2,
				n+1, n+3, n+2
			);
			normals.push(0,1,0, 0,1,0, 0,1,0, 0,1,0);

			texcoords.push(
				x/resX,y/resY,
				x/resX,(y+1)/resY,
				(x+1)/resX,y/resY,
				(x+1)/resX,(y+1)/resY
			);

			n += 4;
		}
	}

	for (var i=0;i<vertices.length;i+=3) {
		vertices[i] -= s;
		vertices[i+2] -= s;
	}

	ret.numIndices = indices.length;

	ret.normalObject = createFloatBuffer(normals);
	ret.vertexObject = createFloatBuffer(vertices);
	ret.texCoordObject = createFloatBuffer(texcoords);
	ret.indexObject = createIndexBuffer(indices);

	return ret;
}

function makeParticles(n) {
	var ret = {
		numParticles : n
	};

	var vertices = [];

	for (var i=0;i<n;i++) {
		vertices.push(
			Math.random() - 0.5,
			Math.random() - 0.5,
			Math.random() - 0.5
		)
	}

	ret.vertexObject = createFloatBuffer(vertices);

	return ret;
}


return {
	sphere : makeSphere,
	cube : makeCube,
	cylinder : makeCylinder,
	quad : makeQuad,
	plane : makePlane,
	torus : makeTorus,
	particles : makeParticles
}

})();