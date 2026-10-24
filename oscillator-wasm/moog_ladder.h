//
// Created by richard on 24/10/2026.
//

#ifndef MOOG_LADDER_H
#define MOOG_LADDER_H

#ifndef M_PI_F
#define M_PI_F 3.14159265358979323846f
#endif
#include "structs.h"

void moog_init(MoogLadderFilter* filter, float sample_rate);
void moog_set_params(MoogLadderFilter* filter, float cutoff_hz, float resonance);
float moog_process_sample(MoogLadderFilter* filter, float x);

#endif // MOOG_LADDER_H

