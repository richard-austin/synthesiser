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
#include "key_to_frequency.h"
#include "noise.h"
#include "phaser.h"

void bank_data_init(BankData *bd, int waveTableSize, int numBands) {
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
    bd->filterConnectToPhaser = false;
    bd->outputToFilter = false;
    bd->phaserInputs = 0.0f;
    bd->outputToPhaser = false;
    bd->oscillatorLevel = 0.0f;
    bd->filterLevel = 0.0f;
    // Dead center values for constant-power curve: cos(pi/4) and sin(pi/4)
    bd->panLeft = bd->panRight = 0.70710678f;
    initPortamentoData(&bd->portamentoData);
    initPortamentoData(&bd->filterPortamentoData);
    emscripten_console_logf("Initialising mod settings, numberOfBanks %d", g_numberOfBanks);
    bd->modMatrix = calloc(g_numberOfBanks, sizeof(ModSettings *));
    for (int b = 0; b < g_numberOfBanks; b++) {
        bd->modMatrix[b] = malloc(sizeof(ModSettings));
        ModSettings *modSettings = bd->modMatrix[b];
        modSettings->level = 0.0f;
        modSettings->modType = MOD_OFF;
    }
}

void oscillator_data_init(OscillatorData *od) {
    od->key = -1;
    od->frequency = 1.0f;
    od->phase = 0.0f;
}

EMSCRIPTEN_KEEPALIVE

void initProcessor(int numBanks, int oscsPerBank, int waveTableSize, int numBands, float startFx, float sampleRate) {
    log2Root2 = log2f(root2);
    g_numberOfBanks = numBanks;
    g_oscillatorsPerBank = oscsPerBank;
    g_waveTableSize = waveTableSize;
    g_startFx = startFx;
    g_sampleRate = sampleRate;
    g_roundRobinIndex = 0;

    g_banks = (BankData *) malloc(sizeof(BankData) * numBanks);
    g_oscData = (OscillatorData **) malloc(sizeof(OscillatorData *) * numBanks);
    g_noise = (Noise *) malloc(sizeof(Noise));
    noise_init(g_noise, oscsPerBank);
    g_phaser = calloc(1, sizeof(Phaser));
    phaser_init(g_phaser, sampleRate);

    g_fmAccumulators = (float *) calloc(numBanks * oscsPerBank, sizeof(float));
    g_amAccumulators = (float *) calloc(numBanks * oscsPerBank, sizeof(float));

    for (int b = 0; b < numBanks; b++) {
        BankData *bd = &g_banks[b];
        bank_data_init(bd, waveTableSize, numBands);
        envelope_data_init(&bd->envelopeData);
        pitch_envelope_data_init(&g_banks[b].pitchEnvelopeData);
        pitch_envelope_data_init(&bd->filterPitchEnvelopeData);
        lfo_init(&bd->lfoData, waveTableSize);
        lfo_init(&bd->filterLfoData, waveTableSize);
        g_oscData[b] = (OscillatorData *) malloc(sizeof(OscillatorData) * oscsPerBank);
        for (int o = 0; o < oscsPerBank; o++) {
            oscillator_data_init(&g_oscData[b][o]);
            envelope_init(&g_oscData[b][o].env, &bd->envelopeData);
            portamento_init(&g_oscData[b][o].portamento, &bd->portamentoData);
            portamento_init(&g_oscData[b][o].filterPortamento, &bd->filterPortamentoData);
            pitch_envelope_init(&g_oscData[b][o].pitchEnv, &bd->pitchEnvelopeData);
            pitch_envelope_init(&g_oscData[b][o].filterPitchEnv, &bd->filterPitchEnvelopeData);
            butterworth_calculate_coefficients(&g_oscData[b][o].butterworthFilter, 1000.0f, sampleRate);
            svf_init(&g_oscData[b][o].svf, sampleRate);
        }
    }
}

EMSCRIPTEN_KEEPALIVE

