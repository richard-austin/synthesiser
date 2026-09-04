#include <emscripten/console.h>
#include <emscripten.h>
#include <math.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#include "globals.h"
#include "portamento.h"
#include "envelope.h"
#include "pitch_envelope.h"
#include "lfo.h"
#include "filter.h"
#include "butterworth_filter.h"

void bank_data_init(BankData *bd, int waveTableSize, int numBands)
{
    bd->detuneFactor = 1.0f;
    bd->tuning = 0.0f;
    bd->filterDetuneFactor = 1.0f;
    bd->filterTuning = 0.0f;
    bd->periodicWaveData = NULL;
    bd->numBands = numBands;
    bd->waveTableSize = waveTableSize;
    bd->modOutput = 0;
    bd->usePitchEnvelope = false;
    bd->useFilterPitchEnvelope = false;
    bd->useFilter = false;
    bd->outputToFilter = false;
    bd->oscillatorLevel = 0.0f;
    bd->filterLevel = 0.0f;
    // Dead center values for constant-power curve: cos(pi/4) and sin(pi/4)
    bd->panLeft = bd->panRight = 0.70710678f;
    initPortamentoData(&bd->portamentoData);
}

void oscillator_data_init(OscillatorData *od)
{
    od->key = -1;
    od->frequency = 1.0f;
    od->phase = 0.0f;
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
void initProcessor(int numBanks, int oscsPerBank, int waveTableSize, int numBands, float startFx, float sampleRate)
{
    log2Root2 = log2f(root2);
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
        bank_data_init(&g_banks[b], waveTableSize, numBands);
        envelope_data_init(&g_banks[b].envelopeData);
        pitch_envelope_data_init(&g_banks[b].pitchEnvelopeData);
        pitch_envelope_data_init(&g_banks[b].filterPitchEnvelopeData);
        lfo_init(&g_banks[b].lfoData, waveTableSize);
        lfo_init(&g_banks[b].filterLfoData, waveTableSize);
        g_oscData[b] = (OscillatorData *)malloc(sizeof(OscillatorData) * oscsPerBank);
        for (int o = 0; o < oscsPerBank; o++)
        {
            oscillator_data_init(&g_oscData[b][o]);
            envelope_init(&g_oscData[b][o].env, &g_banks[b].envelopeData);
            portamento_init(&g_oscData[b][o].portamento);
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
        OscillatorData *od = g_oscData[bank];
        for (int o = 0; o < g_oscillatorsPerBank; ++o)
            od[o].pitchEnv.level = value;
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
        OscillatorData *od = g_oscData[bank];
        for (int o = 0; o < g_oscillatorsPerBank; ++o)
            od[o].filterPitchEnv.level = value;
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
        if (foundIdx != -1)
            break;
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

        // Set oscillator and filter pitch envelope times to 0
        od->pitchEnv.t = 0.0f;
        od->filterPitchEnv.t = 0.0f;

        if (isRetrigger)
            od->env.phase = ENV_RETRIGGER;
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
        if (!od->env.inUse)
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
        if (!od->env.inUse)
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
void setPortamentoTime(int bank, float time)
{
    BankData *bd = &g_banks[bank];
    bd->portamentoData.time = time;
}

EMSCRIPTEN_KEEPALIVE
void setLFOModType(int bank, lfoModType modType)
{
    BankData *bd = &g_banks[bank];
    LfoData *ld = &bd->lfoData;
    ld->modType = modType;
}

EMSCRIPTEN_KEEPALIVE
void setLFOLevel(int bank, float level)
{
    BankData *bd = &g_banks[bank];
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
    BankData *bd = &g_banks[bank];
    if (g_modFreqFactor == -1)
        g_modFreqFactor = g_modFreqMax / (pow(g_modFreqBase, g_modFreqMaxInput) - 1);
    LfoData *ld = &bd->lfoData;
    ld->frequency = g_modFreqFactor * (powf(g_modFreqBase, frequency) - 1);
    int band;
    band = (int)(log2f(frequency / g_startFx) / log2Root2);
    if (band < 0)
        band = 0;
    else if (band > bd->numBands - 1)
        band = bd->numBands - 1;

    ld->band = band;
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOModType(int bank, lfoModType modType)
{
    BankData *bd = &g_banks[bank];
    LfoData *ld = &bd->filterLfoData;
    ld->modType = modType;
    emscripten_console_logf("setFilterLFOModType %d %d", bank, modType);
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOLevel(int bank, float level)
{
    BankData *bd = &g_banks[bank];
    LfoData *ld = &bd->filterLfoData;
    ld->level = level;
    emscripten_console_logf("setFilterLFOLevel %d %f", bank, level);
}

EMSCRIPTEN_KEEPALIVE
void setFilterLFOFrequency(int bank, float frequency)
{
    BankData *bd = &g_banks[bank];
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
    BankData *bd = &g_banks[bank];
    bd->oscillatorLevel = level;
}

EMSCRIPTEN_KEEPALIVE
void setBankPan(int bank, float pan)
{
    // Clamp incoming values cleanly between -1.0f and 1.0f
    if (pan < -1.0f)
        pan = -1.0f;
    if (pan > 1.0f)
        pan = 1.0f;

    // Transform incoming workspace scale from [-1.0, 1.0] to [0.0, 1.0]
    float normalizedPan = (pan + 1.0f) * 0.5f;

    // Compute coefficients ONCE on user interface adjustment event
    g_banks[bank].panLeft = cosf(normalizedPan * (float)M_PI * 0.5f);
    g_banks[bank].panRight = sinf(normalizedPan * (float)M_PI * 0.5f);
}
EMSCRIPTEN_KEEPALIVE
void setFilterLevel(int bank, float level)
{
    BankData *bd = &g_banks[bank];
    bd->filterLevel = level;
}

EMSCRIPTEN_KEEPALIVE
void setFilterMorphMode(int bank, float morphMode)
{
    BankData *bd = &g_banks[bank];
    OscillatorData *oscData = g_oscData[bank];
    for (int o = 0; o < g_oscillatorsPerBank; ++o)
    {
        OscillatorData *od = &oscData[o];
        svf_set_morph(&od->svf, morphMode);
    }
}

EMSCRIPTEN_KEEPALIVE
float *allocateWaveTableMemory(int bank)
{
    BankData *bd = &g_banks[bank];
    if (bd->periodicWaveData == NULL)
        bd->periodicWaveData = calloc(bd->waveTableSize * 21, sizeof(float));

    return bd->periodicWaveData;
}

EMSCRIPTEN_KEEPALIVE
float *allocateLFOWaveTableMemory(int bank)
{
    LfoData *ld = &g_banks[bank].lfoData;
    if (ld->periodicWaveData == NULL)
        ld->periodicWaveData = calloc(ld->waveTableSize * 21, sizeof(float));

    return ld->periodicWaveData;
}

EMSCRIPTEN_KEEPALIVE
float *allocateFilterLFOWaveTableMemory(int bank)
{
    LfoData *ld = &g_banks[bank].filterLfoData;
    if (ld->periodicWaveData == NULL)
        ld->periodicWaveData = calloc(ld->waveTableSize * 21, sizeof(float));

    return ld->periodicWaveData;
}

EMSCRIPTEN_KEEPALIVE
bool waveTableMemoryAllocated(int bank)
{
    return g_banks[bank].periodicWaveData != NULL;
}

EMSCRIPTEN_KEEPALIVE
void setNumberOfBands(int numberOfBands)
{
    for (int b = 0; b < g_numberOfBanks; ++b)
        g_banks[b].numBands = numberOfBands;
}

EMSCRIPTEN_KEEPALIVE
float render_sample_from_phase(int bank, int table_index, float phase)
{
    BankData *bd = &g_banks[bank];
    if (bd->periodicWaveData == NULL)
        return 0.0f;

    // 1. Point to the specific wavetable inside the continuous memory block
    // (Assuming 21 tables per bank as per your calloc setup)
    float *current_table = bd->periodicWaveData + (table_index * bd->waveTableSize);

    // 2. Scale phase (0.0 to 1.0) to the wavetable size index space
    float exact_index = phase * (float)bd->waveTableSize;

    // 3. Get the floor integer index and the fractional remainder
    int index_a = (int)exact_index;
    float fraction = exact_index - (float)index_a;

    // 4. Determine the next sample index (with wrap-around handling)
    int index_b = index_a + 1;
    if (index_b >= bd->waveTableSize)
    {
        index_b = 0;
    }

    // Safety guard for boundaries
    if (index_a >= bd->waveTableSize)
    {
        index_a = bd->waveTableSize - 1;
    }

    // 5. Fetch the two samples
    float sample_a = current_table[index_a];
    float sample_b = current_table[index_b];

    // 6. Linearly interpolate between them
    // formula: a + fraction * (b - a)
    return sample_a + fraction * (sample_b - sample_a);
}

EMSCRIPTEN_KEEPALIVE
void processBlock(float **outputBuffers, int numSamples)
{
    const float nyquist = g_sampleRate / 2.0f;

    // 1. Wipe all 16 channel buffers (8 banks * 2 channels) to zero cleanly
    for (int b = 0; b < g_numberOfBanks * 2 * 2; b++)
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
    }
    if (!activeAudioEngine)
        return;

    // 4. MAIN RENDERING ENGINE
    float invSampleRate = 1.0f / g_sampleRate;
    for (int i = 0; i < numSamples; i++)
    {
        // Update LFOs globally per sample block iteration frame
        for (int b = 0; b < g_numberOfBanks; b++)
        {
            BankData *bd = &g_banks[b];
            if (bd->lfoData.modType != LFO_OFF)
                lfo_advance(&bd->lfoData);
            if (bd->filterLfoData.modType != LFO_OFF)
                lfo_advance(&bd->filterLfoData);
        }

        for (int b = 0; b < g_numberOfBanks; b++)
        {
            // Resolve base offsets for stereo pairs
            // Oscillator Bank outputs are pairs at: 0/1, 2/3, 4/5, 6/7
            float *outLeft = outputBuffers[b * 2];
            float *outRight = outputBuffers[(b * 2) + 1];

            // Filter banks begin precisely after all oscillator channel pointers have finished
            // (4 banks * 2 channels = offset index 8)
            float *filterOutLeft = outputBuffers[(g_numberOfBanks * 2) + (b * 2)];
            float *filterOutRight = outputBuffers[(g_numberOfBanks * 2) + (b * 2) + 1];

            // Filter outputs map to pairs at: 8/9, 10/11, 12/13, 14/15

            BankData *bd = &g_banks[b];

            // NO TRANSCENDENTAL MATH HERE: Pure lightning fast cache reads!
            float panLeft = bd->panLeft;
            float panRight = bd->panRight;

            bool bd_useFilter = bd->useFilter;
            const bool bd_usePitchEnvelope = bd->usePitchEnvelope;
            const bool bd_useFilterPitchEnvelope = bd->useFilterPitchEnvelope;
            bool bd_outputToFilter = bd->outputToFilter;
            int bd_waveTableSize = bd->waveTableSize;
            float *bd_periodicWaveData = bd->periodicWaveData;
            int bd_modOutput = bd->modOutput;

            for (int osc = 0; osc < g_oscillatorsPerBank; osc++)
            {
                OscillatorData *od = &g_oscData[b][osc];
                Envelope *env = &od->env;
                if (!env->inUse)
                    continue;

                if (env->keyDown)
                {
                    if (bd_usePitchEnvelope)
                        pitch_envelope_advance_to_sustain(&od->pitchEnv);
                    if (bd_useFilterPitchEnvelope)
                        pitch_envelope_advance_to_sustain(&od->filterPitchEnv);
                    envelope_advance_to_sustain(env);
                }
                else
                {
                    if (bd_usePitchEnvelope)
                        pitch_envelope_advance_to_release_level(&od->pitchEnv);
                    if (bd_useFilterPitchEnvelope)
                        pitch_envelope_advance_to_release_level(&od->filterPitchEnv);
                    envelope_advance_to_zero(env);
                }

                float f = od->frequency;
                if (bd_usePitchEnvelope)
                    f *= od->pitchEnv.level;
                f *= bd->detuneFactor;
                if (f > nyquist)
                    f = nyquist;

                if (bd_useFilter)
                {
                    float filterFx = od->filterFrequency * bd->filterDetuneFactor;
                    if (bd_useFilterPitchEnvelope)
                        filterFx *= od->filterPitchEnv.level;
                    if (bd->filterLfoData.modType == LFO_FREQUENCY)
                        filterFx *= (1.0f + render_lfo_sample(&bd->filterLfoData));

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
                    inc *= (1.0f + render_lfo_sample(&bd->lfoData));
                }
                od->phase += inc;

                if (od->phase >= 1.0f)
                    od->phase -= (int)od->phase;
                float currentPhase = od->phase + mod;
                if (currentPhase >= 1.0f)
                    currentPhase -= (int)currentPhase;
                if (currentPhase < 0.0f)
                    currentPhase += 1.0f;

                const float ampEnvelope = env->level;
                float signal = 0.0f;

                if (bd_periodicWaveData != NULL)
                {
                    int band;
                    band = (int)(log2f(f / g_startFx) / log2Root2);
                    if (band < 0)
                        band = 0;
                    else if (band > bd->numBands - 1)
                        band = bd->numBands - 1;

                    signal = render_sample_from_phase(b, band, currentPhase) * matrixA;
                }

                float modSignal = (bd_modOutput == 2) ? (signal * ampEnvelope) : signal;

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
                    signal *= (1.0f + render_lfo_sample(&bd->lfoData));
                }

                float finalOutputSample = signal * bd->oscillatorLevel * ampEnvelope;

                if (bd_outputToFilter)
                {
                    float filteredSample = svf_process_morph(&od->svf, 0.1f * finalOutputSample) * bd->filterLevel;
                    if (bd->filterLfoData.modType == LFO_AMPLITUDE)
                    {
                        filteredSample *= (1.0f + render_lfo_sample(&bd->filterLfoData));
                    }
                    // Mirroring the exact same source to Left and Right channel blocks
                    filterOutLeft[i] += filteredSample * panLeft;
                    filterOutRight[i] += filteredSample * panRight;
                }
                else
                {
                    // Mirroring the exact same source to Left and Right channel blocks
                    outLeft[i] += finalOutputSample * panLeft;
                    outRight[i] += finalOutputSample * panRight;
                }
            }
        }
    }
}
