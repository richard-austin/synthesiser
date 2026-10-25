#include <emscripten/console.h>
#include "portamento.h"
#include <math.h>
#include <stdlib.h>

void initPortamentoData(PortamentoData *data) {
    data->glideTime = 0.0f;
    data->notes1.noteCount = data->notes2.noteCount = 0;
    data->previousNotes = &data->notes1;
    data->currentNotes = &data->notes2;
    data->type = PORTAMENTO_OFF;
    data->timer = 0;
    data->timerTarget = g_sampleRate * 0.03; // 30mS capture window
    data->timerRunning = false;
}

void portamento_chord_capture(PortamentoData *data, float frequency, int noteIndex) {
    Notes *notes = data->currentNotes;
    if (notes->noteCount == 0) {
        data->timer = 0;
        data->timerRunning = true;
    }
    struct Note *note = &notes->notes[notes->noteCount++];
    note->frequency = frequency;
    note->noteIndex = noteIndex;
}

void switchNoteBanks(PortamentoData *data) {
    Notes *temp = data->previousNotes;
    data->previousNotes = data->currentNotes;
    data->currentNotes = temp;
    data->currentNotes->noteCount = 0; // Reset the notes count ready for the next chord.
}

float noteAverage(const Notes *notes) {
    float notesAverage = 0.0f;

    for (int i = 0; i < notes->noteCount; i++) {
        notesAverage += notes->notes[i].frequency;
    }

    notesAverage /= notes->noteCount;
    return notesAverage;
}

int notesCompare(const void *a, const void *b) {
    int x = *(const int *) a;
    int y = *(const int *) b;

    if (x < y)
        return -1;
    if (x > y)
        return 1;
    return 0;
}

void portamento_set_timing(Portamento *porta, float startFrequency, float targetFrequency) {
    PortamentoData *pd = porta->portamentoData;

    porta->frequency = startFrequency;
    if (porta->frequency == -1.0f)
        porta->frequency = targetFrequency;
    // FIX: Prevent porta->v0 from being 0 or lower than porta->lowestLevel
    float startFx = porta->frequency;
    if (startFx < porta->lowestFx) {
        startFx = porta->lowestFx;
    }

    porta->v0 = startFx;
    porta->v1 = targetFrequency + porta->lowestFx;
    porta->t0 = porta->t;
    porta->t1 = porta->t0 + pd->glideTime + porta->lowestTime;
    //  emscripten_console_logf("glideTime = %f t0 = %f t1 = %f v0 = %f v0 = %f", pd->glideTime, porta->t0, porta->t1, porta->v0, porta->v1);
    porta->targetReached = false;
}

bool portamento_in_use(const PortamentoData *pd) {
    return pd->type != PORTAMENTO_OFF && pd->glideTime != 0.0f;
}

void portamento_process(PortamentoData *pd, int bank, bool isFilter) {
    if (pd->glideTime != 0.0f && pd->timerRunning && ++pd->timer >= pd->timerTarget) {
        pd->timer = 0;
        pd->timerRunning = false;
        Notes *currentNotes = pd->currentNotes;
        Notes *previousNotes = pd->previousNotes;
        const portamentoType t = pd->type;
        float factor = t == PORTAMENTO_PLUS_12
                           ? 2.0f
                           : t == PORTAMENTO_PLUS_24
                                 ? 4.0f
                                 : t == PORTAMENTO_MINUS_12
                                       ? 0.5f
                                       : t == PORTAMENTO_MINUS_24
                                             ? 0.25f
                                             : 1.0f;
        switch (pd->type) {
            case PORTAMENTO_OFF:
                break;
            case PORTAMENTO_CHORD: {
                qsort(currentNotes->notes, currentNotes->noteCount, sizeof(currentNotes->notes[0]), notesCompare);
                bool glideUp = noteAverage(currentNotes) > noteAverage(pd->previousNotes);
                // emscripten_console_logf("noteAverage(currentNotes) = %f noteAverage(previousNotes) = %f currentNotes = %d previousNotes %d", noteAverage(currentNotes), noteAverage(previousNotes), currentNotes->noteCount, previousNotes->noteCount);

                if (true || glideUp) {
                    for (int i = 0; i < currentNotes->noteCount && i < previousNotes->noteCount; i++) {
                        OscillatorData *od = &g_oscData[bank][currentNotes->notes[i].noteIndex];
                        Portamento *portamento = isFilter ? &od->filterPortamento : &od->portamento;
                        portamento_set_timing(portamento, previousNotes->notes[i].frequency,
                                              currentNotes->notes[i].frequency);
                    }
                    if (currentNotes->noteCount > previousNotes->noteCount && previousNotes->noteCount > 0) {
                        for (int i = previousNotes->noteCount; i < currentNotes->noteCount; i++) {
                            OscillatorData *od = &g_oscData[bank][currentNotes->notes[i].noteIndex];
                            Portamento *portamento = isFilter ? &od->filterPortamento : &od->portamento;
                            const float startFrequency =
                                    previousNotes->notes[previousNotes->noteCount - 1].frequency * currentNotes->notes[
                                        i].
                                    frequency / currentNotes->notes[i - 1].frequency;
                            portamento_set_timing(portamento, startFrequency, currentNotes->notes[i].frequency);
                        }
                    }
                }
                break;
            }
            case PORTAMENTO_PLUS_12:
            case PORTAMENTO_PLUS_24:
            case PORTAMENTO_MINUS_12:
            case PORTAMENTO_MINUS_24: {
                for (int i = 0; i < currentNotes->noteCount; i++) {
                    OscillatorData *od = &g_oscData[bank][currentNotes->notes[i].noteIndex];
                    Portamento *portamento = isFilter ? &od->filterPortamento : &od->portamento;
                    portamento_set_timing(portamento, currentNotes->notes[i].frequency * factor,
                                          currentNotes->notes[i].frequency);
                }
            }
            break;
            default:
                emscripten_console_errorf("Unknown portamento type %d", pd->type);
                break;
        }
        switchNoteBanks(pd);
    }
}

void portamento_init(Portamento *porta, PortamentoData *data) {
    porta->portamentoData = data;
    porta->lowestTime = 0.0001f;
    porta->lowestFx = 0.0000001f;
    porta->v0 = porta->lowestFx;
    porta->v1 = porta->lowestFx;
    porta->targetReached = false;
}

float portamentoGlide(Portamento *porta, float currentFx) {
    porta->t += 1.0f / g_sampleRate;
    if ((porta->t1 - porta->t0) == 0) {
        porta->frequency = porta->v1;
        porta->targetReached = true;
    } else {
        porta->frequency = porta->v0 * powf(porta->v1 / porta->v0, (porta->t - porta->t0) / (porta->t1 - porta->t0));
        if (isnanf(porta->frequency))
            emscripten_console_errorf(
                "NaN returned by powf(porta->v1 / porta->v0, (porta->t - porta->t0) / (porta->t1 - porta->t0) in pitch envelope");
        if (porta->t >= porta->t1 && !porta->targetReached) {
            porta->targetReached = true;
            porta->frequency = porta->v1;
        }
    }
    return !porta->targetReached ? porta->frequency : currentFx;
    // Use current frequency when target reached to allow tuning
}
