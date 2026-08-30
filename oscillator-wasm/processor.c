#include <emscripten.h>
#include <emscripten/console.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// --- Enumerations ---
typedef enum
{
    ENV_INACTIVE = 0,
    ENV_ATTACK,
    ENV_DECAY,
    ENV_SUSTAIN,
    ENV_RELEASE,
    ENV_RETRIGGER,
    ENV_LEGATO
} envelopePhase;

typedef enum
{
    MOD_OFF = 0,
    MOD_FREQUENCY,
    MOD_AMPLITUDE
} oscModType;

typedef enum
{
    MOD_OUT_DIRECT = 1,
    MOD_OUT_ENVELOPE = 2
} oscModOutput;

typedef enum
{
    LFO_AMPLITUDE = 1,
    LFO_FREQUENCY = 2,
    LFO_OFF = 3
} lfoModType;

typedef enum
{
    LFO_SIN = 1,
    LFO_TRI = 2,
    LFO_SQUARE = 3,
    LFO_SAW = 4
} lfoWaveform;

// --- Struct Definitions ---
typedef struct
{
    float attack;
    float decay;
    float sustainLevel;
    float release;
    bool legato;
    bool velocitySensitive;
    int velocity;
} EnvelopeData;

typedef struct
{
    EnvelopeData *envelopeData;
    float lowestTime;
    float lowestLevel;
    float t0, t1, t;
    float v0, v1;
    float level;
    bool targetReached;
    envelopePhase phase;
    bool inUse;
    bool keyDown;
} Envelope;

typedef struct
{
    float attack;
    float attackLevel;
    float decay;
    float sustainLevel;
    float release;
    float releaseLevel;
} PitchEnvelopeData;

typedef struct
{
    PitchEnvelopeData *envelopeData;
    float lowestTime;
    float lowestLevel;
    float t0, t1, t;
    float v0, v1;
    float level;
    bool targetReached;
    envelopePhase phase;
    bool inUse;
} PitchEnvelope;

typedef struct
{
    float x1, x2, y1, y2;
    float b0, b1, b2, a1, a2;
} ButterworthFilter;

typedef struct
{
    float sampleRate;
    float cutoffHz;
    float resonance;

    // Internal state registers
    float ic1eq;
    float ic2eq;

    // Filter coefficients
    float g;
    float k;
    float a1, a2, a3;

    // FIX: Morph parameter variable state (0.0 = LP, 1.0 = BP, 2.0 = HP)
    float morphMode;
} SVFFilter;

typedef struct
{
    float frequency;
    float phase;
    float level;
    lfoModType modType;
    lfoWaveform lfoWaveform;
} LfoData;

typedef struct
{
    int key;
    Envelope env;
    PitchEnvelope pitchEnv;
    PitchEnvelope filterPitchEnv;
    float frequency;
    float phase;
    ButterworthFilter butterworthFilter;
    float filterFrequency;
    SVFFilter svf;
} OscillatorData;

typedef struct
{
    float detuneFactor;
    float tuning;
    float filterTuning;
    float filterDetuneFactor;
    EnvelopeData envelopeData;
    PitchEnvelopeData pitchEnvelopeData;
    PitchEnvelopeData filterPitchEnvelopeData;
    bool usePitchEnvelope;
    bool useFilterPitchEnvelope;
    bool useFilter;
    bool outputToFilter;
    int type; // 0=sine, 1=custom
    float *periodicWaveData;
    int numBands;
    int waveTableSize;
    oscModOutput modOutput; // 1=direct, 2=envelope
    LfoData lfoData;
    LfoData filterLfoData;
    float resonanceBankFactor;
    float oscillatorLevel;
    float filterLevel;
} BankData;

typedef struct
{
    int carrierIdx;
    float level;
    oscModType modType;
} ModSettings;

static float m_pi = M_PI;
static float two_m_pi = M_PI * 2.0f;


// --- Global Engine Core Context Variables ---
static int g_numberOfBanks = 0;
static int g_oscillatorsPerBank = 0;
static int g_waveTableSize = 2048;
static float g_startFx = 20.0f;
static float g_sampleRate = 44100.0f;
static int g_roundRobinIndex = 0;

static BankData *g_banks = NULL;
static OscillatorData **g_oscData = NULL;

static float *g_fmAccumulators = NULL;
static float *g_amAccumulators = NULL;
static ModSettings *g_modMatrix = NULL;
static float twelfthRoot2 = 1.05946309436f;

void bank_data_init(BankData* bd, int waveTableSize)
{
    bd->detuneFactor = 1.0f;
    bd->tuning = 0.0f;
    bd->filterDetuneFactor = 1.0f;
    bd->filterTuning = 0.0f;
    bd->type = 0;
    bd->periodicWaveData = NULL;
    bd->numBands = 0;
    bd->waveTableSize = waveTableSize;
    bd->modOutput = 0;
    bd->usePitchEnvelope = false;
    bd->useFilterPitchEnvelope = false;
    bd->useFilter = false;
    bd->outputToFilter = false;
    bd->oscillatorLevel = 0.0f;
    bd->filterLevel = 0.0f;
}

