#ifndef STRUCTS
#define STRUCTS

#include <stdbool.h>

// --- Enumerations ---
typedef enum {
    ENV_INACTIVE = 0,
    ENV_ATTACK,
    ENV_DECAY,
    ENV_SUSTAIN,
    ENV_RELEASE,
    ENV_RETRIGGER,
    ENV_LEGATO
} envelopePhase;

typedef enum {
    MOD_OFF = 0,
    MOD_FREQUENCY,
    MOD_AMPLITUDE
} oscModType;

typedef enum {
    MOD_OUT_DIRECT = 1,
    MOD_OUT_ENVELOPE = 2
} oscModOutput;

typedef enum {
    LFO_AMPLITUDE = 1,
    LFO_FREQUENCY = 2,
    LFO_OFF = 3
} lfoModType;

// --- Struct Definitions ---
typedef struct {
    float attack;
    float decay;
    float sustainLevel;
    float release;
    bool legato;
    bool velocitySensitive;
    int velocity;
} EnvelopeData;

typedef struct {
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

typedef struct {
    float attack;
    float attackLevel;
    float decay;
    float sustainLevel;
    float release;
    float releaseLevel;
} PitchEnvelopeData;

typedef struct {
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

#define CAPACITY 12

// Structure representing the circular queue
typedef struct {
    float items[CAPACITY];
    int front;
    int rear;
    int size;
} CircularQueue;

typedef struct {
    CircularQueue queue;
    float time;
    bool inUse;
} PortamentoData;

typedef struct {
    PortamentoData *portamentoData;
    float lowestTime;
    float lowestLevel;
    float t0, t1, t;
    float v0, v1;
    float level;
    bool targetReached;
} Portamento;

typedef struct {
    float x1, x2, y1, y2;
    float b0, b1, b2, a1, a2;
} ButterworthFilter;

typedef struct {
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

typedef struct {
    float frequency;
    int band;
    float phase;
    float level;
    lfoModType modType;
    long waveTableSize;
    float *periodicWaveData;
} LfoData;

typedef struct {
    int key;
    Envelope env;
    PitchEnvelope pitchEnv;
    PitchEnvelope filterPitchEnv;
    float frequency;
    float phase;
    ButterworthFilter butterworthFilter;
    float filterFrequency;
    SVFFilter svf;
    Portamento portamento;
    Portamento filterPortamento;
} OscillatorData;

typedef struct {
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
    float *periodicWaveData;
    int numBands;
    int waveTableSize;
    oscModOutput modOutput; // 1=direct, 2=envelope
    LfoData lfoData;
    LfoData filterLfoData;
    float resonanceBankFactor;
    float oscillatorLevel;
    float filterLevel;
    // OPTIMIZED STRUCTURE STORAGE
    float panLeft; // Left multiplier cache
    float panRight; // Right multiplier cache
    PortamentoData portamentoData;
    PortamentoData filterPortamentoData;
} BankData;

typedef struct {
    int carrierIdx;
    float level;
    oscModType modType;
} ModSettings;

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static float m_pi = M_PI;
static float two_m_pi = M_PI * 2.0f;

#endif
