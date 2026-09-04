#ifndef __GLOBALS
#define __GLOBALS

#include "structs.h"

// --- Global Engine Core Context Variables ---
extern int g_numberOfBanks ;
extern int g_oscillatorsPerBank;
extern int g_waveTableSize;
extern float g_startFx;
extern float g_sampleRate;
extern int g_roundRobinIndex;

extern BankData *g_banks ;
extern OscillatorData **g_oscData;

extern float *g_fmAccumulators;
extern float *g_amAccumulators;
extern ModSettings *g_modMatrix;
extern float twelfthRoot2;
extern float log2Root2;
extern const float root2;

extern const float g_modFreqBase ;
extern const float g_modFreqMax ;
extern const float g_modFreqMaxInput;

#endif