void oscillator_data_init(OscillatorData* od)
{
    od->key = -1;
    od->frequency = 1.0f;
    od->phase = 0.0f;
}

void lfo_init(LfoData *data)
{
    data->frequency = 0.0f;
    data->phase = 0.0f;
    data->level = 0.0f;
    data->modType = LFO_OFF;
    data->lfoWaveform = LFO_SIN;
}

void lfo_advance(LfoData* ld)
{
    if (ld->modType != LFO_OFF)
    {
        ld->phase += (ld->frequency / g_sampleRate);
        if(ld->phase >= 1)
            ld->phase -= 1;
    }
}

float lfo_output(LfoData *ld)
{
    return sinf(ld->phase * two_m_pi) * ld->level;
}

// --- Filter Architecture Logic ---
void butterworth_calculate_coefficients(ButterworthFilter *f, float cutoff, float sampleRate)
{
    float omega = m_pi * cutoff / sampleRate;
    float tanVal = tanf(omega);
    float sqrt2 = 1.41421356f;
    float c2 = tanVal * tanVal;
    float a0 = 1.0f + sqrt2 * tanVal + c2;
    f->b0 = c2 / a0;
    f->b1 = 2.0f * c2 / a0;
    f->b2 = c2 / a0;
    f->a1 = 2.0f * (c2 - 1.0f) / a0;
    f->a2 = (1.0f - sqrt2 * tanVal + c2) / a0;
}

float butterworth_process(ButterworthFilter *f, float input)
{
    float output = f->b0 * input + f->b1 * f->x1 + f->b2 * f->x2 - f->a1 * f->y1 - f->a2 * f->y2;
    f->x2 = f->x1;
    f->x1 = input;
    f->y2 = f->y1;
    f->y1 = output;
    return output;
}

void svf_init(SVFFilter *f, float sampleRate)
{
    f->sampleRate = sampleRate;
    f->ic1eq = 0.0f;
    f->ic2eq = 0.0f;
    f->cutoffHz = 1000.0f;
    f->resonance = 0.707f; // Standard clean Butterworth Q damping factor
    f->morphMode = 1.0f;
    f->g = 0.0f;
    f->k = 0.0f;
    f->a1 = f->a2 = f->a3 = 0.0f;
}

void svf_set_params(SVFFilter *f, float cutoffHz, float qFactor)
{
    // Clamp cutoff safely below Nyquist to keep the tangent stable
    float maxF = f->sampleRate * 0.49f;
    f->cutoffHz = cutoffHz < 5.0f ? 5.0f : (cutoffHz > maxF ? maxF : cutoffHz);

    // DIRECT DAMPING PARAMETER MAPPING:
    // When qFactor is 0.0 -> k is 2.0 (Completely flat, over-damped)
    // When qFactor is 0.7 -> k is ~0.2 (Sharp, beautiful musical peak)
    // When qFactor is 1.0 -> k is exactly 0.0 (Pure self-oscillation whistle)
    float inverseQ = 1.0f - qFactor;
    f->k = 2.0f * (inverseQ * inverseQ * inverseQ); // 3rd power curve for smooth analog feel

    // Pre-warp coefficient evaluated at the 2x oversampled sub-step rate
    f->g = tanf((float)M_PI * f->cutoffHz / (2.0f * f->sampleRate));

    // Matrix loop denominator calculation
    f->a1 = 1.0f / (1.0f + f->g * (f->g + f->k));
}

void svf_set_morph(SVFFilter *f, float morphValue)
{
    // Clamp the incoming crossfade slider value safely between 0.0 and 2.0
    f->morphMode = morphValue < 0.0f ? 0.0f : (morphValue > 2.0f ? 2.0f : morphValue);
}

float svf_process_morph(SVFFilter *f, float input)
{
    float lp = 0.0f, bp = 0.0f, hp = 0.0f;

    // Internal 2x Oversampling execution
    for (int subStep = 0; subStep < 2; subStep++)
    {
        float v0 = input;
        float v1 = f->ic1eq;
        float v2 = f->ic2eq;

        // PURE LINEAR ZERO-DELAY RESOLUTION
        // Removing internal tanhf() distortion inside the loop allows the loop
        // gain to reach exactly 1.0, enabling pristine, infinite self-oscillation.
        hp = (v0 - (f->k + f->g) * v1 - v2) * f->a1;
        bp = f->g * hp + v1;
        lp = f->g * bp + v2;

        // Linear integration step updates with an added micro-damping layer
        // This stops extreme math registers from expanding under infinite feedback loop states.
        f->ic1eq = (2.0f * bp - v1) * 0.9999f;
        f->ic2eq = (2.0f * lp - v2) * 0.9999f;
    }

    // Safety check against invalid numbers or infinite values
    if (isnanf(f->ic1eq) || isinf(f->ic1eq) || isnanf(f->ic2eq) || isinf(f->ic2eq))
    {
        f->ic1eq = 0.0f;
        f->ic2eq = 0.0f;
        return 0.0f;
    }

    // Morph crossfade layer
    float finalOutput = 0.0f;
    float m = f->morphMode;

    if (m <= 1.0f)
    {
        finalOutput = lp + m * (bp - lp);
    }
    else
    {
        float weight = m - 1.0f;
        finalOutput = bp + weight * (hp - bp);
    }

    return finalOutput;
}

