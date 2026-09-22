#include <emscripten/console.h>
#include <math.h>
#include "pitch_envelope.h"

// --- Envelope Phase Traversal Mathematics ---
void pitch_envelope_init(PitchEnvelope *env, PitchEnvelopeData *data) {
    env->envelopeData = data;
    env->lowestTime = 0.0001f;
    env->lowestLevel = 0.0000001f;
    env->v0 = env->lowestLevel;
    env->v1 = env->lowestLevel;
    env->level = env->lowestLevel;
    env->targetReached = false;
    env->phase = ENV_INACTIVE;
    env->inUse = false;
}

void pitch_envelope_set_timing(PitchEnvelope *env, float value, float time) {
    // FIX: Prevent env->v0 from being 0 or lower than env->lowestLevel
    float currentLevel = env->level;
    if (fabs(currentLevel) < env->lowestLevel)
        currentLevel = env->lowestLevel;

    env->v0 = currentLevel;
    env->v1 = value + env->lowestLevel;
    env->t0 = env->t;
    env->t1 = env->t0 + time + env->lowestTime;
    env->targetReached = false;
}

void pitch_envelope_data_init(PitchEnvelopeData *ped) {
    ped->attack = 0.0f;
    ped->attackLevel = 0.0f;
    ped->decay = 0.5f;
    ped->sustainLevel = 0.0f;
    ped->release = 0.5f;
    ped->releaseLevel = 0.0f;
}

float pitch_envelope_ramp(PitchEnvelope *env) {
    static long count = 0;
    env->t += 1.0f / g_sampleRate;
    if ((env->t1 - env->t0) == 0) {
        env->level = env->v1;
        env->targetReached = true;
    } else {
        env->level = env->v0 * powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0));
        if (isnanf(env->level) && (count++ % 300000) == 0) {
            emscripten_console_logf("v0 %f v1 %f t %f t0 %f t1 %f", env->v0, env->v1, env->t, env->t0, env->t1);
            emscripten_console_errorf(
                "NaN returned by powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0) in pitch envelope");
        } else
            count = 0;
        if (env->t >= env->t1) {
            env->targetReached = true;
            env->level = env->v1;
        }
    }
    return env->level;
}

void pitch_envelope_sustain_time(PitchEnvelope *env) {
    env->t += 1.0f / g_sampleRate;
    if (env->t >= env->t1)
        env->targetReached = true;
}

void pitch_envelope_advance_to_sustain(PitchEnvelope *env) {
    PitchEnvelopeData *envData = env->envelopeData;
    if (env->phase != ENV_ATTACK && env->phase != ENV_DECAY && env->phase != ENV_SUSTAIN) {
        env->inUse = true;
        pitch_envelope_set_timing(env, envData->attackLevel, envData->attack);
        env->phase = ENV_ATTACK;
    } else if (env->phase == ENV_ATTACK) {
        env->level = pitch_envelope_ramp(env);
        if (env->targetReached) {
            env->phase = ENV_DECAY;
            pitch_envelope_set_timing(env, envData->sustainLevel, envData->decay);
        }
    } else if (env->phase == ENV_DECAY) {
        env->level = pitch_envelope_ramp(env);
        if (env->targetReached)
            env->phase = ENV_SUSTAIN;
    }
}

void pitch_envelope_advance_to_release_level(PitchEnvelope *env) {
    PitchEnvelopeData *envData = env->envelopeData;
    if (env->phase != ENV_RELEASE && env->phase != ENV_INACTIVE) {
        env->phase = ENV_RELEASE;
        pitch_envelope_set_timing(env, envData->releaseLevel, envData->release);
    } else if (env->phase == ENV_RELEASE) {
        env->level = pitch_envelope_ramp(env);
        if (env->targetReached) {
            env->inUse = false;
            env->phase = ENV_INACTIVE;
        }
    }
}