void triggerNoteOn(int key, int velocity) {
    int foundIdx = -1;

    // STEP 1: Strict Global Co-indexing Lookup. Is this key already active?
    for (int o = 0; o < g_oscillatorsPerBank; o++) {
        for (int b = 0; b < g_numberOfBanks; b++) {
            BankData *bd = &g_banks[b];

            if (g_oscData[b][o].env.inUse && g_oscData[b][o].key == key) {
                foundIdx = o;
                break;
            }
        }
        if (foundIdx != -1)
            break;
    }

    // STEP 2: If it's a completely fresh note, assign next global slot
    bool isRetrigger = (foundIdx != -1);
    if (!isRetrigger) {
        foundIdx = g_roundRobinIndex++;
        if (g_roundRobinIndex >= g_oscillatorsPerBank)
            g_roundRobinIndex = 0;
    }

    // STEP 3: Map parameters identically across all multi-bank nodes
    for (int b = 0; b < g_numberOfBanks; b++) {
        OscillatorData *od = &g_oscData[b][foundIdx];
        const BankData *bd = &g_banks[b];

        // If an allocation collision happens with an existing active different note,
        // force clear it to prevent old dead note values from lingering.
        if (!isRetrigger && od->env.inUse) {
            od->env.inUse = false;
            od->env.phase = ENV_INACTIVE;
        }

        if (bd->portamentoData.inUse) {
            const float targetFrequency = key_to_frequency(key, b);
            portamento_set_timing(&od->portamento, targetFrequency, bd->portamentoData.time);
            od->frequency = targetFrequency;
        } else
            od->frequency = key_to_frequency(key, b);

        if (bd->filterPortamentoData.inUse) {
            const float targetFrequency = filter_key_to_frequency(key, b);
            portamento_set_timing(&od->filterPortamento, targetFrequency, bd->filterPortamentoData.time);
            od->filterFrequency = targetFrequency;
        } else
            od->filterFrequency = filter_key_to_frequency(key, b);

        od->key = key;
        od->env.keyDown = true;
        od->env.inUse = true;
        od->env.t = 0.0f; // Clear layout ramp clock timers
        od->env.envelopeData->velocity = velocity;

        // Set oscillator and filter pitch envelope times to 0
        od->pitchEnv.t = 0.0f;
        od->filterPitchEnv.t = 0.0f;
        noise_init_envelope(g_noise, foundIdx, velocity);
        if (isRetrigger)
            od->env.phase = ENV_RETRIGGER;
        else {
            // FIX: Set to ENV_INACTIVE so envelope_advance_to_sustain()
            // triggers cleanly on the first block iteration cycle.
            od->env.phase = ENV_INACTIVE;
            od->phase = 0.0f; // Clear standard oscillator cycle phase accumulator
        }
    }
}

EMSCRIPTEN_KEEPALIVE

void triggerNoteOff(int key) {
    for (int b = 0; b < g_numberOfBanks; b++) {
        for (int o = 0; o < g_oscillatorsPerBank; o++) {
            if (g_oscData[b][o].env.inUse && g_oscData[b][o].key == key) {
                OscillatorData *od = &g_oscData[b][o];
                od->env.keyDown = false;
                g_noise->envelopes[o].keyDown = false;

                // if (!od->env.envelopeData->legato) {
                //     // If the voice was caught mid-retrigger or processing anomaly,
                //     // forcefully push its envelope execution profile straight to Release
                //     if (od->env.phase != ENV_RELEASE && od->env.phase != ENV_INACTIVE) {
                //         od->env.phase = ENV_RELEASE;
                //         envelope_set_timing(&od->env, od->env.lowestLevel, od->env.envelopeData->release);
                //     }
                // }
            }
        }
    }
}

bool is_modulating(BankData *bd, int osc) {
    bool retVal = false;
    for (int cB = 0; cB < g_numberOfBanks; cB++) {
        if (bd->modMatrix[cB]->modType != MOD_OFF) {
            if (g_oscData[cB][osc].env.inUse) {
                retVal = true;
                break;
            }
        }
    }
    return retVal;
}

void matrix_apply_modulation(const BankData *bd, int osc, float modSignal) {
    for (int cB = 0; cB < g_numberOfBanks; cB++) {
        ModSettings *ms = bd->modMatrix[cB];
        int targetIdx = cB * g_oscillatorsPerBank + osc;
        if (ms->modType == MOD_FREQUENCY) {
            g_fmAccumulators[targetIdx] += modSignal * ms->level;
        } else if (ms->modType == MOD_AMPLITUDE) {
            g_amAccumulators[targetIdx] += modSignal * ms->level;
        }
    }
}