void envelope_data_init(EnvelopeData* ed)
 {
        ed->attack = 0.0f;
        ed->decay = 0.5f;
        ed->sustainLevel = 0.0f;
        ed->release = 0.5f;
        ed->legato = false;
        ed->velocity = 0x7f;
        ed->velocitySensitive = false;
 }

// --- Envelope Phase Traversal Mathematics ---
void envelope_init(Envelope *env, EnvelopeData *data)
{
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

void envelope_set_timing(Envelope *env, float value, float time)
{
    // FIX: Prevent env->v0 from being 0 or lower than env->lowestLevel
    float currentLevel = env->level;
    if (currentLevel < env->lowestLevel)
    {
        currentLevel = env->lowestLevel;
    }

    env->v0 = currentLevel;
    env->v1 = value + env->lowestLevel;
    env->t0 = env->t;
    env->t1 = env->t0 + time + env->lowestTime;
    env->targetReached = false;
}

static long count = 0;
float envelope_ramp(Envelope *env)
{
    env->t += 1.0f / g_sampleRate;
    if ((env->t1 - env->t0) == 0)
    {
        env->level = env->v1;
        env->targetReached = true;
    }
    else
    {
        env->level = env->v0 * powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0));
        if (isnanf(env->level))
            emscripten_console_errorf("NaN returned by powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0) in pitch envelope");
        if (env->t >= env->t1)
        {
            env->targetReached = true;
            env->level = env->v1;
        }
    }
    return env->level;
}

void envelope_sustain_time(Envelope *env)
{
    env->t += 1.0f / g_sampleRate;
    if (env->t >= env->t1)
        env->targetReached = true;
}

void envelope_advance_to_sustain(Envelope *env)
{
    float vel = (float)env->envelopeData->velocity / 127.0f;
    EnvelopeData *envData = env->envelopeData;
    if (env->keyDown)
    {
        float attackTarget = envData->velocitySensitive ? vel : 1.0f;
        if (!envData->legato)
        {
            if (env->phase != ENV_ATTACK && env->phase != ENV_DECAY && env->phase != ENV_SUSTAIN)
            {
                env->inUse = true;
                envelope_set_timing(env, attackTarget, envData->attack);
                env->phase = ENV_ATTACK;
            }
            else if (env->phase == ENV_ATTACK)
            {
                env->level = envelope_ramp(env);
                if (env->targetReached)
                {
                    env->phase = ENV_DECAY;
                    envelope_set_timing(env, envData->sustainLevel, envData->decay);
                }
            }
            else if (env->phase == ENV_DECAY)
            {
                env->level = envelope_ramp(env);
                if (env->targetReached)
                {
                    env->phase = ENV_SUSTAIN;
                    env->level = envData->sustainLevel;
               }
            }
        }
        else
        {
            if (env->phase != ENV_ATTACK)
            {
                env->inUse = true;
                envelope_set_timing(env, attackTarget, envData->attack);
                env->phase = ENV_ATTACK;
            }
            else if (env->phase == ENV_ATTACK)
            {
                env->level = envelope_ramp(env);
                if (env->targetReached)
                {
                    env->phase = ENV_DECAY;
                    env->level = attackTarget;
                }
            }
        }
    }
}

void envelope_advance_to_zero(Envelope *env)
{
    EnvelopeData *envData = env->envelopeData;
    if (!env->keyDown)
    {
        if (!envData->legato)
        {
            if (env->phase != ENV_RELEASE && env->phase != ENV_INACTIVE)
            {
                env->phase = ENV_RELEASE;
                envelope_set_timing(env, env->lowestLevel, envData->release);
            }
            else if (env->phase == ENV_RELEASE)
            {
                env->level = envelope_ramp(env);
                if (env->targetReached)
                {
                    env->level = env->lowestLevel;
                    env->inUse = false;
                    env->phase = ENV_INACTIVE;
                }
            }
        }
        else
        {
            if (env->phase != ENV_SUSTAIN && env->phase != ENV_RELEASE && env->phase != ENV_INACTIVE)
            {
                envelope_set_timing(env, env->lowestLevel, envData->decay);
                env->phase = ENV_SUSTAIN;
            }
            else if (env->phase == ENV_SUSTAIN)
            {
                envelope_sustain_time(env);
                if (env->targetReached)
                {
                    env->phase = ENV_RELEASE;
                    envelope_set_timing(env, env->lowestLevel, envData->release);
                }
            }
            else if (env->phase == ENV_RELEASE)
            {
                env->level = envelope_ramp(env);
                if (env->targetReached)
                {
                    env->inUse = false;
                    env->phase = ENV_INACTIVE;
                }
            }
        }
    }
}

