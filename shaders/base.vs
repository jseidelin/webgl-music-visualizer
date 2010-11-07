precision highp float;

/*INCLUDE rotmat.glsl*/

#ifdef USECOLOR
/*INCLUDE hsl2rgb.glsl*/
#endif

attribute vec3 aVertex;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjMatrix;
uniform mat4 uNormalMatrix;

uniform bool uUseLighting;
uniform bool uSmooth;
uniform bool uBackface;

uniform float uTime;
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioTreb;
uniform float uAudioBeat;
uniform float uVariables[8];

varying vec2 vTexCoord;
varying vec3 vNormal;
varying vec4 vPosition;
varying vec3 vColor;

float time = uTime;
float bass = uAudioBass;
float mid = uAudioMid;
float treb = uAudioTreb;
float beat = uAudioBeat;
float A = uVariables[0];
float B = uVariables[1];
float C = uVariables[2];
float D = uVariables[3];
float E = uVariables[4];
float F = uVariables[5];
float G = uVariables[6];
float H = uVariables[7];

vec3 transformVertex(vec3 vertex) {
	float len = length(vertex);
	float x = vertex.x;
	float y = vertex.y;
	float z = vertex.z;
	
	float translateX = 0.0, translateY = 0.0, translateZ = 0.0;
	float rotateX = 0.0, rotateY = 0.0, rotateZ = 0.0;
	float scaleX = 1.0, scaleY = 1.0, scaleZ = 1.0;
	
	/*VERTEX_TRANSFORM*/
	vec3 result = vec3(vertex);

	result.x *= scaleX;
	result.y *= scaleY;
	result.z *= scaleZ;

	mat4 rotMatrixX = rotationMatrix(vec3(1.0,0.0,0.0), rotateX);
	mat4 rotMatrixY = rotationMatrix(vec3(0.0,1.0,0.0), rotateY);
	mat4 rotMatrixZ = rotationMatrix(vec3(0.0,0.0,1.0), rotateZ);
	
	mat4 transform = rotMatrixX * rotMatrixY * rotMatrixZ;

	result = (transform * vec4(result, 1.0)).xyz;

	result += vec3(translateX, translateY, translateZ);

	return result;
}

#ifndef USETEXTURE
#ifdef USECOLOR
vec3 vertexColor() {
	
	vec3 color = vec3(0.0);

	/*COLOR*/
	
	color.x = mod(color.x, 1.0);
	color = clamp(color, 0.0, 1.0);
	return hsl2rgb(color);
}
#endif
#endif

void main(void) {
	
	vTexCoord = aTexCoord;

	vec3 vertex = transformVertex(aVertex);
	
	#ifdef USELIGHTING
	if (uUseLighting) {
		// calculate new normal
		
		vec3 normal;

		vec3 v;
		vec3 n = aNormal;
		vec3 p = aVertex;
		float nx = abs(n.x), ny = abs(n.y), nz = abs(n.z);
		if (nx <= ny && nx <= nz) {
			v = cross(n, vec3(1.0, 0.0, 0.0));
		} else if (ny <= nx && ny <= nz) {
			v = cross(n, vec3(0.0, 1.0, 0.0));
		} else {
			v = cross(n, vec3(0.0, 0.0, 1.0));
		}
		v = normalize(v) * 0.1;
		vec3 p1 = p + v;
		vec3 p2 = p + (vec4(v, 1.0) * rotationMatrix(n, 2.0 * 3.14159 / 3.0)).xyz;
		vec3 p3 = p + (vec4(v, 1.0) * rotationMatrix(n, 2.0 * 3.14159 / 3.0 * 2.0)).xyz;

		vec3 vertex1 = transformVertex(p1);
		vec3 vertex2 = transformVertex(p2);
		vec3 vertex3 = transformVertex(p3);

		normal = normalize(cross(vertex2 - vertex1, vertex3 - vertex1));

		vNormal = (uNormalMatrix * vec4(normal, 1.0)).xyz;
		
		if (uBackface) {
			vNormal = -vNormal;
		}
	}
	#endif
	
	#ifndef USETEXTURE
	#ifdef USECOLOR
	vColor = vertexColor();
	#else
	vColor = vec3(1.0);
	#endif
	#endif
	
	vPosition = uModelViewMatrix * vec4(vertex, 1.0);

	gl_Position = uProjMatrix * vPosition;
}