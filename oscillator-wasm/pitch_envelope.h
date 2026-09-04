#ifndef PITCH_ENVELOPE
#define PITCH_ENVELOPE
#include "globals.h"


// --- Envelope Phase Traversal Mathematics ---
void pitch_envelope_init(PitchEnvelope *env, PitchEnvelopeData *data);

void pitch_envelope_set_timing(PitchEnvelope *env, float value, float time);

void pitch_envelope_data_init(PitchEnvelopeData *ped);
float pitch_envelope_ramp(PitchEnvelope *env);

void pitch_envelope_sustain_time(PitchEnvelope *env);
void pitch_envelope_advance_to_sustain(PitchEnvelope *env);

void pitch_envelope_advance_to_release_level(PitchEnvelope *env);

#endif