// --- Envelope Phase Traversal Mathematics ---
void pitch_envelope_init(PitchEnvelope *env, PitchEnvelopeData *data)
{
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

void pitch_envelope_set_timing(PitchEnvelope *env, float value, float time)
{
    // FIX: Prevent env->v0 from being 0 or lower than env->lowestLevel
    float currentLevel = env->level;
    if(fabs(currentLevel) < env->lowestLevel)
        currentLevel = env->lowestLevel;

    env->v0 = currentLevel;
    env->v1 = value + env->lowestLevel;
    env->t0 = env->t;
    env->t1 = env->t0 + time + env->lowestTime;
    env->targetReached = false;
}

void pitch_envelope_data_init(PitchEnvelopeData* ped)
{
     ped->attack = 0.0f;
     ped->attackLevel = 0.0f;
     ped->decay = 0.5f;
     ped->sustainLevel = 0.0f;
     ped->release = 0.5f;
     ped->releaseLevel = 0.0f;
}

float pitch_envelope_ramp(PitchEnvelope *env)
{
    env->t += 1.0f / g_sampleRate;
    if ((env->t1 - env->t0) == 0)
    {
        env->level = env->v1;
        env->targetReached = true;
    }
    else
    {
        if((count++ % 300000)== 0)
        {
            env->level = env->v0 * powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0));
            if (isnanf(env->level))
            {
                emscripten_console_logf("v0 %f v1 %f t %f t0 %f t1 %f",env->v0, env->v1, env->t, env->t0, env->t1);
                emscripten_console_errorf("NaN returned by powf(env->v1 / env->v0, (env->t - env->t0) / (env->t1 - env->t0) in pitch envelope");
            }
            else
                count = 0;
        }
        if (env->t >= env->t1)
        {
            env->targetReached = true;
            env->level = env->v1;
        }
    }
    return env->level;
}

void pitch_envelope_sustain_time(PitchEnvelope *env)
{
    env->t += 1.0f / g_sampleRate;
    if (env->t >= env->t1)
        env->targetReached = true;
}

void pitch_envelope_advance_to_sustain(PitchEnvelope *env)
{
    PitchEnvelopeData *envData = env->envelopeData;
    if (env->phase != ENV_ATTACK && env->phase != ENV_DECAY && env->phase != ENV_SUSTAIN)
    {
        env->inUse = true;
        pitch_envelope_set_timing(env, envData->attackLevel, envData->attack);
        env->phase = ENV_ATTACK;
    }
    else if (env->phase == ENV_ATTACK)
    {
        env->level = pitch_envelope_ramp(env);
        if (env->targetReached)
        {
            env->phase = ENV_DECAY;
            pitch_envelope_set_timing(env, envData->sustainLevel, envData->decay);
        }
    }
    else if (env->phase == ENV_DECAY)
    {
        env->level = pitch_envelope_ramp(env);
        if (env->targetReached)
            env->phase = ENV_SUSTAIN;
    }
}

void pitch_envelope_advance_to_release_level(PitchEnvelope *env)
{
    PitchEnvelopeData *envData = env->envelopeData;
    if (env->phase != ENV_RELEASE && env->phase != ENV_INACTIVE)
    {
        env->phase = ENV_RELEASE;
        pitch_envelope_set_timing(env, envData->releaseLevel, envData->release);
    }
    else if (env->phase == ENV_RELEASE)
    {
        env->level = pitch_envelope_ramp(env);
        if (env->targetReached)
        {
            env->inUse = false;
            env->phase = ENV_INACTIVE;
        }
    }
}

float key_to_frequency(int key, int bank)
{
    float freqFactor = 7.717057388f;
    return freqFactor * powf(powf(2.0f, 1.0f / 12.0f), ((float)key + 1.0f) + 120.0f * (g_banks[bank].tuning * 6.0f / 10.0f));
}

float filter_key_to_frequency(int key, int bank)
{
    float freqFactor = 7.717057388f;
    return freqFactor * powf(powf(2.0f, 1.0f / 12.0f), ((float)key + 1.0f) + 120.0f * (g_banks[bank].filterTuning * 6.0f / 10.0f));
}

EMSCRIPTEN_KEEPALIVE
void initProcessor(int numBanks, int oscsPerBank, int waveTableSize, float startFx, float sampleRate)
{
    g_numberOfBanks = numBanks;
    g_oscillatorsPerBank = oscsPerBank;
    g_waveTableSize = waveTableSize;
    g_startFx = startFx;
    g_sampleRate = sampleRate;
    g_roundRobinIndex = 0;

    g_banks = (BankData *)malloc(sizeof(BankData) * numBanks);
    g_oscData = (OscillatorData **)malloc(sizeof(OscillatorData *) * numBanks);

    g_fmAccumulators = (float *)calloc(numBanks * oscsPerBank, sizeof(float));
    g_amAccumulators = (float *)calloc(numBanks * oscsPerBank, sizeof(float));
    g_modMatrix = (ModSettings *)calloc(numBanks * numBanks, sizeof(ModSettings));

    for (int b = 0; b < numBanks; b++)
    {
        bank_data_init(&g_banks[b], waveTableSize);
        envelope_data_init(&g_banks[b].envelopeData);
        pitch_envelope_data_init(&g_banks[b].pitchEnvelopeData);
        pitch_envelope_data_init(&g_banks[b].filterPitchEnvelopeData);
        lfo_init(&g_banks[b].lfoData);
        lfo_init(&g_banks[b].filterLfoData);
        g_oscData[b] = (OscillatorData *)malloc(sizeof(OscillatorData) * oscsPerBank);
        for (int o = 0; o < oscsPerBank; o++)
        {
            oscillator_data_init(&g_oscData[b][o]);
            envelope_init(&g_oscData[b][o].env, &g_banks[b].envelopeData);
            pitch_envelope_init(&g_oscData[b][o].pitchEnv, &g_banks[b].pitchEnvelopeData);
            pitch_envelope_init(&g_oscData[b][o].filterPitchEnv, &g_banks[b].filterPitchEnvelopeData);
            butterworth_calculate_coefficients(&g_oscData[b][o].butterworthFilter, 1000.0f, sampleRate);
            svf_init(&g_oscData[b][o].svf, sampleRate);
        }
    }
}
EMSCRIPTEN_KEEPALIVE
void setMatrixGain(int modBank, int carrierBank, int type, float level)
{
    int idx = modBank * g_numberOfBanks + carrierBank;
    g_modMatrix[idx].carrierIdx = carrierBank;
    g_modMatrix[idx].modType = (oscModType)type;
    g_modMatrix[idx].level = level * 7.0f;
}

