#ifndef __NOISE_H__
#define __NOISE_H__

void noise_init(Noise* n, int oscillatorsPerBank);
void noise_init_envelope(Noise* n, int oscIndex, float velocity);
float noise(Noise* n, int osc);

#endif
