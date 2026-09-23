# FM Music Synthesiser
This is a polyphonic music synthesiser which uses features of traditional subtractive synthesis 
using harmonic rich waveforms run through filters, as well as additive synthesis using FM, or AM modulation.

The synthesiser is a web application using WebAudio. Most of the functionality is in a single audio worklet containing the following:-

* 4 banks of 12 oscillators (for up to 12 note polyphony),
* 4 banks of 12 filters which can be morphed between low and high pass with variable Q. Oscillators each feed into a corresponding filter
 with so that the filter effect on each note is consistent.
* Operator Matrix which enables any oscillator bank to modulate any other, including themselves.
* Phaser which can have between 1 and 61 all pass stages,and has feedback, Q and wet/dry control
* Noise generator which can produce white, pink or brown noise.
* ADSR envelopes for oscillator banks and noise generator.
* Pitch envelope for oscillator banks and filter
* Portamento for oscillator and filter banks 
* Modulator for Oscillator and filter banks (variable between LFO and audio frequencies).
* LFO for Phaser

The audio worklet uses a WebAssembly compiled from C code with Emscripten. 

Additional modules are:-

* Reverb unit which comprises a convolver with settable echo attack and decay times and a repeat echo
loop with variable delay and pre-delay.
* Ring modulator.
* Analyser with a graphical display which can show the audio in the time (oscilloscope) or frequency
(spectrum analyser) domains.
 

* It will work with standard USB MIDI keyboards.

The synthesiser may be either run in a browser, or built as an application for Linux or Windows as Electron Desktop apps.

![View of the whole control panel](README.images/synth.png "FM Synthesiser")

*The Complete synthesiser control panel*
## Building the project for installation on Linux (Debian/Ubuntu) or Windows

1. Download from GitHub (git clone git@github.com:richard-austin/synthesiser.git))
2. cd to project directory
3. cd to client an type npm install
4. cd to electron-desktop and type npm install (on Linux dev environment only)
5. cd to electron-desktop-win and type npm install. (on Windows dev environment only) (these npm install steps only need to be done
on initial set up or if any node modules are changed/added/updated.)
### To build a Windows installer (amd_64)
1. *This must be down from a Windows environment*
2. cd to the project directory 
3. Type ./gradlew electron-desktop-win:buildWindowws
#### The installer file will be at projectDir/electon-desktop-win/dist with a name similar to synthesiser-desktop-win Setup 1.0.0.exe
### To build a Debian deb installation file (amd_64)
1. *This must be done from a Linux environment.*
2. cd to project directory
3. Type ./gradlew electron-desktop:buildLinux
#### The installer file will be at projectDir/electon-desktop/dist with a name similar to synthesiser-desktop_1.0.0.deb

## Using the synthesiser

### The control dials
The most ubiquitous object on the main panel are the control dials.

<img height="98" alt="Control Dial" src="README.images/control-dial.png" width="100"/>

* To increase or decrease the setting on a control dial, hold the mouse button down and drag up to increase the setting, down to decrease it.
* To set a dial to zero, click on it then press ESC.
* To set a dial to a particular number on the dial, click on the dial so the cursor above it turns red and press F*n* where *n* is the required number. 
* Some of the dials have negative settings, To go straight to these, click on the dial so the cursor above it turns red then press the shift key along 
with the appropriate F key. 

### Selecting oscillator/filter banks.
Each bank of oscillators has a corresponding bank of filters. When keys are pressed on the keyboard
a vacant oscillator is selected to play that note* At the same time the filter selected from the 
corresponding bank will be the filter that corresponds to that oscillator, and it will be assigned the same base frequency
as the oscillator.

\* If an oscillator is still actively playing a note just played again (i.e. during the release phase of the envelope)
It will be selected again ahead of any vacant oscillators and retriggered on that note.

* On the Operator Matrix panel, an oscillator/filter bank pair can be selected by clicking on the number of the bank you want 
In either the carriers column or modulators row. 

<img height="356" src="README.images/modulation-matrix.png" width="287.5" title="Modulation Matrix" alt="The controls for setting cross modulation (AM or FM) between oscillator banks."/>

*The operator modulation matrix*

### Module Outputs

Each module has a set of output selector buttons which determine where the output from that module will go to.
The speaker is selected on illustration. 
These are the oscillator output buttons which enable directing the oscillator output to the speaker, filter, 
ring modulator, reverb, phaser or having it set off. Note the for the oscillators and filters, each
bank has its own output setting independent of the others.

![](README.images/outputs.png)

### Oscillators
There are 4 banks of 12 oscillators giving up to four simultaneous settings with 12 note polyphony on each bank.

![](README.images/oscillator.png)

*Oscillator bank 1*

#### Main Controls

| Control  | Function                                                                                                                                                                                                                           |
|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tuning   | Centered on zero where middle C will be in the expected place, this tunes the frequency up or down from nominal by up to 3 octaves. The dial numbers represent octaves up or down The resolution of course is finer than octaves. |
| Detune   | Centred on zero where there is no offset, the dial scale allows detune by up to + or - 12 semitines                                                                                                                                |
| Gain     | Set the output level to between zero and 100% of full output.                                                                                                                                                                     |
| Balance  | Adjust the left/right balance of the output. Note that this also applies to the filters in the same bank. The phaser and noise output balance is set by the  balance control on oscillator bank 1.                                 |
| Waveform | This is a drop down control allowing the selection of waveform for the oscillator output                                                                                                                                           |
| Output   | Select output target for the oscillator bank (Sere module outputs above)                                                                                                                                                           |