EMSCRIPTEN_KEEPALIVE
void setModType(int modBank, int carrierBank, int type)
{
    int idx = modBank * g_numberOfBanks + carrierBank;
    g_modMatrix[idx].carrierIdx = carrierBank;
    g_modMatrix[idx].modType = (oscModType)type;
}

EMSCRIPTEN_KEEPALIVE
void setModLevel(int modBank, int carrierBank, float level)
{
    int idx = modBank * g_numberOfBanks + carrierBank;
    g_modMatrix[idx].carrierIdx = carrierBank;
    g_modMatrix[idx].level = level * 7.0f;
}

EMSCRIPTEN_KEEPALIVE
void setModOutput(int modBank, oscModOutput modOutput)
{
    g_banks[modBank].modOutput = modOutput;
}

EMSCRIPTEN_KEEPALIVE
void setBankEnvelopeParams(int bank, int phase, float value)
{
    EnvelopeData *env = &g_banks[bank].envelopeData;
    switch (phase)
    {
    case 1:
        env->attack = value;
        break;
    case 2:
        env->decay = value;
        break;
    case 3:
        env->sustainLevel = value;
        break;
    case 4:
        env->release = value;
        break;
    case 6:
        env->legato = (value > 0.0f);
        break;
    }
}

EMSCRIPTEN_KEEPALIVE
void setBankPitchEnvelopeParams(int bank, int phase, float value)
{
    PitchEnvelopeData *env = &g_banks[bank].pitchEnvelopeData;
    switch (phase)
    {
    case 1:
        env->attack = value;
        break;
    case 2:
        env->attackLevel = value;
        break;
    case 3:
        env->decay = value;
        break;
    case 4:
        env->sustainLevel = value;
        break;
    case 5:
        env->release = value;
        break;
    case 6:
        env->releaseLevel = value;
        break;
    }
}

EMSCRIPTEN_KEEPALIVE
void setBankFilterPitchEnvelopeParams(int bank, int phase, float value)
{
    PitchEnvelopeData *env = &g_banks[bank].filterPitchEnvelopeData;
    switch (phase)
    {
    case 1:
        env->attack = value;
        break;
    case 2:
        env->attackLevel = value;
        break;
    case 3:
        env->decay = value;
        break;
    case 4:
        env->sustainLevel = value;
        break;
    case 5:
        env->release = value;
        break;
    case 6:
        env->releaseLevel = value;
        break;
    }
}

EMSCRIPTEN_KEEPALIVE
void usePitchEnvelope(int bank, bool enabled)
{
    g_banks[bank].usePitchEnvelope = enabled;
}

EMSCRIPTEN_KEEPALIVE
void useFilterPitchEnvelope(int bank, bool enabled)
{
    g_banks[bank].useFilterPitchEnvelope = enabled;
}

EMSCRIPTEN_KEEPALIVE
void useFilter(int bank, bool useFilter)
{
    g_banks[bank].useFilter = useFilter;
}

EMSCRIPTEN_KEEPALIVE
void outputToFilter(int bank, bool outputToFilter)
{
    g_banks[bank].outputToFilter = outputToFilter;
    useFilter(bank, outputToFilter);
}

