#ifndef __BUTTERWORTH
#define __BUTTERWORTH
#include "globals.h"

// --- Filter Architecture Logic ---
void butterworth_calculate_coefficients(ButterworthFilter *f, float cutoff, float sampleRate);
float butterworth_process(ButterworthFilter *f, float input);

#endif