#### Oscillator Modulation

| Control    | Function                                                                                                                                       |
|------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| Mod Freq   | Frequency of the modulator. This works over a fairly wide range with an exponential law enabling it to range from an LFO to an audio modulator |
| Mod Depth  | Modulation gain                                                                                                                                |
| Waveform   | Select modulation waveform from sine, square sawtooth or triangular waves.                                                                     |
| Modulation | Select type from amplitude, frequency or off (none)                                                                                            |

#### Modulation output

This does not relate to the modulation from the modulating LFO/oscillator described above, but to the output of
the main oscillator when selected as a modulator in the Operator Matrix.

| Setting  | Result                                                                                                                                           |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| Direct   | The oscillator output is applied for modulation without envelope shaping, i.e. at the contant level selected by the dial on the operator matrix. |
| Envelope | The oscillator output is time dependent as set by the ASDR envelope, with overall modulation gain set by the dial on the operator matrix         |


#### Portamento
This function is limited at the moment, and just gives a glide between the previous note and the next. Set to zero, there is no portamento.
The drop down below it is from an earlier version and currently does nothing.

#### Envelope

This is a standard ADSR envelope shaper.
#### Legato
If legato mode is on, pressing a key will cause the envelope to rise to 100% and remain there for the decay time.
Holding the key down will sustain this. After the decay time has elapse, the note will tail off in accordance with the release timing.
#### Velocity Sens
Enable/disable velocity sensitivity.
#### Freq Envelope
The pitch envelope is used to bend the pitch over time as the envelope does with output amplitude.
There are two additional controls as compared with the amplitude envelope, Attack Level and Release Level.
When the pitch envelope is set on the sequence is as follows:-
* The pitch starts at the release level when the key is pressed.
* The pitch will change from the release level to the attack level at a rate determined by the attack time. If the key is released before the attack level is reached, the pitch will return to the release level at a rate determined by the release time.
* When the attack level is reached the pitch will then start to change to the sustain level at a rate determined by the decay setting.
* The pitch will remain at the sustain level until the key is released.
* On key release the pitch will change to the release level at a rate determined by the release setting.

The attack, sustain and release levels calibration is such that 3 is + 1 octave -3 is - 1 octave etc.
### Filters
There are four banks of 12 filters, each one in a bank corresponding to the same numbered oscillator in the same bank,
so each oscillator has a single filter tuned proportionally to the corresponding oscillators frequency.

Each of the (total 48) filters is a 4 pole state variable filter which can morph between low and high pass.
They have a Q control which can change the response from fairly flat in the passband to sharply peaking to 
the point of oscillating.

<img height="608" alt="Filter" src="README.images/filter.png" width="328"/>

#### Main Controls
| Control  | Function                                                                                                                                                                                                                                                    |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tuning   | Centered on zero where cutoff frequency corresponds to the oscillator frequency at zero, this tunes the frequency up or down from nominal by up to 3 octaves. The dial numbers represent octaves up or down The resolution of course is finer than octaves. |
| Detune   | Centred on zero where there is no offset, the dial scale allows detune by up to + or - 12 semitines                                                                                                                                                         |
| Q Factor | Adjust the sharpness of the peak at cutoff frequency.                                                                                                                                                                                                       |
| Gain     | Set the output level to between zero and 100% of full output.                                                                                                                                                                                               |


#### Portamento
This function is limited at the moment, and just gives a glide between the previous note and the next. Set to zero, there is no portamento.
The drop down below it is from an earlier version and currently does nothing.

#### Filter Morph Mode
Five buttons which set the filter response in steps between low pass and high pass.

#### Output
Five Buttons which are used to set the filter output for the bank to speaker, ring modulator, phaser, 
reverb or off.

#### Filter Modulation

| Control    | Function                                                                                                                                       |
|------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| LFO Frequency   | Frequency of the modulator. This works over a fairly wide range with an exponential law enabling it to range from an LFO to an audio modulator |
| Mod Depth  | Modulation gain                                                                                                                                |
| Waveform   | Select modulation waveform from sine, square sawtooth or triangular waves.                                                                     |
| Modulation | Select type from frequency or off (none)                                                                                            |

#### Freq Envelope
The pitch envelope is used to bend the pitch over time as the oscillator envelope does with output amplitude.
There are two additional controls as compared with the amplitude envelope, Attack Level and Release Level.
When the pitch envelope is set on the sequence is as follows:-
* The pitch starts at the release level when the key is pressed.
* The pitch will change from the release level to the attack level at a rate determined by the attack time. If the key is released before the attack level is reached, the pitch will return to the release level at a rate determined by the release time.
* When the attack level is reached the pitch will then start to change to the sustain level at a rate determined by the decay setting.
* The pitch will remain at the sustain level until the key is released.
* On key release the pitch will change to the release level at a rate determined by the release setting.

