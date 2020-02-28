Math.clamp = (x, min, max) => (x > max ? max : x < min ? min : x);
Math.lerp = (from, to, k) => (1 - k) * from + k * to;
