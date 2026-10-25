//
// Created by richard on 25/10/2026.
//
#include "filter.h"
#include "svf4_filter.h"
#include "moog_ladder.h"
#include "envelope.h"

void filter_init(Filter* filter, int sampleRate) {
    moog_init(&filter->moog, sampleRate);
    svf4_init(&filter->svf, sampleRate);

    filter->useMoog = true;

    envelope_init(&filter->envelope, &filter->envelopeData);
    filter->envelopeData.attack = 0.03f;
    filter->envelopeData.decay = 0.0f;
    filter->envelopeData.sustainLevel = 1.0f;
    filter->envelopeData.release = 0.0f;

    filter->cutoffHz = 100.0f;
    filter->qFactor = 1.0f;
}

void filter_set_params(Filter* filter, float cutoffHz, float qFactor) {
    filter->cutoffHz = cutoffHz;
    filter->qFactor = qFactor;

    svf4_set_params(&filter->svf, cutoffHz, qFactor);
    moog_set_params((&filter->moog), cutoffHz, qFactor);
}

float filter_process(Filter* filter, float sample) {
    float output;
    if (filter->useMoog)
        output = moog_process_sample(&filter->moog, sample);
    else
        output = svf4_process_morph(&filter->svf, sample);
    return output;
}

void filter_set_morph(Filter* filter, float morphValue) {
    svf4_set_morph(&filter->svf, morphValue);
}
