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

<img height="98" src="README.images/control-dial.png" width="100"/>

* To increase or decrease the setting on a control dial, hold the mouse button down and drag up to increase the setting, down to decrease it.
* To set a dial to zero, click on it then press ESC.
* To set a dial to a particular number on the dial, press F*n* where *n* is the required number. 
Some of the dials have negative settings, to go straight to these, press the shift key with the required F key. 





<img height="40%" src="README.images/modulation-matrix.png" width="40%" title="Modulation Matrix" alt="The controls for setting cross modulation (AM or FM) between oscillator banks."/>

*The operator modulation matrix*
