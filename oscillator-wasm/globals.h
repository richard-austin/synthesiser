#ifndef GLOBALS
#define GLOBALS
#include <stdlib.h>
#include "structs.h"

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
static float log2Root2;
static const float root2 = 1.41421356237f;

#endif
