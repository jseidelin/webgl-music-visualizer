#ifdef GL_ES
precision highp float;
#endif

uniform vec3 uColor;
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform float uMultiplier;

varying vec2 vTexCoord;

void main(void) {
	
	vec3 surfColor;
	if (uUseTexture) {
		surfColor = texture2D(uTexture, vTexCoord).rgb;
	} else {
		surfColor = uColor;
	}

    gl_FragColor = vec4(surfColor * uMultiplier, 1.0);
}
  
