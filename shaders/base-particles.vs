precision highp float;

/*INCLUDE rotmat.glsl*/

#ifdef USECOLOR
/*INCLUDE hsl2rgb.glsl*/
#endif

attribute vec3 aVertex;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjMatrix;

uniform float uVariables[8];

uniform float uTime;

uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioTreb;
uniform float uAudioBeat;

uniform vec4 uViewport;
uniform float uRadius;
uniform float uPixelsPerRadian;

uniform bool uUseLighting;

varying vec3 vColor;

varying vec4 vPosition;
varying mat4 vModelViewMatrix;

varying float vAspect;
varying vec4 vPoint;

float x = 0.0;
float y = 0.0;
float z = 0.0;

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
	float x = vertex.x;
	float y = vertex.y;
	float z = vertex.z;

	float translateX = 0.0, translateY = 0.0, translateZ = 0.0;
	float rotateX = 0.0, rotateY = 0.0, rotateZ = 0.0;

	/*VERTEX_TRANSFORM*/

	vec4 result = vec4(
		x + translateX,
		y + translateY,
		z + translateZ,
		1.0
	);
	if (rotateX != 0.0)
		result *= rotationMatrix(vec3(1.0,0.0,0.0), rotateX);
	if (rotateY != 0.0)
		result *= rotationMatrix(vec3(0.0,1.0,0.0), rotateY);
	if (rotateZ != 0.0)
		result *= rotationMatrix(vec3(0.0,0.0,1.0), rotateZ);

	return result.xyz;
}

#ifdef USECOLOR
vec3 vertexColor(vec3 position) {
	vec3 color = vec3(0.0);

	/*COLOR*/

	color.x = mod(color.x, 1.0);
	color = clamp(color, 0.0, 1.0);
	return hsl2rgb(color);
}
#endif


float particleSize() {
	float size = 1.0;

	/*PARTICLE_SIZE*/

	size = max(0.001, size);
	return size;
}

void main(void) {
	x = aVertex.x;
	y = aVertex.y;
	z = aVertex.z;
	vec3 vertex = transformVertex(aVertex);

	vAspect = uViewport.z / uViewport.w;

	vModelViewMatrix = uModelViewMatrix;
	vPosition = uModelViewMatrix * vec4(vertex, 1.0);

	vec4 position = uProjMatrix * vPosition;

	gl_Position = position;

	if (position.z < uRadius * 2.0) {
		gl_Position.z = -100000.0;
		return;
	}

	#ifdef USECOLOR
	vColor = vertexColor(vertex.xyz);
	#else
	vColor = vec3(1.0);
	#endif
	float radius = uRadius * particleSize();

	float pointDistance = length(position.xyz);

	gl_PointSize = uPixelsPerRadian * radius * 2.0 / pointDistance;

	/*GET_POINT_COORD_VS*/
}