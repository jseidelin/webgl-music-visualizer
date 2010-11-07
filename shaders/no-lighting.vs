attribute vec3 aVertex;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjMatrix;

varying vec2 vTexCoord;

void main(void) {
	vTexCoord = aTexCoord;
	gl_Position = uProjMatrix * uModelViewMatrix * vec4(aVertex, 1.0);
}