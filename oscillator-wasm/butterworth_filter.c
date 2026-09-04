#include "butterworth_filter.h"
#include <math.h>

// --- Filter Architecture Logic ---
void butterworth_calculate_coefficients(ButterworthFilter *f, float cutoff, float sampleRate)
{
    float omega = m_pi * cutoff / sampleRate;
    float tanVal = tanf(omega);
    float sqrt2 = 1.41421356f;
    float c2 = tanVal * tanVal;
    float a0 = 1.0f + sqrt2 * tanVal + c2;
    f->b0 = c2 / a0;
    f->b1 = 2.0f * c2 / a0;
    f->b2 = c2 / a0;
    f->a1 = 2.0f * (c2 - 1.0f) / a0;
    f->a2 = (1.0f - sqrt2 * tanVal + c2) / a0;
}

float butterworth_process(ButterworthFilter *f, float input)
{
    float output = f->b0 * input + f->b1 * f->x1 + f->b2 * f->x2 - f->a1 * f->y1 - f->a2 * f->y2;
    f->x2 = f->x1;
    f->x1 = input;
    f->y2 = f->y1;
    f->y1 = output;
    return output;
}