float render_sample_from_phase(int bank, int table_index, float phase) {
    BankData *bd = &g_banks[bank];
    if (bd->periodicWaveData == NULL)
        return 0.0f;

    const int bd_waveTableSize = bd->waveTableSize;
    // 1. Point to the specific wavetable inside the continuous memory block
    // (Assuming 21 tables per bank as per your calloc setup)
    float *current_table = bd->periodicWaveData + (table_index * bd_waveTableSize);


    // 2. Scale phase (0.0 to 1.0) to the wavetable size index space
    float exact_index = phase * (float) bd_waveTableSize;

    // 3. Get the floor integer index and the fractional remainder
    int index_a = (int) exact_index;
    float fraction = exact_index - (float) index_a;

    // 4. Determine the next sample index (with wrap-around handling)
    int index_b = index_a + 1;
    if (index_b >= bd_waveTableSize) {
        index_b = 0;
    }

    // Safety guard for boundaries
    if (index_a >= bd_waveTableSize) {
        index_a = bd_waveTableSize - 1;
    }

    // 5. Fetch the two samples
    float sample_a = current_table[index_a];
    float sample_b = current_table[index_b];

    // 6. Linearly interpolate between them
    // formula: a + fraction * (b - a)
    return sample_a + fraction * (sample_b - sample_a);
}

long count = 0;;
EMSCRIPTEN_KEEPALIVE

