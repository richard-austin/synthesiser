#ifndef ENVELOPE
#define ENVELOPE

#include "globals.h"

void envelope_data_init(EnvelopeData *ed);

// --- Envelope Phase Traversal Mathematics ---
void envelope_init(Envelope *env, EnvelopeData *data);

void envelope_set_timing(Envelope *env, float value, float time);

float envelope_ramp(Envelope *env);

void envelope_sustain_time(Envelope *env);

void envelope_advance_to_sustain(Envelope *env);

void envelope_advance_to_zero(Envelope *env);


#endif
