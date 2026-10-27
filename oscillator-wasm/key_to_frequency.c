#include <math.h>

#include "globals.h"
#include "key_to_frequency.h"
#include <stdlib.h>

bool g_slop = true;
const float slopFactor = 20000.0f;  // Gives nearly +/- 5 cent slop

float key_to_frequency(int key, int bank) {
    float freqFactor = 7.717057388f;
    float slop = g_slop ? 1.0f + (rand() % 101 - 50.0f)/slopFactor : 1.0f;
    return freqFactor * slop * powf(powf(2.0f, 1.0f / 12.0f), (float) key + 1.0f + 120.0f * (g_banks[bank].tuning * 6.0f / 10.0f));
}

float filter_key_to_frequency(int key, int bank) {
    float freqFactor = 7.717057388f;
    float slop = g_slop ? 1.0f + (rand() % 101 - 50.0f)/slopFactor : 1.0f;
    return freqFactor * slop * powf(powf(2.0f, 1.0f / 12.0f), (float) key + 1.0f + 120.0f * (g_banks[bank].filterTuning * 6.0f / 10.0f));
}
