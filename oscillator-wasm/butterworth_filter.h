#ifndef __BUTTERWORTH
#define __BUTTERWORTH
#include "globals.h"

void butterworth_init(ButterworthFilter *f);
// --- Filter Architecture Logic ---
void butterworth_calculate_coefficients(ButterworthFilter *f, float cutoff, float sampleRate);

float butterworth_process(ButterworthFilter *f, float input);

#endif
