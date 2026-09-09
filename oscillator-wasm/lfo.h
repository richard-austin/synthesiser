#ifndef LFO
#define LFO

#include "structs.h"

void lfo_init(LfoData *data, long waveTableSize);

void lfo_advance(LfoData *ld);

float render_lfo_sample(LfoData *ld);

#endif
