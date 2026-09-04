#include <emscripten/console.h>
#include <emscripten.h>
#include <math.h>
#include <stdlib.h>
#include "globals.h"

#include "filter.h"
#include "key_to_frequency.h"

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

