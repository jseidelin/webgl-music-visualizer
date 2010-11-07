precision highp float;

varying vec4 vPosition;
varying vec3 vNormal;
varying vec2 vTexCoord;

uniform mat4 uProjMatrix;
uniform mat4 uModelViewMatrix;

varying vec3 vColor;

uniform vec3 uAmbientColor;

uniform float uTime;
uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioTreb;
uniform float uAudioBeat;
uniform float uVariables[8];

uniform float uShininess;
uniform bool uUseSpecular;

#ifdef USETEXTURE
uniform sampler2D uTexture;
uniform bool uUseTexture;
uniform float uTextureRepeatX;
uniform float uTextureRepeatY;
#endif

uniform bool uUseLighting;
uniform bool uGlowPass;
uniform bool uUseGlow;

uniform mat3 uLight1;
uniform mat3 uLight2;
uniform mat3 uLight3;
uniform mat3 uLight4;

uniform int uNumLights;

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

float x = 0.0;
float y = 0.0;
float z = 0.0;

#ifdef USELIGHTING

vec3 calculateLight(vec3 normal, vec3 lightPosition, vec3 lightColor) {
	lightPosition = (uModelViewMatrix * vec4(lightPosition, 1.0)).xyz;
	float specular = 0.0;
	vec3 lightDir = normalize(lightPosition - vPosition.xyz);
	#ifdef USESPECULAR
	//if (uUseSpecular) {
		vec3 viewDir = normalize(-vPosition.xyz);
		vec3 reflectDir = reflect(-lightDir, normal);
		specular = pow(max(dot(reflectDir, viewDir), 0.0), uShininess);
	//} else {
	//	specular = 0.0;
	//}
	#endif
	float diffuse = max(dot(normal, lightDir), 0.0);

	return lightColor * diffuse + lightColor * specular;
}

vec3 lighting(vec3 normal) {
	vec3 light = vec3(0.0);

	#ifdef USELIGHT1
	light += calculateLight(normal, uLight1[0], uLight1[1]);
	#endif
	#ifdef USELIGHT2
	light += calculateLight(normal, uLight2[0], uLight2[1]);
	#endif
	#ifdef USELIGHT3
	light += calculateLight(normal, uLight3[0], uLight3[1]);
	#endif
	#ifdef USELIGHT4
	light += calculateLight(normal, uLight4[0], uLight4[1]);
	#endif

	return light;
}

#endif

void main(void) {
	x = vPosition.x;
	y = vPosition.y;
	z = vPosition.z;

	vec3 surfColor;
	if (uGlowPass && !uUseGlow) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	} else {
		#ifdef USETEXTURE
		//if (uUseTexture) {
			vec2 texCoord = vec2(
				vTexCoord.x * uTextureRepeatX,
				vTexCoord.y * uTextureRepeatY
			);
			surfColor = texture2D(uTexture, texCoord).rgb;
		#else
		//} else {
			surfColor = vColor;
		//}
		#endif
	}

	#ifdef USEGLOW
	float glowStrength = 1.0;
	/*GLOW_STRENGTH*/
	surfColor *= glowStrength;
	#endif

	#ifdef USELIGHTING
	//if (uUseLighting) {
		vec3 normal = normalize(vNormal.xyz);
		vec3 light = lighting(normal);

		vec3 shadedColor = surfColor * (uAmbientColor + light);
		gl_FragColor = vec4(shadedColor, 1.0);
	#else
	//} else {
		gl_FragColor = vec4(surfColor, 1.0);
	//}
	#endif

}

