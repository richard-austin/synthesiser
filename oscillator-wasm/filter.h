//
// Created by richard on 25/10/2026.
//

#ifndef SYNTHESISER_FILTER_H
#define SYNTHESISER_FILTER_H
#include "structs.h"

void filter_init(Filter* filter, int sampleRate);

void filter_set_params(Filter* filter, float cutoffHz, float qFactor);

float filter_process(Filter* filter, float sample);

void filter_set_morph(Filter* filter, float morphValue);

#endif //SYNTHESISER_FILTER_H