EMSCRIPTEN_KEEPALIVE
void triggerNoteOn(int key, int velocity)
{
    int foundIdx = -1;

    // STEP 1: Strict Global Co-indexing Lookup. Is this key already active?
    for (int o = 0; o < g_oscillatorsPerBank; o++)
    {
        for (int b = 0; b < g_numberOfBanks; b++)
        {
            if (g_oscData[b][o].env.inUse && g_oscData[b][o].key == key)
            {
                foundIdx = o;
                break;
            }
        }
        if (foundIdx != -1) break;
    }

    // STEP 2: If it's a completely fresh note, assign next global slot
    bool isRetrigger = (foundIdx != -1);
    if (!isRetrigger)
    {
        foundIdx = g_roundRobinIndex++;
        if (g_roundRobinIndex >= g_oscillatorsPerBank)
            g_roundRobinIndex = 0;
    }

    // STEP 3: Map parameters identically across all multi-bank nodes
    for (int b = 0; b < g_numberOfBanks; b++)
    {
        OscillatorData *od = &g_oscData[b][foundIdx];

        // If an allocation collision happens with an existing active different note,
        // force clear it to prevent old dead note values from lingering.
        if (!isRetrigger && od->env.inUse)
        {
            od->env.inUse = false;
            od->env.phase = ENV_INACTIVE;
        }

        od->frequency = key_to_frequency(key, b);
        od->filterFrequency = filter_key_to_frequency(key, b);
        od->key = key;

        od->env.keyDown = true;
        od->env.inUse = true;
        od->env.t = 0.0f; // Clear layout ramp clock timers
        od->env.envelopeData->velocity = velocity;

        od->pitchEnv.t = 0.0f;
        od->filterPitchEnv.t = 0.0f;

        if (isRetrigger)
        {
            od->env.phase = ENV_RETRIGGER;
        }
        else
        {
            // FIX: Set to ENV_INACTIVE so envelope_advance_to_sustain()
            // triggers cleanly on the first block iteration cycle.
            od->env.phase = ENV_INACTIVE;
            od->phase = 0.0f; // Clear standard oscillator cycle phase accumulator
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void triggerNoteOff(int key)
{
    for (int b = 0; b < g_numberOfBanks; b++)
    {
        for (int o = 0; o < g_oscillatorsPerBank; o++)
        {
            if (g_oscData[b][o].env.inUse && g_oscData[b][o].key == key)
            {
                OscillatorData *od = &g_oscData[b][o];
                od->env.keyDown = false;

                // If the voice was caught mid-retrigger or processing anomaly,
                // forcefully push its envelope execution profile straight to Release
                if (od->env.phase != ENV_RELEASE && od->env.phase != ENV_INACTIVE)
                {
                    od->env.phase = ENV_RELEASE;
                    envelope_set_timing(&od->env, od->env.lowestLevel, od->env.envelopeData->release);
                }
            }
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void setBankTuning(int bank, float tuning)
{
    g_banks[bank].tuning = tuning;
    for (int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData *od = &g_oscData[bank][o];
        if(!od->env.inUse)
            continue;
        od->frequency = key_to_frequency(od->key, bank);
    }
}

EMSCRIPTEN_KEEPALIVE
void setFilterTuning(int bank, float tuning)
{
    g_banks[bank].filterTuning = tuning;
    for (int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData *od = &g_oscData[bank][o];
        if(!od->env.inUse)
            continue;
        od->filterFrequency = filter_key_to_frequency(od->key, bank);
    }
}

EMSCRIPTEN_KEEPALIVE
void setBankDetune(int bank, float detune)
{
    g_banks[bank].detuneFactor = powf(twelfthRoot2, detune / 100.0f);
}

EMSCRIPTEN_KEEPALIVE
void setFilterDetune(int bank, float detune)
{
    g_banks[bank].filterDetuneFactor = powf(twelfthRoot2, detune / 100.0f);
}

EMSCRIPTEN_KEEPALIVE
void setFilterQFactor(int bank, float qFactor)
{
    // Clamp the raw input safely between 0.0 and 1.0
    float rawQ = qFactor < 0.0f ? 0.0f : (qFactor > 1.0f ? 1.0f : qFactor);

    // Store it on your bank data if you track it there
    g_banks[bank].resonanceBankFactor = rawQ;

    for (int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData *od = &g_oscData[bank][o];
        // Pass the raw 0.0 -> 1.0 value directly down
        svf_set_params(&od->svf, od->svf.cutoffHz, rawQ);
    }
}

EMSCRIPTEN_KEEPALIVE
void setVelocitySensitive(int bank, bool isVelocitySensitive)
{
    for (int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData *od = &g_oscData[bank][o];
        od->env.envelopeData->velocitySensitive = isVelocitySensitive;
    }
}

EMSCRIPTEN_KEEPALIVE
void setLFOModType(int bank, lfoModType modType)
{
    BankData* bd = &g_banks[bank];
    LfoData *ld = &bd->lfoData;
    ld->modType = modType;
}

EMSCRIPTEN_KEEPALIVE
void setLFOWaveform(int bank, lfoWaveform waveform)
{
    BankData* bd = &g_banks[bank];
    LfoData *ld = &bd->lfoData;
    ld->lfoWaveform = waveform;
}

EMSCRIPTEN_KEEPALIVE
void setLFOLevel(int bank, float level)
{
    BankData* bd = &g_banks[bank];
    LfoData *ld = &bd->lfoData;
    ld->level = level;
}

const float g_modFreqBase = 30.0f;
const float g_modFreqMax = 4000.0f;
const float g_modFreqMaxInput = 2.0f;
float g_modFreqFactor = -1.0f;

EMSCRIPTEN_KEEPALIVE
void setLFOFrequency(int bank, float frequency)
{
    BankData* bd = &g_banks[bank];
    if (g_modFreqFactor == -1)
        g_modFreqFactor = g_modFreqMax / (pow(g_modFreqBase, g_modFreqMaxInput) - 1);
    LfoData *ld = &bd->lfoData;
    ld->frequency = g_modFreqFactor * (powf(g_modFreqBase, frequency) - 1);
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOModType(int bank, lfoModType modType)
{
    BankData* bd = &g_banks[bank];
    LfoData *ld = &bd->filterLfoData;
    ld->modType = modType;
    emscripten_console_logf("setFilterLFOModType %d %d", bank, modType);
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOWaveform(int bank, lfoWaveform waveform)
{
    BankData* bd = &g_banks[bank];
    LfoData *ld = &bd->filterLfoData;
    ld->lfoWaveform = waveform;
    emscripten_console_logf("setFilterLFOWaveform %d %d", bank, waveform);
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOLevel(int bank, float level)
{
    BankData* bd = &g_banks[bank];
    LfoData *ld = &bd->filterLfoData;
    ld->level = level;
    emscripten_console_logf("setFilterLFOLevel %d %f", bank, level);
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOFrequency(int bank, float frequency)
{
    BankData* bd = &g_banks[bank];
    if (g_modFreqFactor == -1)
        g_modFreqFactor = g_modFreqMax / (pow(g_modFreqBase, g_modFreqMaxInput) - 1);
    LfoData *ld = &bd->filterLfoData;
    ld->frequency = g_modFreqFactor * (powf(g_modFreqBase, frequency) - 1);
    emscripten_console_logf("setFilterLFOFrequency %d %f", bank, frequency);
}

EMSCRIPTEN_KEEPALIVE
float *getBankOutputBufferPtr(int bank)
{
    return NULL;
}

EMSCRIPTEN_KEEPALIVE
void setOscillatorLevel(int bank, float level)
{
    BankData* bd = &g_banks[bank];
    bd->oscillatorLevel = level;
}

EMSCRIPTEN_KEEPALIVE
void setFilterLevel(int bank, float level)
{
    BankData* bd = &g_banks[bank];
    bd->filterLevel = level;
}

EMSCRIPTEN_KEEPALIVE
void setFilterMorphMode(int bank, float morphMode)
{
    BankData* bd = &g_banks[bank];
    OscillatorData* oscData = g_oscData[bank];
    for(int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData* od = &oscData[o];
        svf_set_morph(&od->svf, morphMode);
    }
}

EMSCRIPTEN_KEEPALIVE
void processBlock(float **outputBuffers, int numSamples)
{
    float nyquist = g_sampleRate / 2.0f;
    float root2 = 1.41421356237f;

    // 1. Instantly wipe the channel buffers to absolute zero (Vectorised via memset)
    for (int b = 0; b < g_numberOfBanks * 2; b++)
    {
        memset(outputBuffers[b], 0, sizeof(float) * numSamples);
    }

    // 2. Structural Active Audio Check
    bool activeAudioEngine = false;
    for (int b = 0; b < g_numberOfBanks; b++)
    {
        for (int osc = 0; osc < g_oscillatorsPerBank; osc++)
        {
            if (g_oscData[b][osc].env.inUse)
            {
                activeAudioEngine = true;
                break;
            }
        }
        if (activeAudioEngine) break;
    }

    if (!activeAudioEngine) return;

//     // 3. CACHE ENV STATE & ADVANCE TIMERS (Hoisted Out of Sample Loop)
//     // Advance envelopes once per block instead of 128 times inside the deep loop.
//     // Note: If you require sub-sample modulation accuracy for envelopes, keep them internal.
//     // However, for typical ADSR performance, block-rate evaluation delivers immense speedups.
//     for (int b = 0; b < g_numberOfBanks; b++)
//     {
//         BankData *bd = &g_banks[b];
//         for (int osc = 0; osc < g_oscillatorsPerBank; osc++)
//         {
//             OscillatorData *od = &g_oscData[b][osc];
//             if (!od->env.inUse) continue;
//
//             // Execute envelope advances outside sample block if fine sub-sample ramp isn't strict
//             // If you choose to keep them sample-accurate, leave them inside step 4 below.
//         }
//     }

    // 4. MAIN RENDERING ENGINE (Optimized Loop Iteration Hierarchy)
    // Flatten lookups out to local stacks to assist SIMD auto-vectorization
    float invSampleRate = 1.0f / g_sampleRate;

    for (int i = 0; i < numSamples; i++)
    {
        // Update LFOs globally per sample block iteration frame
        for (int b = 0; b < g_numberOfBanks; b++)
        {
            BankData* bd = &g_banks[b];
            if(bd->lfoData.modType != LFO_OFF)
                lfo_advance(&bd->lfoData);
            if(bd->filterLfoData.modType != LFO_OFF)
                lfo_advance(&bd->filterLfoData);
        }

        for (int b = 0; b < g_numberOfBanks; b++)
        {
            float *outputChannel = outputBuffers[b];
            float *filterOutputChannel = outputBuffers[b + g_numberOfBanks];
            BankData *bd = &g_banks[b];

            // Local cache parameters for bank states
            int bd_type = bd->type;
            bool bd_useFilter = bd->useFilter;
            bool bd_outputToFilter = bd->outputToFilter;
            int bd_waveTableSize = bd->waveTableSize;
            float *bd_periodicWaveData = bd->periodicWaveData;
            int bd_modOutput = bd->modOutput;

            for (int osc = 0; osc < g_oscillatorsPerBank; osc++)
            {
                OscillatorData *od = &g_oscData[b][osc];
                Envelope *env = &od->env;
                if (!env->inUse) continue;

                // --- SAMPLE ACCURATE ENVELOPE PROCESSING (If strict sub-sample resolution needed) ---
                if (env->keyDown)
                {
                    if (bd->usePitchEnvelope) pitch_envelope_advance_to_sustain(&od->pitchEnv);
                    if (bd->useFilterPitchEnvelope) pitch_envelope_advance_to_sustain(&od->filterPitchEnv);
                    envelope_advance_to_sustain(env);
                }
                else
                {
                    if (bd->usePitchEnvelope) pitch_envelope_advance_to_release_level(&od->pitchEnv);
                    if (bd->useFilterPitchEnvelope) pitch_envelope_advance_to_release_level(&od->filterPitchEnv);
                    envelope_advance_to_zero(env);
                }

                float f = od->frequency;
                if (bd->usePitchEnvelope) f *= od->pitchEnv.level;
                f *= bd->detuneFactor;
                if (f > nyquist) f = nyquist;

                if (bd_useFilter)
                {
                    float filterFx = od->filterFrequency * bd->filterDetuneFactor;
                    if (bd->useFilterPitchEnvelope)
                        filterFx *= od->filterPitchEnv.level;
                    if(bd->filterLfoData.modType == LFO_FREQUENCY)
                        filterFx *= (1.0f +lfo_output(&bd->filterLfoData));

                    // FIX: Pass the raw 0.0 -> 1.0 factor directly down into the per-sample update
                    svf_set_params(&od->svf, filterFx, bd->resonanceBankFactor);
                }

                // Gather AM & FM accumulators
                int idx = b * g_oscillatorsPerBank + osc;
                float matrixF = g_fmAccumulators[idx];
                g_fmAccumulators[idx] = 0.0f; // Clear layout cleanly

                float matrixA = 1.0f + g_amAccumulators[idx];
                g_amAccumulators[idx] = 0.0f;

                float mod = butterworth_process(&od->butterworthFilter, matrixF);
                float inc = f * invSampleRate;

                if (bd->lfoData.modType == LFO_FREQUENCY)
                {
                    inc *= (1.0f + lfo_output(&bd->lfoData));
                }

                od->phase += inc;
                // Fast wrapping logic instead of heavy floorf calls
                if (od->phase >= 1.0f) od->phase -= (int)od->phase;

                float currentPhase = od->phase + mod;
                if (currentPhase >= 1.0f) currentPhase -= (int)currentPhase;
                if (currentPhase < 0.0f) currentPhase += 1.0f;

                const float ampEnvelope = env->level;
                float signal = 0.0f;

                if (bd_type == 0)
                {
                    // sinf implementation leveraging fast-math properties
                    signal = sinf(currentPhase * two_m_pi) * matrixA;
                }
                else if (bd_type == 1 && bd_periodicWaveData != NULL)
                {
                    int band = 0;
                    // Cache or optimize log calculations if tables remain stable
                    band = (int)(log2f(f / g_startFx) / log2f(root2));
                    if (band < 0) band = 0;
                    else if (band > bd->numBands - 1) band = bd->numBands - 1;

                    int sampleIdx = (int)(currentPhase * bd_waveTableSize);
                    if (sampleIdx >= bd_waveTableSize) sampleIdx = bd_waveTableSize - 1;

                    signal = bd_periodicWaveData[band * bd_waveTableSize + sampleIdx];
                }

                float modSignal = (bd_modOutput == 2) ? (signal * ampEnvelope) : signal;

                // Mod distribution matrix mapping
                for (int cB = 0; cB < g_numberOfBanks; cB++)
                {
                    ModSettings *ms = &g_modMatrix[b * g_numberOfBanks + cB];
                    if (ms->carrierIdx == cB)
                    {
                        int targetIdx = cB * g_oscillatorsPerBank + osc;
                        if (ms->modType == MOD_FREQUENCY)
                        {
                            g_fmAccumulators[targetIdx] += modSignal * ms->level;
                        }
                        else if (ms->modType == MOD_AMPLITUDE)
                        {
                            g_amAccumulators[targetIdx] += modSignal * ms->level;
                        }
                    }
                }

                if (bd->lfoData.modType == LFO_AMPLITUDE)
                {
                    signal *= (1.0f + lfo_output(&bd->lfoData));
                }

                float finalOutputSample = signal * bd->oscillatorLevel * ampEnvelope;
                if (bd_outputToFilter)
                {
                    filterOutputChannel[i] += svf_process_morph(&od->svf, 0.1f * finalOutputSample) * bd->filterLevel;
                    if(bd->filterLfoData.modType == LFO_AMPLITUDE)
                        filterOutputChannel[i] *= (1.0f + lfo_output(&bd->filterLfoData));
                }
                else
                {
                    outputChannel[i] += finalOutputSample;
                }
            }
        }
    }
}
