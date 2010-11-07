#ifdef GL_ES
precision highp float;
#endif

uniform vec3 uColor;

void main(void) {
	gl_FragColor = vec4(uColor, 1.0);
}
