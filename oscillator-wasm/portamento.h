#ifndef PORTAMENTO_H
#define PORTAMENTO_H

#include "globals.h"


void initPortamentoData(PortamentoData *data);

void portamento_chord_capture(PortamentoData *data, float frequency, int noteIndex);

bool portamento_in_use(const PortamentoData* pd);

void portamento_process(PortamentoData *pd, int bank, bool isFilter);

void portamento_init(Portamento *porta, PortamentoData *data);

float portamentoGlide(Portamento *porta, float currentFx);


#endif