void processBlock(float **outputBuffers, int numSamples) {
    const float nyquist = g_sampleRate / 2.0f;

    // 1. Wipe all 20 channel buffers ((8 banks + 1) * 2 channels) to zero cleanly
    for (int b = 0; b < (g_numberOfBanks * 2 + 1 + 1) * 2; b++) {
        memset(outputBuffers[b], 0, sizeof(float) * numSamples);
    }

    // 2. Structural Active Audio Check
    bool activeAudioEngine = false;
    for (int b = 0; b < g_numberOfBanks; b++) {
        for (int osc = 0; osc < g_oscillatorsPerBank; osc++) {
            if (g_oscData[b][osc].env.inUse || g_noise->envelopes[osc].inUse) {
                activeAudioEngine = true;
                break;
            }
        }
    }
    if (!activeAudioEngine)
        return;

    const enum noiseOutput g_noise_output = g_noise->output;

    float *noiseOutLeft = outputBuffers[g_numberOfBanks * 4];
    float *noiseOutRight = outputBuffers[g_numberOfBanks * 4 + 1];

    float *phaserOutLeft = outputBuffers[g_numberOfBanks * 4 + 2];
    float *phaserOutRight = outputBuffers[g_numberOfBanks * 4 + 2 + 1];

    // 4. MAIN RENDERING ENGINE
    float invSampleRate = 1.0f / g_sampleRate;
    for (int i = 0; i < numSamples; i++) {
        // Update LFOs globally per sample block iteration frame
        for (int b = 0; b < g_numberOfBanks; b++) {
            BankData *bd = &g_banks[b];
            if (bd->lfoData.modType != LFO_OFF)
                lfo_advance(&bd->lfoData);
            if (bd->filterLfoData.modType != LFO_OFF)
                lfo_advance(&bd->filterLfoData);
        }

        for (int b = 0; b < g_numberOfBanks; b++) {
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
            bd->phaserInputs = 0.0f;

            // NO TRANSCENDENTAL MATH HERE: Pure lightning fast cache reads!
            float panLeft = bd->panLeft;
            float panRight = bd->panRight;

            bool bd_useFilter = bd->useFilter;
            bool bd_usePhaser = bd->outputToPhaser || bd->filterConnectToPhaser;
            const bool bd_usePitchEnvelope = bd->usePitchEnvelope;
            const bool bd_useFilterPitchEnvelope = bd->useFilterPitchEnvelope;
            bool bd_outputToFilter = bd->outputToFilter;
            float *bd_periodicWaveData = bd->periodicWaveData;
            int bd_modOutput = bd->modOutput;

            for (int osc = 0; osc < g_oscillatorsPerBank; osc++) {
                OscillatorData *od = &g_oscData[b][osc];
                Envelope *env = &od->env;
                if (!env->inUse && !is_modulating(bd, osc))
                    continue;

                if (env->keyDown) {
                    if (bd_usePitchEnvelope)
                        pitch_envelope_advance_to_sustain(&od->pitchEnv);
                    if (bd_useFilterPitchEnvelope)
                        pitch_envelope_advance_to_sustain(&od->filterPitchEnv);
                    envelope_advance_to_sustain(env, od->frequency);
                    if (g_noise_output != OFF) {
                        envelope_advance_to_sustain(&g_noise->envelopes[osc], 10000.0f);
                    }
                } else {
                    if (bd_usePitchEnvelope)
                        pitch_envelope_advance_to_release_level(&od->pitchEnv);
                    if (bd_useFilterPitchEnvelope)
                        pitch_envelope_advance_to_release_level(&od->filterPitchEnv);
                    envelope_advance_to_zero(env, od->frequency);
                    if (g_noise_output != OFF) {
                        envelope_advance_to_zero(&g_noise->envelopes[osc], 10000.0f);
                    }
                }

                float f = od->frequency;

                if (od->portamento.portamentoData->inUse)
                    f = portamentoGlide(&od->portamento, f);
                if (bd_usePitchEnvelope)
                    f *= od->pitchEnv.level;
                f *= bd->detuneFactor;
                if (f > nyquist)
                    f = nyquist;

                if (bd_useFilter || g_noise->output == FILTER) {
                    float filterFx = od->filterFrequency;
                    if (od->filterPortamento.portamentoData->inUse)
                        filterFx = portamentoGlide(&od->filterPortamento, filterFx);
                    filterFx *= bd->filterDetuneFactor;

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
                if (bd->lfoData.modType == LFO_FREQUENCY) {
                    inc *= (1.0f + render_lfo_sample(&bd->lfoData));
                }
                od->phase += inc;

                if (od->phase >= 1.0f)
                    od->phase -= (int) od->phase;
                float currentPhase = od->phase + mod;
                if (currentPhase >= 1.0f)
                    currentPhase -= (int) currentPhase;
                if (currentPhase < 0.0f)
                    currentPhase += 1.0f;

                const float ampEnvelope = env->level;
                float signal = 0.0f;

                if (bd_periodicWaveData != NULL) {
                    int band;
                    band = (int) (log2f(f / g_startFx) / log2Root2);
                    if (band < 0)
                        band = 0;
                    else if (band > bd->numBands - 1)
                        band = bd->numBands - 1;

                    signal = render_sample_from_phase(b, band, currentPhase) * matrixA;
                }
                float modSignal = (bd_modOutput == 2) ? (signal * ampEnvelope) : signal;

                matrix_apply_modulation(bd, osc, modSignal);

                if (bd->lfoData.modType == LFO_AMPLITUDE) {
                    signal *= (1.0f + render_lfo_sample(&bd->lfoData));
                }
                float noiseSample = noise(g_noise, osc);
                float finalOutputSample = signal * bd->oscillatorLevel * ampEnvelope;
                float filterInputSample = 0.0f;

                if (bd_outputToFilter)
                    filterInputSample = 0.5f * finalOutputSample;
                else if (bd->outputToPhaser)
                    bd->phaserInputs += finalOutputSample;

                if (g_noise_output == FILTER)
                    filterInputSample += noiseSample;

                if (bd_outputToFilter || (g_noise_output == FILTER && b == 0)) {
                    float filterSample = svf_process_morph(&od->svf, filterInputSample) * bd->filterLevel;
                    // Mirroring the exact same source to Left and Right channel blocks
                    if (bd->filterConnectToPhaser)
                        bd->phaserInputs += filterSample;

                    filterOutLeft[i] += filterSample * panLeft;
                    filterOutRight[i] += filterSample * panRight;
                }

                if (g_noise_output == MASTER_VOLUME) {
                    noiseOutLeft[i] += noiseSample * panLeft;
                    noiseOutRight[i] += noiseSample * panRight;
                }

                if (!bd_outputToFilter) {
                    // Mirroring the exact same source to Left and Right channel blocks
                    outLeft[i] += finalOutputSample * panLeft;
                    outRight[i] += finalOutputSample * panRight;
                }
            }
            // The phaser input is processed after the oscillator loop as the sum of the samples from the oscillators
            //  and filters in the bank comprises the single sample for the phaser.
            if (bd_usePhaser) {
                const float phaserOutputSample = phaser_process(g_phaser, bd->phaserInputs);
                phaserOutLeft[i] += phaserOutputSample * panLeft;
                phaserOutRight[i] += phaserOutputSample * panRight;
            }
        }
    }
}
