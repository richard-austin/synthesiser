#include <stdlib.h>
#include <time.h>

#include "envelope.h"
#include "structs.h"

void noise_init(Noise* n, int oscillatorsPerBank) {
    n->type = WHITE;
    n->output = OFF;
    envelope_data_init(&n->envelopeData);
    n->oscillatorsPerBank = oscillatorsPerBank;
    n->envelopes = calloc(g_oscillatorsPerBank, sizeof(Envelope));
    for (int e = 0; e < oscillatorsPerBank; ++e)
        envelope_init(&n->envelopes[e], &n->envelopeData);

    srand(time(NULL));
}

void noise_init_envelope(Noise* n, int oscIndex) {
    Envelope* envelope = &n->envelopes[oscIndex];

    envelope->t = 0.0f;
    n->envelopeData.velocity = 0.0f;
    envelope->keyDown = true;
    envelope->inUse = true;
    envelope->phase = ENV_INACTIVE;;
}

float noise(Noise* n, int osc) {
    return n->envelopes[osc].level * n->gain * 2.0f*(0.5f - rand() / (float) RAND_MAX);
}
