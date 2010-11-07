#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D uTexture;
uniform float uDisplayAspect;

varying vec2 vTexCoord;

void main(void) {

	float radius = 2.0 / 512.0 / uDisplayAspect;

	vec4 sample = 
		  texture2D(uTexture, vec2(vTexCoord.x - 4.0*radius, vTexCoord.y)) * 0.05
		+ texture2D(uTexture, vec2(vTexCoord.x - 3.0*radius, vTexCoord.y)) * 0.09
		+ texture2D(uTexture, vec2(vTexCoord.x - 2.0*radius, vTexCoord.y)) * 0.12
		+ texture2D(uTexture, vec2(vTexCoord.x - radius, vTexCoord.y)) * 0.15
		+ texture2D(uTexture, vec2(vTexCoord.x, vTexCoord.y)) * 0.16
		+ texture2D(uTexture, vec2(vTexCoord.x + radius, vTexCoord.y)) * 0.15
		+ texture2D(uTexture, vec2(vTexCoord.x + 2.0*radius, vTexCoord.y)) * 0.12
		+ texture2D(uTexture, vec2(vTexCoord.x + 3.0*radius, vTexCoord.y)) * 0.09
		+ texture2D(uTexture, vec2(vTexCoord.x + 4.0*radius, vTexCoord.y)) * 0.05;
	
	gl_FragColor = vec4(sample.rgb, 1.0);

}