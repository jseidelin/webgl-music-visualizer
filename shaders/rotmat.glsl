mat4 rotationMatrix(vec3 axis, float theta) {
	float s = sin(theta);
	float c = cos(theta);
	float t = 1.0 - c;
	float ax = axis.x, ay = axis.y, az = axis.z;
	
	return mat4(
		t*ax*ax + c, t*ax*ay - s*az, t*ax*az + s*ay, 0.0,
		t*ax*ay + s*az, t*ay*ay + c, t*ay*az - s*ax, 0.0,
		t*ax*az - s*ay, t*ay*az + s*ax, t*az*az + c, 0.0,
		0.0, 0.0, 0.0, 1.0
	);
}
