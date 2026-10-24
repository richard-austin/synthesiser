#ifndef STRUCTS
#define STRUCTS

#include <stdbool.h>

// --- Enumerations ---
typedef enum {
    ENV_INACTIVE = 0,
    ENV_PENDING_ATTACK,
    ENV_ATTACK,
    ENV_PENDING_DECAY,
    ENV_DECAY,
    ENV_SUSTAIN,
    ENV_PENDING_RELEASE,
    ENV_RELEASE,
    ENV_RETRIGGER,
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

typedef enum {
    PORTAMENTO_OFF,
    PORTAMENTO_CHORD,
    PORTAMENTO_PLUS_12,
    PORTAMENTO_PLUS_24,
    PORTAMENTO_MINUS_12,
    PORTAMENTO_MINUS_24,
} portamentoType;

// --- Struct Definitions ---
typedef struct {
    float attack;
    float decay;
    float sustainLevel;
    float release;
    bool legato;
    bool velocitySensitive;
    float justAudible;  // Just audible level to start attack phase at, so that slow attacks don't have a silent period at the the start
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
    int velocity;
    int lastSignum;
    bool signumSet;
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

#ifndef CAPACITY
#define CAPACITY 24
#endif

typedef struct {
    struct Note {float frequency; int noteIndex;} notes [CAPACITY];
    int noteCount;
} Notes;

typedef struct {
    Notes notes1;
    Notes notes2;
    Notes *previousNotes;
    Notes *currentNotes;
    portamentoType type;
    int timer;
    int timerTarget;
    bool timerRunning;
    float glideTime;
} PortamentoData;

typedef struct {
    PortamentoData *portamentoData;
    float lowestTime;
    float lowestFx;
    float t0, t1, t;
    float v0, v1;
    float frequency;
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
    SVFFilter* stage1;
    SVFFilter* stage2;
    EnvelopeData envelopeData;
    Envelope envelope;
} SVF4Filter;

typedef struct {
    float fs;                 // Host sample rate
    float g;                  // Tuning coefficient
    float res;                // Resonance (0.0f to 1.0f)
    float gain_compensation;   // Dynamic make-up gain factor

    // Internal stage states
    float y_a;
    float y_b;
    float y_c;
    float y_d;
    float y_d_prev;

    // History state for internal upsampling interpolation
    float x_prev;
    EnvelopeData envelopeData;
    Envelope envelope;
    float cutoffHz;
} MoogLadderFilter;

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
    //SVF4Filter svf;
    MoogLadderFilter svf;
    Portamento portamento;
    Portamento filterPortamento;
} OscillatorData;

typedef struct {
    float level;
    oscModType modType;
} ModSettings;

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
    bool filterConnectToPhaser;
    bool outputToFilter;
    bool outputToPhaser;
    float phaserInputs;
    float *periodicWaveData;
    int numBands;
    int waveTableSize;
    ModSettings* modMatrix;
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

enum noiseType { WHITE, PINK, BROWN };

enum noiseOutput { OFF, MASTER_VOLUME, FILTER, REVERB, PHASER };

typedef struct {
    enum noiseType type;
    enum noiseOutput output;
    float gain;
    EnvelopeData envelopeData;
    Envelope *envelopes;
    int oscillatorsPerBank;

    // Pink noise filter parameters
    float b0;
    float b1;
    float b2;
    float b3;
    float b4;
    float b5;
    float b6;

    // For brown noise
    float lastOut;
} Noise;

typedef struct {
    // Filter coefficients
    float b0, b1, b2;
    float a1, a2;

    // History states
    float x1, x2; // Previous inputs: x[n-1], x[n-2]
    float y1, y2; // Previous outputs: y[n-1], y[n-2]
} SecondOrderAllPass;

typedef struct {
    // Fixed values
    SecondOrderAllPass* allPassSections;
    LfoData* lfoData;
    int numSections;

    // Variable values
    float frequency;
    float Q;
    float wetDry;
    float level;
    float feedback;
    float lastOutput;
    int sampleRate;
    int sectionsInUse;
} Phaser;

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

static float m_pi = M_PI;
static float two_m_pi = M_PI * 2.0f;

#endif
