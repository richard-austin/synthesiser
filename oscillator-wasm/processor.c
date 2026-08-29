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
    float drive;
    float s1, s2, s3, s4;
    float output;
    float g;
    float resonanceGain;
    int iterations;
} LadderFilter4Pole;

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
    LadderFilter4Pole lpf;
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

void lfo_advance(BankData* bank)
{
    LfoData *ld = &bank->lfoData;
    if (ld->modType != LFO_OFF)
    {
        ld->phase += (ld->frequency / g_sampleRate);
        if(ld->phase >= 1)
            ld->phase -= 1;
    }
}

float lfo_output(BankData *bank)
{
    const LfoData *ld = &bank->lfoData;
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

void ladder_update_coefficient(LadderFilter4Pole *f)
{
    f->g = tanf(m_pi * f->cutoffHz / f->sampleRate);
}

void ladder_set_cutoff(LadderFilter4Pole *f, float cutoffHz)
{
    float maxF = f->sampleRate * 0.45f;
    f->cutoffHz = cutoffHz < 5.0f ? 5.0f : (cutoffHz > maxF ? maxF : cutoffHz);
    ladder_update_coefficient(f);
}

void ladder_set_resonance(LadderFilter4Pole *f, float resonance)
{
    f->resonance = resonance < 0.0f ? 0.0f : (resonance > 1.0f ? 1.0f : resonance);
    float r = f->resonance;
    f->resonanceGain = 4.0f * r * (0.85f + 0.15f * r);
}

void ladder_set_drive(LadderFilter4Pole *f, float drive)
{
    f->drive = drive < 0.1f ? 0.1f : drive;
}

void ladder_init(LadderFilter4Pole *f, float sampleRate)
{
    f->sampleRate = sampleRate;
    f->iterations = 3;
    f->s1 = f->s2 = f->s3 = f->s4 = 0.0f;
    f->output = 0.0f;
    ladder_set_cutoff(f, 1000.0f);
    ladder_set_resonance(f, 3.0f);
    ladder_set_drive(f, 1.0f);
}

float ladder_tpt(LadderFilter4Pole *f, float input, float state)
{
    return (f->g * input + state) / (1.0f + f->g);
}

float ladder_process(LadderFilter4Pole *f, float input)
{
    float x = tanhf(input * f->drive);
    float y4 = f->s4, y1 = f->s1, y2 = f->s2, y3 = f->s3;
    for (int i = 0; i < f->iterations; i++)
    {
        float feedback = f->resonanceGain * tanhf(y4);
        float u = x - feedback;
        y1 = ladder_tpt(f, u, f->s1);
        y2 = ladder_tpt(f, y1, f->s2); // Fixed missing 'f' parameter context
        y3 = ladder_tpt(f, y2, f->s3); // Fixed missing 'f' parameter context
        y4 = ladder_tpt(f, y3, f->s4); // Fixed missing 'f' parameter context
    }
    f->s1 = 2.0f * y1 - f->s1;
    f->s2 = 2.0f * y2 - f->s2;
    f->s3 = 2.0f * y3 - f->s3;
    f->s4 = 2.0f * y4 - f->s4;
    f->output = tanhf(y4);
    return f->output;
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
        g_oscData[b] = (OscillatorData *)malloc(sizeof(OscillatorData) * oscsPerBank);
        for (int o = 0; o < oscsPerBank; o++)
        {
            oscillator_data_init(&g_oscData[b][o]);
            envelope_init(&g_oscData[b][o].env, &g_banks[b].envelopeData);
            pitch_envelope_init(&g_oscData[b][o].pitchEnv, &g_banks[b].pitchEnvelopeData);
            pitch_envelope_init(&g_oscData[b][o].filterPitchEnv, &g_banks[b].filterPitchEnvelopeData);
            butterworth_calculate_coefficients(&g_oscData[b][o].butterworthFilter, 1000.0f, sampleRate);
            ladder_init(&g_oscData[b][o].lpf, sampleRate);
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
    for (int b = 0; b < g_numberOfBanks; b++)
    {
        for (int o = 0; o < g_oscillatorsPerBank; o++)
        {
            if (g_oscData[b][o].env.inUse && g_oscData[b][o].key == key)
            {
                foundIdx = o;
                break;
            }
        }
        if (foundIdx != -1)
            break;
    }
    if (foundIdx != -1)
    {
        for (int b = 0; b < g_numberOfBanks; b++)
        {
            g_oscData[b][foundIdx].env.phase = ENV_RETRIGGER;
        }
    }
    else
    {
        foundIdx = g_roundRobinIndex++;
        if (g_roundRobinIndex >= g_oscillatorsPerBank)
            g_roundRobinIndex = 0;
    }
    for (int b = 0; b < g_numberOfBanks; b++)
    {
        OscillatorData *od = &g_oscData[b][foundIdx];
        od->frequency = key_to_frequency(key, b);
        od->filterFrequency = filter_key_to_frequency(key, b);
        od->key = key;
        od->env.keyDown = true;
        od->env.inUse = true;
        od->env.envelopeData->velocity = velocity;
        if (od->env.phase != ENV_RETRIGGER)
            od->phase = 0.0f;
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
                g_oscData[b][o].env.keyDown = false;
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
    for(int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData *od = &g_oscData[bank][o];
        ladder_set_resonance(&od->lpf, qFactor);
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
float *getBankOutputBufferPtr(int bank)
{
    return NULL;
}
EMSCRIPTEN_KEEPALIVE
void processBlock(float **outputBuffers, int numSamples)
{
    float nyquist = g_sampleRate / 2.0f;
    float root2 = 1.41421356237f;
    // 1. Instantly wipe the channel buffers to absolute zero
    for (int b = 0; b < g_numberOfBanks*2; b++)
    {
        memset(outputBuffers[b], 0, sizeof(float) * numSamples);
    }

    // 2. Check if ANY envelope is currently active
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
        if (activeAudioEngine)
            break;
    }

    // FIX: Early exit! If no notes are playing or decaying, do zero math.
    // This stops powf() denormal generation completely.
    if (!activeAudioEngine)
    {
        return;
    }

    for (int i = 0; i < numSamples; i++)
    {
        for (int b = 0; b < g_numberOfBanks; b++)
        {
            float *outputChannel = outputBuffers[b];
            float *filterOutputChannel = outputBuffers[b+g_numberOfBanks];
            BankData *bd = &g_banks[b];
            lfo_advance(bd);
            for (int osc = 0; osc < g_oscillatorsPerBank; osc++)
            {
                OscillatorData *od = &g_oscData[b][osc];
                Envelope *env = &od->env;
                float f = od->frequency;
                if (f > nyquist)
                    f = nyquist;
                int band = 0;
                if (bd->type == 1 && bd->periodicWaveData != NULL)
                {
                    band = (int)floorf(log2f(f / g_startFx) / log2f(root2));
                    if (band < 0)
                        band = 0;
                    else if (band > bd->numBands - 1)
                        band = bd->numBands - 1;
                }
                if (env->keyDown)
                {
                    if(bd->usePitchEnvelope)
                    {
                        PitchEnvelope* pitchEnv = &od->pitchEnv;
                        pitch_envelope_advance_to_sustain(pitchEnv);
                    }
                    if(bd->useFilterPitchEnvelope)
                    {
                        PitchEnvelope* filterPitchEnvelope = &od->filterPitchEnv;
                        pitch_envelope_advance_to_sustain(filterPitchEnvelope);
                    }
                    envelope_advance_to_sustain(env);
                }
                else
                {
                    if(bd->usePitchEnvelope)
                    {
                        PitchEnvelope *pitchEnv = &od->pitchEnv;
                        pitch_envelope_advance_to_release_level(pitchEnv);
                    }
                    if(bd->useFilterPitchEnvelope)
                    {
                        PitchEnvelope* filterPitchEnv = &od->filterPitchEnv;
                        pitch_envelope_advance_to_release_level(filterPitchEnv);
                    }
                    envelope_advance_to_zero(env);
                }


                if(bd->usePitchEnvelope)
                {
                    f *= od->pitchEnv.level;
                }
                f *= bd->detuneFactor;

                if (env->inUse && bd->useFilter)
                {
                    float filterFx = od->filterFrequency;
                    filterFx *= bd->filterDetuneFactor;
                    if(bd->useFilterPitchEnvelope)
                        filterFx *= od->filterPitchEnv.level;

                    ladder_set_cutoff(&od->lpf, filterFx);
                }

                // AM and FM Mod output from accumulators
                int idx = b * g_oscillatorsPerBank + osc;
                const float matrixF = g_fmAccumulators[idx];
                g_fmAccumulators[idx] = 0.0f;
                const float matrixA = 1.0f + g_amAccumulators[idx];
                g_amAccumulators[idx] = 0.0f;

                float mod = butterworth_process(&od->butterworthFilter, matrixF);
                float inc = f / g_sampleRate;
                if(bd->lfoData.modType == LFO_FREQUENCY)
                {
                    inc *= (1+lfo_output(bd));
                }
                od->phase += inc;
                float currentPhase = od->phase + mod;
                currentPhase = currentPhase - floorf(currentPhase);
                od->phase = od->phase - floorf(od->phase);
                const float ampEnvelope = env->level;
                float signal = 0.0f;
                if (bd->type == 0)
                {
                    signal = sinf(currentPhase * two_m_pi) * matrixA;
                }
                else if (bd->type == 1 && bd->periodicWaveData != NULL)
                {
                    int sampleIdx = (int)floorf(currentPhase * bd->waveTableSize);
                    signal = bd->periodicWaveData[band * bd->waveTableSize + sampleIdx];
                }
                float modSignal = signal;
                if (bd->modOutput == 2)
                {
                    modSignal *= ampEnvelope;
                }
                // Mod input to accumulators
                for (int cB = 0; cB < g_numberOfBanks; cB++)
                {
                    ModSettings *ms = &g_modMatrix[b * g_numberOfBanks + cB];
                    if (ms->modType == MOD_FREQUENCY && ms->carrierIdx == cB)
                    {
                        g_fmAccumulators[cB * g_oscillatorsPerBank + osc] += modSignal * ms->level;
                    }
                    else if (ms->modType == MOD_AMPLITUDE && ms->carrierIdx == cB)
                    {
                        g_amAccumulators[cB * g_oscillatorsPerBank + osc] += modSignal * ms->level;
                    }
                }
                if(bd->lfoData.modType == LFO_AMPLITUDE)
                {
                    signal *= (1+lfo_output(bd));
                }

                if (env->inUse)
                {
                    if(bd->outputToFilter)
                        filterOutputChannel[i] += ladder_process(&od->lpf, signal * ampEnvelope);
                    else
                       outputChannel[i] += signal * ampEnvelope;
                }
            }
        }
    }
}
