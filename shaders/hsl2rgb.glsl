#ifdef GL_ES
precision highp float;
#endif

// http://www.nathanm.com/photoshop-blending-math/

float hue2rgb(float M1, float M2, float hue) {
	float c;
    if (hue < 0.0) {
        hue += 1.0;
    } else if (hue > 1.0) {
        hue -= 1.0;
	}
    if ((6.0 * hue) < 1.0) {
        c = (M1 + (M2 - M1) * hue * 6.0);
    } else if ((2.0 * hue) < 1.0) {
        c = M2;
    } else if ((3.0 * hue) < 2.0) {
        c = (M1 + (M2 - M1) * ((2.0/3.0) - hue) * 6.0);
    } else {
        c = M1;
	}
	return c;
}

vec3 hsl2rgb(vec3 hsl) {
    float M1, M2;
	float hue = hsl.x;
	float saturation = hsl.y;
	float lightness = hsl.z;
    vec3 color;
	if (saturation == 0.0) {
		color.r = lightness;
		color.g = lightness;
		color.b = lightness;
	} else {
		if (lightness <= 0.5) {
			M2 = lightness * (1.0 + saturation);
		} else {
			
			M2 = lightness + saturation - lightness * saturation;
		}
        M1 = (2.0 * lightness - M2);
        color.r = hue2rgb(M1, M2, hue + (1.0/3.0));
        color.g = hue2rgb(M1, M2, hue);
        color.b = hue2rgb(M1, M2, hue - (1.0/3.0));
	}
 	return color;
}
