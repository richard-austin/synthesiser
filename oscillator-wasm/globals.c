#include "structs.h"
#include <stddef.h>

// --- Global Engine Core Context Variables ---
int g_numberOfBanks = 0;
int g_oscillatorsPerBank = 0;
int g_waveTableSize = 2048;
float g_startFx = 20.0f;
float g_sampleRate = 44100.0f;
int g_roundRobinIndex = 0;

BankData *g_banks = NULL;
OscillatorData **g_oscData = NULL;

float *g_fmAccumulators = NULL;
float *g_amAccumulators = NULL;
ModSettings *g_modMatrix = NULL;
float twelfthRoot2 = 1.05946309436f;
float log2Root2;
const float root2 = 1.41421356237f;

const float g_modFreqBase = 30.0f;
const float g_modFreqMax = 4000.0f;
const float g_modFreqMaxInput = 2.0f;
