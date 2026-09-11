#ifndef _PHASER_H_
#define _PHASER_H_

#include "structs.h"

void phaser_init(Phaser *phaser, int sampleRate);

void phaser_set_frequency(Phaser *phaser, float freq);

void phaser_set_q(Phaser *phaser, float q);

void phaser_set_level(Phaser *phaser, float level);

void phaser_set_wet_dry(Phaser *phaser, float wetDry);

void phaser_set_stages(Phaser *phaser, int stages);

void phaser_set_feedback(Phaser* phaser, float feedback);

float phaser_process(Phaser *phaser, float input);

#endif
