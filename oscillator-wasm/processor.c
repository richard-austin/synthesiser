#include <emscripten.h>
#include <math.h>
#include <stdint.h>
#include <stdbool.h>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#ifndef M_SQRT2
#define M_SQRT2 1.41421356237309504880
#endif

// Configurations and Constants
#define MaxWaveTableSize 2048
#define MaxBands 64
#define SampleBlockSize 128

const double twelfthRoot2 = 1.0594630943592953;
const double root2        = 1.4142135623730951;

// Filter state variables (renamed to avoid math.h conflicts)
static float fx1 = 0.0f, fx2 = 0.0f, fy1 = 0.0f, fy2 = 0.0f;
static float b0 = 0.0f, b1 = 0.0f, b2 = 0.0f, a1 = 0.0f, a2 = 0.0f;

// Oscillator state variables
static float phase          = 0.0f;
static float lastDetune     = 0.0f;
static float detuneFactor   = 1.0f;
static float sampleRate     = 44100.0f;
static float nyquist        = 22050.0f;
static float startFx        = 20.0f;
static int32_t waveTableSize = 2048;

// Memory buffers accessible from JS
static float inputBuffer[SampleBlockSize];
static float outputBuffer[SampleBlockSize];
static float freqBuffer[SampleBlockSize];
static float detuneBuffer[SampleBlockSize];

// Wave table storage matrix: [band][index]
static float waveTables[MaxBands][MaxWaveTableSize];
static int32_t activeBands = 0;
static bool usePeriodicWave = false;

EMSCRIPTEN_KEEPALIVE
void initProcessor(float sRate, float startF, int32_t wTableSize) {
    sampleRate      = sRate;
    nyquist         = sRate / 2.0f;
    startFx         = startF;
    waveTableSize   = wTableSize;
    phase           = 0.0f;
    lastDetune      = 0.0f;
    detuneFactor    = 1.0f;
    usePeriodicWave = false;
}

EMSCRIPTEN_KEEPALIVE
void calculateCoefficients(float cutoff) {
    double omega  = M_PI * (double)cutoff / (double)sampleRate;
    double tanVal = tan(omega);
    double c2     = tanVal * tanVal;
    double a0     = 1.0 + M_SQRT2 * tanVal + c2;
    
    b0 = (float)(c2 / a0);
    b1 = (float)(2.0 * c2 / a0);
    b2 = (float)(c2 / a0);
    a1 = (float)(2.0 * (c2 - 1.0) / a0);
    a2 = (float)((1.0 - M_SQRT2 * tanVal + c2) / a0);
}

EMSCRIPTEN_KEEPALIVE
void setWaveTableBand(int32_t band, int32_t index, float value) {
    if (band < MaxBands && index < MaxWaveTableSize) {
        waveTables[band][index] = value;
        if (band >= activeBands) {
            activeBands = band + 1;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void setUsePeriodicWave(bool status) {
    usePeriodicWave = status;
}

EMSCRIPTEN_KEEPALIVE float* getInputBufferPtr()  { return inputBuffer; }
EMSCRIPTEN_KEEPALIVE float* getOutputBufferPtr() { return outputBuffer; }
EMSCRIPTEN_KEEPALIVE float* getFreqBufferPtr()   { return freqBuffer; }
EMSCRIPTEN_KEEPALIVE float* getDetuneBufferPtr() { return detuneBuffer; }

EMSCRIPTEN_KEEPALIVE
void processBlock(int32_t modLen, int32_t freqLen, int32_t detuneLen, int32_t blockSize) {
    for (int32_t i = 0; i < blockSize; i++) {
        // 1. Get Frequency
        float f;
        if (freqLen == 1) {
            f = freqBuffer[0];
        } else {
            f = freqBuffer[i];
        }
        if (f > nyquist) {
            f = nyquist;
        }

        // 2. Select Band
        int32_t band = 0;
        if (usePeriodicWave && activeBands > 0) {
            band = (int32_t)floor(log2((double)(f / startFx)) / log2(root2));
            if (band < 0) {
                band = 0;
            } else if (band > activeBands - 1) {
                band = activeBands - 1;
            }
        }

        // 3. Handle Detune
        float detune;
        if (detuneLen == 1) {
            detune = detuneBuffer[0];
        } else {
            detune = detuneBuffer[i];
        }
        if (detune != lastDetune) {
            lastDetune = detune;
            detuneFactor = (float)pow(twelfthRoot2, (double)(detune / 100.0f));
        }
        f *= detuneFactor;

        // 4. Filter Phase Mod Input
        float x;
        if (modLen == 1) {
            x = inputBuffer[0] * 10.0f;
        } else {
            x = inputBuffer[i] * 10.0f;
        }

        // Biquad Difference Equation
        float mod = b0 * x + b1 * fx1 + b2 * fx2 - a1 * fy1 - a2 * fy2;
        fx2 = fx1;
        fx1 = x;
        fy2 = fy1;
        fy1 = mod;

        // 5. Oscillator Wave Generation
        float inc = f / sampleRate;
        phase += inc;
        float currentPhase = phase + mod;
        currentPhase = currentPhase - (float)floor((double)currentPhase);
        phase = phase - (float)floor((double)phase);

        if (usePeriodicWave) {
            int32_t tableIdx = (int32_t)floor((double)(currentPhase * (float)waveTableSize));
            if (tableIdx >= waveTableSize) {
                tableIdx = waveTableSize - 1;
            }
            outputBuffer[i] = waveTables[band][tableIdx];
        } else {
            outputBuffer[i] = (float)sin((double)(currentPhase * 2.0f * M_PI));
        }
    }
}

