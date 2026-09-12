#ifndef SVF4_FILTER_H
#define SVF4_FILTER_H

#include "structs.h"

void svf4_init(SVF4Filter *f, float sampleRate);

void svf4_set_params(SVF4Filter *f, float cutoffHz, float qFactor);
void svf4_set_morph(SVF4Filter *f, float morphValue);

float svf4_process_morph(SVF4Filter *f, float input);

#endif
