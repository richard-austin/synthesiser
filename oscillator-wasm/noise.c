#include <stdlib.h>
#include <time.h>

#include "envelope.h"
#include "structs.h"

void noise_init(Noise *n, int oscillatorsPerBank) {
    n->type = WHITE;
    n->output = OFF;
    envelope_data_init(&n->envelopeData);
    n->oscillatorsPerBank = oscillatorsPerBank;
    n->envelopes = calloc(g_oscillatorsPerBank, sizeof(Envelope));
    for (int e = 0; e < oscillatorsPerBank; ++e)
        envelope_init(&n->envelopes[e], &n->envelopeData);

    // Initialise pink noise variables
    n->b0 = 0.0f;
    n->b1 = 0.0f;
    n->b2 = 0.0f;
    n->b3 = 0.0f;
    n->b4 = 0.0f;
    n->b5 = 0.0f;
    n->b6 = 0.0f;
    n->lastOut = 0.0f;

    srand(time(NULL));
}

void noise_init_envelope(Noise *n, int oscIndex) {
    Envelope *envelope = &n->envelopes[oscIndex];

    envelope->t = 0.0f;
    n->envelopeData.velocity = 0.0f;
    envelope->keyDown = true;
    envelope->inUse = true;
    envelope->phase = ENV_INACTIVE;;
}

float noise(Noise *n, int osc) {
    float white = n->envelopes[osc].level * n->gain * 2.0f * (0.5f - rand() / (float) RAND_MAX);
    switch (n->type) {
        case WHITE:
            return white;
            break;
        case PINK:
            n->b0 = 0.99886 * n->b0 + white * 0.0555179;
            n->b1 = 0.99332 * n->b1 + white * 0.0750759;
            n->b2 = 0.96900 * n->b2 + white * 0.1538520;
            n->b3 = 0.86650 * n->b3 + white * 0.3104856;
            n->b4 = 0.55000 * n->b4 + white * 0.5329522;
            n->b5 = -0.7616 * n->b5 - white * 0.0168980;
            float pink = n->b0 + n->b1 + n->b2 + n->b3 + n->b4 + n->b5 + n->b6 + white * 0.5362;
            pink *= 0.11; // (roughly) compensate for gain
            n->b6 = white * 0.115926;
            return pink;
            break;
        case BROWN: {
                float brown = (n->lastOut + (0.02 * white)) / 1.02;
                n->lastOut = brown;
                return brown * 3.5; // (roughly) compensate for gain
            }
            break;
        default:
            return 0.0f;
            break;
    }
}
