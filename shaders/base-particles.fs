precision highp float;

varying vec4 vPosition;
varying mat4 vModelViewMatrix;

varying vec3 vColor;

uniform vec4 uViewport;

uniform float uTime;
uniform float uDisplayAspect;

uniform float uRadius;

uniform float uAudioBass;
uniform float uAudioMid;
uniform float uAudioTreb;
uniform float uAudioBeat;
uniform float uVariables[8];

uniform bool uGlowPass;
uniform bool uUseGlow;

varying float vAspect;
varying vec4 vPoint;

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

/*GET_POINT_COORD_FS*/

void main(void) {

	x = vPosition.x;
	y = vPosition.y;
	z = vPosition.z;

	vec2 pointCoord = getPointCoord();

	pointCoord.y *= vAspect;
	pointCoord.x *= uDisplayAspect;

	if (length(pointCoord) > 1.0) {
		discard;
	}

	if (uGlowPass && !uUseGlow) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
		return;
	}

	float glowStrength = 1.0;
	float x = vPosition.x;
	float y = vPosition.y;
	float z = vPosition.z;

	/*GLOW_STRENGTH*/

	//glowStrength = 0.3 + (mid > 0.7 ? 0.6 : 0.0) + (treb > 0.2 ? 0.5 : 0.0);// + (1.0 + sin(abs(x*y*z)/10.0-2.0*time));

	vec3 particleColor = vColor * glowStrength;
	gl_FragColor = vec4(particleColor, 1.0);

}

