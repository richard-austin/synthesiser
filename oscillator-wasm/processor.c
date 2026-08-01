#include <emscripten.h>
#include <stdbool.h>
#include <math.h>
#include <stddef.h>

#define NUM_BANKS 4
#define OSC_PER_BANK 12
#define BLOCK_SIZE 128
#define TWO_PI 6.28318530717958647692f

// Envelope Stages
typedef enum {
    ENV_OFF = 0,
    ENV_ATTACK,
    ENV_DECAY,
    ENV_SUSTAIN,
    ENV_RELEASE
} EnvStage;

// Waveform Types
typedef enum {
    WAVE_SINE = 0,
    WAVE_SQUARE,
    WAVE_TRIANGLE,
    WAVE_SAW
} WaveType;

typedef struct {
    float attack_rate;   // Delta change per sample
    float decay_rate;    // Delta change per sample
    float sustain_level; // Target multiplier [0.0, 1.0]
    float release_rate;  // Delta change per sample
    float current_level; // Current scalar
    EnvStage stage;      // State-machine selector
} Envelope;

typedef struct {
    float phase;
    float base_freq;
    float detune;        // Frequency offset in Hz
    int midi_note;       // Associated note tracking binding
    bool is_active;
    Envelope amp_env;
} Oscillator;

typedef struct {
    Oscillator oscs[OSC_PER_BANK];
    Envelope freq_env;
    WaveType wave_type;
    float tuning_coarse; // Pitch shift offset
    float detune_cents;  // Bank level detuning multiplier
    float bank_output_buffer[BLOCK_SIZE];
} Bank;

typedef struct {
    Bank banks[NUM_BANKS];
    float mod_matrix[NUM_BANKS][NUM_BANKS]; // [Modulator][Carrier]
    bool is_am[NUM_BANKS][NUM_BANKS];       // True = AM, False = FM
    bool mod_post_env[NUM_BANKS];           // Carrier feeds post/pre amplitude gating
    float sample_rate;
} FMSynthEngine;

// Static global instance allocated in linear WASM memory space
static FMSynthEngine synth;

// --- INTERNAL HELPERS ---

static void init_envelope(Envelope* env) {
    env->attack_rate = 0.01f;
    env->decay_rate = 0.005f;
    env->sustain_level = 0.7f;
    env->release_rate = 0.001f;
    env->current_level = 0.0f;
    env->stage = ENV_OFF;
}

static inline float update_envelope(Envelope* env) {
    switch (env->stage) {
        case ENV_ATTACK:
            env->current_level += env->attack_rate;
            if (env->current_level >= 1.0f) {
                env->current_level = 1.0f;
                env->stage = ENV_DECAY;
            }
            break;
        case ENV_DECAY:
            env->current_level -= env->decay_rate;
            if (env->current_level <= env->sustain_level) {
                env->current_level = env->sustain_level;
                env->stage = ENV_SUSTAIN;
            }
            break;
        case ENV_SUSTAIN:
            // Holds constant value until triggerNoteOff explicitly updates status
            break;
        case ENV_RELEASE:
            env->current_level -= env->release_rate;
            if (env->current_level <= 0.0f) {
                env->current_level = 0.0f;
                env->stage = ENV_OFF;
            }
            break;
        case ENV_OFF:
        default:
            env->current_level = 0.0f;
            break;
    }
    return env->current_level;
}

static inline float generate_wave_sample(WaveType type, float phase) {
    // Normalise phase window boundary to [0.0, 1.0]
    float normalized = phase / TWO_PI;
    normalized -= (int)normalized;
    if (normalized < 0.0f) normalized += 1.0f;

    switch (type) {
        case WAVE_SINE:
            return sinf(phase);
        case WAVE_SQUARE:
            return (normalized < 0.5f) ? 1.0f : -1.0f;
        case WAVE_TRIANGLE:
            if (normalized < 0.25f) return normalized * 4.0f;
            if (normalized < 0.75f) return 2.0f - (normalized * 4.0f);
            return (normalized * 4.0f) - 4.0f;
        case WAVE_SAW:
            return (normalized * 2.0f) - 1.0f;
        default:
            return 0.0f;
    }
}

