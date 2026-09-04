#include <math.h>
#include "filter.h"

void svf_init(SVFFilter *f, float sampleRate)
{
    f->sampleRate = sampleRate;
    f->ic1eq = 0.0f;
    f->ic2eq = 0.0f;
    f->cutoffHz = 1000.0f;
    f->resonance = 0.707f; // Standard clean Butterworth Q damping factor
    f->morphMode = 1.0f;
    f->g = 0.0f;
    f->k = 0.0f;
    f->a1 = f->a2 = f->a3 = 0.0f;
}

void svf_set_params(SVFFilter *f, float cutoffHz, float qFactor)
{
    // Clamp cutoff safely below Nyquist to keep the tangent stable
    float maxF = f->sampleRate * 0.49f;
    f->cutoffHz = cutoffHz < 5.0f ? 5.0f : (cutoffHz > maxF ? maxF : cutoffHz);

    // DIRECT DAMPING PARAMETER MAPPING:
    // When qFactor is 0.0 -> k is 2.0 (Completely flat, over-damped)
    // When qFactor is 0.7 -> k is ~0.2 (Sharp, beautiful musical peak)
    // When qFactor is 1.0 -> k is exactly 0.0 (Pure self-oscillation whistle)
    float inverseQ = 1.0f - qFactor;
    f->k = 2.0f * (inverseQ * inverseQ * inverseQ); // 3rd power curve for smooth analog feel

    // Pre-warp coefficient evaluated at the 2x oversampled sub-step rate
    f->g = tanf((float)M_PI * f->cutoffHz / (2.0f * f->sampleRate));

    // Matrix loop denominator calculation
    f->a1 = 1.0f / (1.0f + f->g * (f->g + f->k));
}

void svf_set_morph(SVFFilter *f, float morphValue)
{
    // Clamp the incoming crossfade slider value safely between 0.0 and 2.0
    f->morphMode = morphValue < 0.0f ? 0.0f : (morphValue > 2.0f ? 2.0f : morphValue);
}

float svf_process_morph(SVFFilter *f, float input)
{
    float lp = 0.0f, bp = 0.0f, hp = 0.0f;

    // Internal 2x Oversampling execution
    for (int subStep = 0; subStep < 2; subStep++)
    {
        float v0 = input;
        float v1 = f->ic1eq;
        float v2 = f->ic2eq;

        // PURE LINEAR ZERO-DELAY RESOLUTION
        // Removing internal tanhf() distortion inside the loop allows the loop
        // gain to reach exactly 1.0, enabling pristine, infinite self-oscillation.
        hp = (v0 - (f->k + f->g) * v1 - v2) * f->a1;
        bp = f->g * hp + v1;
        lp = f->g * bp + v2;

        // Linear integration step updates with an added micro-damping layer
        // This stops extreme math registers from expanding under infinite feedback loop states.
        f->ic1eq = (2.0f * bp - v1) * 0.9999f;
        f->ic2eq = (2.0f * lp - v2) * 0.9999f;
    }

    // Safety check against invalid numbers or infinite values
    if (isnanf(f->ic1eq) || isinf(f->ic1eq) || isnanf(f->ic2eq) || isinf(f->ic2eq))
    {
        f->ic1eq = 0.0f;
        f->ic2eq = 0.0f;
        return 0.0f;
    }

    // Morph crossfade layer
    float finalOutput = 0.0f;
    float m = f->morphMode;

    if (m <= 1.0f)
    {
        finalOutput = lp + m * (bp - lp);
    }
    else
    {
        float weight = m - 1.0f;
        finalOutput = bp + weight * (hp - bp);
    }

    return finalOutput;
}
