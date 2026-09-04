#ifndef __FILTER
#define __FILTER
#include "globals.h"

void svf_init(SVFFilter *f, float sampleRate);
void svf_set_params(SVFFilter *f, float cutoffHz, float qFactor);
void svf_set_morph(SVFFilter *f, float morphValue);
float svf_process_morph(SVFFilter *f, float input);

#endif
