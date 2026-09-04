#include <emscripten.h>
#include "globals.h"
#include "lfo.h"

void lfo_init(LfoData *data, long waveTableSize)
{
    data->frequency = 0.0f;
    data->band = 0;
    data->phase = 0.0f;
    data->level = 0.0f;
    data->modType = LFO_OFF;
    data->waveTableSize = waveTableSize;
    data->periodicWaveData = NULL;
    data->band = 0;
}

void lfo_advance(LfoData *ld)
{
    if (ld->modType != LFO_OFF)
    {
        ld->phase += (ld->frequency / g_sampleRate);
        if (ld->phase >= 1)
            ld->phase -= 1;
    }
}

EMSCRIPTEN_KEEPALIVE
float render_lfo_sample(LfoData *ld)
{
    if (ld->periodicWaveData == NULL)
        return 0.0f;

    // 1. Point to the specific wavetable inside the continuous memory block
    // (Assuming 21 tables per bank as per your calloc setup)
    float *current_table = ld->periodicWaveData + (ld->band * ld->waveTableSize);

    // 2. Scale phase (0.0 to 1.0) to the wavetable size index space
    float exact_index = ld->phase * (float)ld->waveTableSize;

    // 3. Get the floor integer index and the fractional remainder
    int index_a = (int)exact_index;
    float fraction = exact_index - (float)index_a;

    // 4. Determine the next sample index (with wrap-around handling)
    int index_b = index_a + 1;
    if (index_b >= ld->waveTableSize)
    {
        index_b = 0;
    }

    // Safety guard for boundaries
    if (index_a >= ld->waveTableSize)
    {
        index_a = ld->waveTableSize - 1;
    }

    // 5. Fetch the two samples
    float sample_a = current_table[index_a];
    float sample_b = current_table[index_b];

    // 6. Linearly interpolate between them
    // formula: a + fraction * (b - a)
    return (sample_a + fraction * (sample_b - sample_a)) * ld->level;
}
