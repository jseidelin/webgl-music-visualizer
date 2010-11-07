#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTexture;
uniform sampler2D uGlowTexture;
uniform float uDisplayAspect;
uniform bool uEnableGlow;

varying vec2 vTexCoord;

void main(void) {

	float radius = 2.0 / 512.0 / uDisplayAspect;

	
	vec4 texColor = texture2D(uTexture, vTexCoord);
	if (uEnableGlow) {
		vec4 glowColor = texture2D(uGlowTexture, vTexCoord);
		gl_FragColor = vec4(vec3(texColor + glowColor * 3.0), 1.0);
	} else {
		gl_FragColor = vec4(texColor.rgb, 1.0);
	}
}