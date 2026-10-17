// Homography.c — direct linear transform for exactly four point pairs, solved by Gaussian elimination
#include "Homography.h"
#include <math.h>

bool WNWHomographyFromQuads(const double src[4][2], const double dst[4][2], double out[9]) {
  // Unknowns h0...h7. Each pair gives two rows:
  //   x*h0 + y*h1 + h2 - u*x*h6 - u*y*h7 = u
  //   x*h3 + y*h4 + h5 - v*x*h6 - v*y*h7 = v
  double a[8][9];
  for (int i = 0; i < 4; i++) {
    double x = src[i][0], y = src[i][1], u = dst[i][0], v = dst[i][1];
    double r0[9] = {x, y, 1, 0, 0, 0, -u * x, -u * y, u};
    double r1[9] = {0, 0, 0, x, y, 1, -v * x, -v * y, v};
    for (int j = 0; j < 9; j++) {
      a[2 * i][j] = r0[j];
      a[2 * i + 1][j] = r1[j];
    }
  }

  for (int col = 0; col < 8; col++) {
    int pivot = col;
    for (int row = col + 1; row < 8; row++) {
      if (fabs(a[row][col]) > fabs(a[pivot][col])) pivot = row;
    }
    if (fabs(a[pivot][col]) < 1e-12) return false;
    if (pivot != col) {
      for (int j = 0; j < 9; j++) { double t = a[col][j]; a[col][j] = a[pivot][j]; a[pivot][j] = t; }
    }
    for (int row = col + 1; row < 8; row++) {
      double f = a[row][col] / a[col][col];
      for (int j = col; j < 9; j++) a[row][j] -= f * a[col][j];
    }
  }

  double h[8];
  for (int row = 7; row >= 0; row--) {
    double sum = a[row][8];
    for (int j = row + 1; j < 8; j++) sum -= a[row][j] * h[j];
    h[row] = sum / a[row][row];
  }
  for (int i = 0; i < 8; i++) out[i] = h[i];
  out[8] = 1;
  return true;
}

bool WNWHomographyApply(const double h[9], double x, double y, double *u, double *v) {
  double w = h[6] * x + h[7] * y + h[8];
  if (fabs(w) < 1e-12) return false;
  *u = (h[0] * x + h[1] * y + h[2]) / w;
  *v = (h[3] * x + h[4] * y + h[5]) / w;
  return true;
}
