#include <emscripten.h>
#include  <emscripten/console.h>
#include <math.h>

#include "lfo.h"
#include "structs.h"

// Initialize the filter state
void allpass_init(SecondOrderAllPass *ap) {
    ap->b0 = 1.0f;
    ap->b1 = 0.0f;
    ap->b2 = 0.0f;
    ap->a1 = 0.0f;
    ap->a2 = 0.0f;

    ap->x1 = 0.0f;
    ap->x2 = 0.0f;
    ap->y1 = 0.0f;
    ap->y2 = 0.0f;
}

// Calculate coefficients using Audio EQ Cookbook formulas
void allpass_set_parameters(SecondOrderAllPass *ap, float freq, float q, float sample_rate) {
    // Sanity bounds for controls
    if (freq < 1.0f) freq = 1.0f;
    if (freq > sample_rate * 0.49f) freq = sample_rate * 0.49f;
    if (q < 0.01f) q = 0.01f;

    // Angular frequency and alpha calculation
    float omega = 2.0f * 3.14159265359f * freq / sample_rate;
    float alpha = sinf(omega) / (2.0f * q);
    float cos_w = cosf(omega);

    // Filter normalization factor
    float a0 = 1.0f + alpha;

    // Standard Biquad All-Pass Coefficients (divided by a0)
    ap->b0 = (1.0f - alpha) / a0;
    ap->b1 = (-2.0f * cos_w) / a0;
    ap->b2 = (1.0f + alpha) / a0;
    ap->a1 = (-2.0f * cos_w) / a0;
    ap->a2 = (1.0f - alpha) / a0;
}

// Process a single sample
float allpass_process(SecondOrderAllPass *ap, float x0) {
    // Difference equation calculation
    float y0 = (ap->b0 * x0) + (ap->b1 * ap->x1) + (ap->b2 * ap->x2)
               - (ap->a1 * ap->y1) - (ap->a2 * ap->y2);

    // Update history states
    ap->x2 = ap->x1;
    ap->x1 = x0;
    ap->y2 = ap->y1;
    ap->y1 = y0;

    return y0;
}

void phaser_init(Phaser *phaser, int sampleRate) {
    phaser->numSections = 64;
    phaser->lfoData = calloc(1, sizeof(LfoData));
    lfo_init(phaser->lfoData, sampleRate);

    phaser->sampleRate = sampleRate;
    phaser->allPassSections = calloc(phaser->numSections, sizeof(SecondOrderAllPass));
    phaser->frequency = 1.0f;
    phaser->Q = 1.0f;
    phaser->level = 1.0f;
    phaser->feedback = 0.0f;
    phaser->wetDry = 0.5f;
    phaser->sectionsInUse = 5;

    for (int i = 0; i < phaser->numSections; i++) {
        SecondOrderAllPass *ap = &phaser->allPassSections[i];
        allpass_init(ap);
        allpass_set_parameters(ap, phaser->frequency, phaser->Q, sampleRate);;
    }
}

void phaser_set_frequency(Phaser *phaser, float freq) {
    phaser->frequency = freq;
    for (int i = 0; i < phaser->numSections; i++) {
        SecondOrderAllPass *ap = &phaser->allPassSections[i];
        allpass_set_parameters(ap, freq, phaser->Q, phaser->sampleRate);
    }
}

void phaser_set_q(Phaser *phaser, float q) {
    phaser->Q = q;
    for (int i = 0; i < phaser->numSections; i++) {
        SecondOrderAllPass *ap = &phaser->allPassSections[i];
        allpass_set_parameters(ap, phaser->frequency, q, phaser->sampleRate);
    }
}

void phaser_set_level(Phaser *phaser, float level) {
    phaser->level = level;
}

void phaser_set_wet_dry(Phaser *phaser, float wetDry) {
    phaser->wetDry = wetDry;
}

void phaser_set_stages(Phaser *phaser, int stages) {
    phaser->sectionsInUse = stages;
}

extern long count;

float phaser_process(Phaser *phaser, float input) {
    float output = input;
    for (int i = 0; i < phaser->sectionsInUse; i++) {
        SecondOrderAllPass *ap = &phaser->allPassSections[i];
        output = allpass_process(ap, output);
    }
    const float wetDry = phaser->wetDry;
    return phaser->level * output * (wetDry+1.0f) - input * (wetDry-1.0f);
}
