#include <stdlib.h>
#include "structs.h"

#include "svf.h"
#include "envelope.h"

void svf4_init(SVF4Filter *f, float sampleRate) {
    f->stage1 = malloc(sizeof(SVFFilter));
    f->stage2 = malloc(sizeof(SVFFilter));
    svf_init(f->stage1, sampleRate);
    svf_init(f->stage2, sampleRate);
    envelope_init(&f->envelope, &f->envelopeData);
    f->envelopeData.attack = 0.03f;
    f->envelopeData.decay = 0.0f;
    f->envelopeData.sustainLevel = 1.0f;
    f->envelopeData.release = 0.0f;
}

void svf4_set_params(SVF4Filter *f, float cutoffHz, float qFactor) {
    svf_set_params(f->stage1, cutoffHz, qFactor);
    svf_set_params(f->stage2, cutoffHz, qFactor);
}

void svf4_set_morph(SVF4Filter *f, float morphValue) {
    svf_set_morph(f->stage1, morphValue);
    svf_set_morph(f->stage2, morphValue);
}

float svf4_process_morph(SVF4Filter *f, float input) {
    const float stage1Output =  svf_process_morph(f->stage1, input);
    return svf_process_morph(f->stage2, stage1Output);
}
