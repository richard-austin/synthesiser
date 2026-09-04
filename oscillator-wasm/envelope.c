#include <emscripten/console.h>
#include <math.h>
#include "envelope.h"

void envelope_data_init(EnvelopeData *ed) {
    ed->attack = 0.0f;
    ed->decay = 0.5f;
    ed->sustainLevel = 0.0f;
    ed->release = 0.5f;
    ed->legato = false;
    ed->velocity = 0x7f;
    ed->velocitySensitive = false;
}

// --- Envelope Phase Traversal Mathematics ---
void envelope_init(Envelope *env, EnvelopeData *data) {
    env->envelopeData = data;
    env->lowestTime = 0.0001f;
    env->lowestLevel = 0.0000001f;
    env->v0 = env->lowestLevel;
    env->v1 = env->lowestLevel;
    env->level = env->lowestLevel;
    env->targetReached = false;
    env->phase = ENV_INACTIVE;
    env->inUse = false;
    env->keyDown = false;
}

void envelope_set_timing(Envelope *env, float value, float time) {
    // FIX: Prevent env->v0 from being 0 or lower than env->lowestLevel
    float currentLevel = env->level;
    if (currentLevel < env->lowestLevel) {
        currentLevel = env->lowestLevel;
    }

    env->v0 = currentLevel;
    env->v1 = value + env->lowestLevel;
    env->t0 = env->t;
    env->t1 = env->t0 + time + env->lowestTime;
    env->targetReached = false;
}

float envelope_ramp(Envelope *env) {
    static long count = 0;
    env->t += 1.0f / g_sampleRate;
    if ((env->t1 - env->t0) == 0) {
        env->level = env->v1;
        env->targetReached = true;
    } else {
        env->level = env->v0 * powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0));
        if (isnanf(env->level) && (count++ % 300000 == 0))
            emscripten_console_errorf(
                "NaN returned by powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0) in pitch envelope");
        if (env->t >= env->t1) {
            env->targetReached = true;
            env->level = env->v1;
        }
    }
    return env->level;
}

void envelope_sustain_time(Envelope *env) {
    env->t += 1.0f / g_sampleRate;
    if (env->t >= env->t1)
        env->targetReached = true;
}

void envelope_advance_to_sustain(Envelope *env) {
    float vel = (float) env->envelopeData->velocity / 127.0f;
    EnvelopeData *envData = env->envelopeData;
    if (env->keyDown) {
        float attackTarget = envData->velocitySensitive ? vel : 1.0f;
        if (!envData->legato) {
            if (env->phase != ENV_ATTACK && env->phase != ENV_DECAY && env->phase != ENV_SUSTAIN) {
                env->inUse = true;
                envelope_set_timing(env, attackTarget, envData->attack);
                env->phase = ENV_ATTACK;
            } else if (env->phase == ENV_ATTACK) {
                env->level = envelope_ramp(env);
                if (env->targetReached) {
                    env->phase = ENV_DECAY;
                    envelope_set_timing(env, envData->sustainLevel, envData->decay);
                }
            } else if (env->phase == ENV_DECAY) {
                env->level = envelope_ramp(env);
                if (env->targetReached) {
                    env->phase = ENV_SUSTAIN;
                    env->level = envData->sustainLevel;
                }
            }
        } else {
            if (env->phase != ENV_ATTACK) {
                env->inUse = true;
                envelope_set_timing(env, attackTarget, envData->attack);
                env->phase = ENV_ATTACK;
            } else if (env->phase == ENV_ATTACK) {
                env->level = envelope_ramp(env);
                if (env->targetReached) {
                    env->phase = ENV_DECAY;
                    env->level = attackTarget;
                }
            }
        }
    }
}

void envelope_advance_to_zero(Envelope *env) {
    EnvelopeData *envData = env->envelopeData;
    if (!env->keyDown) {
        if (!envData->legato) {
            if (env->phase != ENV_RELEASE && env->phase != ENV_INACTIVE) {
                env->phase = ENV_RELEASE;
                envelope_set_timing(env, env->lowestLevel, envData->release);
            } else if (env->phase == ENV_RELEASE) {
                env->level = envelope_ramp(env);
                if (env->targetReached) {
                    env->level = env->lowestLevel;
                    env->inUse = false;
                    env->phase = ENV_INACTIVE;
                }
            }
        } else {
            if (env->phase != ENV_SUSTAIN && env->phase != ENV_RELEASE && env->phase != ENV_INACTIVE) {
                envelope_set_timing(env, env->lowestLevel, envData->decay);
                env->phase = ENV_SUSTAIN;
            } else if (env->phase == ENV_SUSTAIN) {
                envelope_sustain_time(env);
                if (env->targetReached) {
                    env->phase = ENV_RELEASE;
                    envelope_set_timing(env, env->lowestLevel, envData->release);
                }
            } else if (env->phase == ENV_RELEASE) {
                env->level = envelope_ramp(env);
                if (env->targetReached) {
                    env->inUse = false;
                    env->phase = ENV_INACTIVE;
                }
            }
        }
    }
}
