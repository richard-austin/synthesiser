#include "moog_ladder.h"
#include <math.h>

#include "envelope.h"
#include "emscripten/console.h"

static inline float safe_tanhf(float x) {
    if (x != x) return 0.0f;
    if (x <= -3.0f) return -1.0f;
    if (x >= 3.0f)  return 1.0f;

    float x2 = x * x;
    return x * (27.0f + x2) / (27.0f + 9.0f * x2);
}

void moog_init(MoogLadderFilter* filter, float sample_rate) {
    filter->fs = (sample_rate <= 0.0f) ? 44100.0f : sample_rate;
    filter->y_a = 0.0f;
    filter->y_b = 0.0f;
    filter->y_c = 0.0f;
    filter->y_d = 0.0f;
    filter->y_d_prev = 0.0f;
    filter->x_prev = 0.0f;
    filter->gain_compensation = 1.0f;

    moog_set_params(filter, 1000.0f, 0.0f);
    envelope_init(&filter->envelope, &filter->envelopeData);
    filter->envelopeData.attack = 0.03f;
    filter->envelopeData.decay = 0.0f;
    filter->envelopeData.sustainLevel = 1.0f;
    filter->envelopeData.release = 0.0f;

}

void moog_set_params(MoogLadderFilter* filter, float cutoff_hz, float resonance) {
    if (filter->fs <= 0.0f) filter->fs = 44100.0f;

    if (cutoff_hz < 1.0f) cutoff_hz = 1.0f;
    float max_cutoff = filter->fs * 0.49f;
    if (cutoff_hz > max_cutoff) cutoff_hz = max_cutoff;

    float internal_fs = filter->fs * 2.0f;
    filter->g = 1.0f - expf(-2.0f * M_PI_F * cutoff_hz / internal_fs);

    if (resonance < 0.0f) resonance = 0.0f;
    if (resonance > 1.0f) resonance = 1.0f;
    filter->res = resonance;

    // GAIN COMPENSATION CALCULATION:
    // As resonance increases towards 1.0, the total passband attenuation approaches 1/4th.
    // This formula dynamically scales up a make-up gain multiplier to level the playing field.
    // 1.0f + 3.0f * resonance means at 0% res, gain is 1.0x. At max resonance, gain scales to 3.85x.
    filter->gain_compensation = 1.0f + 3.0f * filter->res;
}

static void moog_tick_internal(MoogLadderFilter* filter, float input_sample) {
    float feedback_signal = 0.5f * (filter->y_d + filter->y_d_prev);
    filter->y_d_prev = filter->y_d;

    float input_a = input_sample - 4.0f * filter->res * feedback_signal;
    filter->y_a += filter->g * (safe_tanhf(input_a) - safe_tanhf(filter->y_a));
    filter->y_b += filter->g * (safe_tanhf(filter->y_a) - safe_tanhf(filter->y_b));
    filter->y_c += filter->g * (safe_tanhf(filter->y_b) - safe_tanhf(filter->y_c));
    filter->y_d += filter->g * (safe_tanhf(filter->y_c) - safe_tanhf(filter->y_d));

    if (filter->y_a > 4.0f) filter->y_a = 4.0f; else if (filter->y_a < -4.0f) filter->y_a = -4.0f;
    if (filter->y_b > 4.0f) filter->y_b = 4.0f; else if (filter->y_b < -4.0f) filter->y_b = -4.0f;
    if (filter->y_c > 4.0f) filter->y_c = 4.0f; else if (filter->y_c < -4.0f) filter->y_c = -4.0f;
    if (filter->y_d > 4.0f) filter->y_d = 4.0f; else if (filter->y_d < -4.0f) filter->y_d = -4.0f;
}

float moog_process_sample(MoogLadderFilter* filter, float x) {
    if (filter->g <= 0.0f) {
        moog_set_params(filter, 1000.0f, filter->res);
    }

    float x_interp = 0.5f * (x + filter->x_prev);
    filter->x_prev = x;

    moog_tick_internal(filter, x_interp);
    moog_tick_internal(filter, x);

    // Apply the active make-up gain compensation coefficient to the final lowpass stage
    return filter->y_d * filter->gain_compensation;
}
