// Homography.h — solves the 3x3 perspective transform that carries four points onto four others
#ifndef Homography_h
#define Homography_h

#include <stdbool.h>

// Fills `out` (row-major, h22 fixed at 1) so that dst ~ H * src for the four point pairs.
// Returns false when the points are degenerate (e.g. three of them are collinear).
bool WNWHomographyFromQuads(const double src[4][2], const double dst[4][2], double out[9]);

// Applies `h` to (x, y), writing the dehomogenised result. Returns false if the point maps to infinity.
bool WNWHomographyApply(const double h[9], double x, double y, double *u, double *v);

#endif