// --- PUBLIC ENGINE API INTERFACES ---

EMSCRIPTEN_KEEPALIVE
void initProcessor(float sampleRate) {
    synth.sample_rate = sampleRate;

    for (int b = 0; b < NUM_BANKS; b++) {
        synth.banks[b].wave_type = WAVE_SINE;
        synth.banks[b].tuning_coarse = 0.0f;
        synth.banks[b].detune_cents = 0.0f;
        synth.mod_post_env[b] = true;
        init_envelope(&synth.banks[b].freq_env);

        for (int i = 0; i < OSC_PER_BANK; i++) {
            synth.banks[b].oscs[i].phase = 0.0f;
            synth.banks[b].oscs[i].base_freq = 440.0f;
            synth.banks[b].oscs[i].detune = 0.0f;
            synth.banks[b].oscs[i].midi_note = -1;
            synth.banks[b].oscs[i].is_active = false;
            init_envelope(&synth.banks[b].oscs[i].amp_env);
        }

        for (int dst = 0; dst < NUM_BANKS; dst++) {
            synth.mod_matrix[b][dst] = 0.0f;
            synth.is_am[b][dst] = false;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void setMatrixGain(int sourceBank, int targetBank, float gain, bool isAM) {
    if (sourceBank >= 0 && sourceBank < NUM_BANKS && targetBank >= 0 && targetBank < NUM_BANKS) {
        synth.mod_matrix[sourceBank][targetBank] = gain;
        synth.is_am[sourceBank][targetBank] = isAM;
    }
}

EMSCRIPTEN_KEEPALIVE
void setBankEnvelopeParams(int bank, bool isFrequencyEnv, float a, float d, float s, float r) {
    if (bank < 0 || bank >= NUM_BANKS) return;

    if (isFrequencyEnv) {
        Envelope* env = &synth.banks[bank].freq_env;
        env->attack_rate = 1.0f / (a * synth.sample_rate + 1.0f);
        env->decay_rate = 1.0f / (d * synth.sample_rate + 1.0f);
        env->sustain_level = s;
        env->release_rate = 1.0f / (r * synth.sample_rate + 1.0f);
    } else {
        for(int i = 0; i < OSC_PER_BANK; i++) {
            Envelope* a_env = &synth.banks[bank].oscs[i].amp_env;
            a_env->attack_rate = 1.0f / (a * synth.sample_rate + 1.0f);
            a_env->decay_rate = 1.0f / (d * synth.sample_rate + 1.0f);
            a_env->sustain_level = s;
            a_env->release_rate = 1.0f / (r * synth.sample_rate + 1.0f);
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void triggerNoteOn(int bank, int noteNumber, float frequency) {
    if (bank < 0 || bank >= NUM_BANKS) return;

    int targetIdx = -1;
    for (int i = 0; i < OSC_PER_BANK; i++) {
        if (!synth.banks[bank].oscs[i].is_active || synth.banks[bank].oscs[i].amp_env.stage == ENV_OFF) {
            targetIdx = i;
            break;
        }
    }

    if (targetIdx == -1) targetIdx = 0; // Simple voice stealing fallback

    Oscillator* o = &synth.banks[bank].oscs[targetIdx];
    o->base_freq = frequency;
    o->midi_note = noteNumber;
    o->is_active = true;
    o->amp_env.current_level = 0.0f;
    o->amp_env.stage = ENV_ATTACK;

    if (synth.banks[bank].freq_env.stage == ENV_OFF) {
        synth.banks[bank].freq_env.current_level = 0.0f;
        synth.banks[bank].freq_env.stage = ENV_ATTACK;
    }
}

EMSCRIPTEN_KEEPALIVE
void triggerNoteOff(int bank, int noteNumber) {
    if (bank < 0 || bank >= NUM_BANKS) return;

    bool remainingActive = false;
    for (int i = 0; i < OSC_PER_BANK; i++) {
        Oscillator* o = &synth.banks[bank].oscs[i];
        if (o->is_active && o->midi_note == noteNumber) {
            o->amp_env.stage = ENV_RELEASE;
        }
        if (o->is_active && o->amp_env.stage != ENV_OFF) {
            remainingActive = true;
        }
    }

    if (!remainingActive) {
        synth.banks[bank].freq_env.stage = ENV_RELEASE;
    }
}

EMSCRIPTEN_KEEPALIVE
float* getBankOutputBufferPtr(int bank) {
    if (bank >= 0 && bank < NUM_BANKS) {
        return synth.banks[bank].bank_output_buffer;
    }
    return NULL;
}

EMSCRIPTEN_KEEPALIVE
void processBlock() {
    for (int b = 0; b < NUM_BANKS; b++) {
        for (int s = 0; s < BLOCK_SIZE; s++) {
            synth.banks[b].bank_output_buffer[s] = 0.0f;
        }
    }

    float sample_mod_outputs[NUM_BANKS];

    for (int s = 0; s < BLOCK_SIZE; s++) {
        for (int b = 0; b < NUM_BANKS; b++) {
            sample_mod_outputs[b] = 0.0f;
        }

        // 1. PHASE MODULATION (FM) MATRIX EVALUATION LOOP
        for (int b = 0; b < NUM_BANKS; b++) {
            float freq_env_delta = update_envelope(&synth.banks[b].freq_env);

            float fm_modulation_input = 0.0f;
            for (int src = 0; src < NUM_BANKS; src++) {
                if (synth.mod_matrix[src][b] != 0.0f && !synth.is_am[src][b]) {
                    fm_modulation_input += sample_mod_outputs[src] * synth.mod_matrix[src][b];
                }
            }

            float bank_sample_accumulator = 0.0f;
            float bank_raw_mod_accumulator = 0.0f;

            for (int i = 0; i < OSC_PER_BANK; i++) {
                Oscillator* o = &synth.banks[b].oscs[i];
                if (!o->is_active) continue;

                float amp_env_scaler = update_envelope(&o->amp_env);
                if (o->amp_env.stage == ENV_OFF) {
                    o->is_active = false;
                    continue;
                }

                // Envelope scales frequency directly (e.g. 100Hz max depth multiplier)
                float applied_freq = o->base_freq + (freq_env_delta * 100.0f);

                float phase_increment = (applied_freq / synth.sample_rate) * TWO_PI;
                o->phase += phase_increment;
                if (o->phase >= TWO_PI) o->phase -= TWO_PI;

                float target_phase = o->phase + fm_modulation_input;
                float raw_sample = generate_wave_sample(synth.banks[b].wave_type, target_phase);

                float active_gated_sample = raw_sample * amp_env_scaler;
                bank_sample_accumulator += active_gated_sample;

                bank_raw_mod_accumulator += synth.mod_post_env[b] ? active_gated_sample : raw_sample;
            }

            synth.banks[b].bank_output_buffer[s] = bank_sample_accumulator;
            sample_mod_outputs[b] = bank_raw_mod_accumulator;
        }

        // 2. AMPLITUDE MODULATION (AM) EVALUATION PASSTHROUGH
        for (int b = 0; b < NUM_BANKS; b++) {
            float am_scalar = 1.0f;
            for (int src = 0; src < NUM_BANKS; src++) {
                if (synth.mod_matrix[src][b] != 0.0f && synth.is_am[src][b]) {
                    am_scalar *= (1.0f + (sample_mod_outputs[src] * synth.mod_matrix[src][b]));
                    }
                }
            synth.banks[b].bank_output_buffer[s] *= am_scalar;
            }
        }
    }
