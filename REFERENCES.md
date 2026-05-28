# Channel References

## Bit-rate formula

- **Shenoy 2021**: *Performance Considerations for General-Purpose Typing BCIs*. Stanford Tech Report #01. The achieved-bit-rate formula the assignment specifies.

## Comparison chart

- **Jude 2026**: QWERTY iBCI, 6.6 bps raw (8.6 bps with 5-gram LM). *Nature Neuroscience*.
- **Willett 2021**: handwriting iBCI, 4.9 bps raw at 5.9% CER (6.2 bps headline is LM-corrected). *Nature* 593:249-254. <https://doi.org/10.1038/s41586-021-03506-2>
- **Pandarinath 2017**: cursor iBCI, 2.4 bps fully raw. *eLife* 6:e18554. <https://doi.org/10.7554/eLife.18554>
- **Chen 2015**: SSVEP non-invasive, 5.32 bps. *PNAS* 112(44):E6058-E6067. <https://doi.org/10.1073/pnas.1508080112>
- **Willett 2023**: speech neuroprosthesis, adjacent BCI context. *Nature* 620:1031-1036. <https://doi.org/10.1038/s41586-023-06377-x>
- **Neuralink / Arbaugh 2024**: cursor BCI, 9 bps peak claim.
- **Wolpaw 2002**: BCI methodology baseline; also the survey covering P300 spellers (the in-app chart's 0.3 bps EEG line). *Clinical Neurophysiology* 113:767-791. <https://doi.org/10.1016/S1388-2457(02)00057-3>

## Comparability notes

- iBCI headline rates often include language-model correction. Channel forbids LM help, so the chart shows raw decoder rates where available.
- Paradromics' 200+ bps figure is excluded: preclinical sheep auditory cortex with a mutual-information metric, not the Shenoy formula.
- Mouse throughput at ~4-5 bps under ISO 9241-9 is the relevant HCI baseline; SSVEP at 5.32 bps (Chen 2015) is the fastest non-invasive BCI shown.

## Simulator empirical base

Per-key timing and skilled-typing control for `simulate_alphabets.mjs`.

- **Salthouse 1984**: per-key timing table for skilled typists. *JEP: General* 113:345-371. <https://doi.org/10.1037/0096-3445.113.3.345>
- **Logan and Crump 2011**: hierarchical control of cognitive processes in skilled typewriting. *Psychology of Learning and Motivation* 54:1-27. <https://doi.org/10.1016/B978-0-12-385527-5.00001-2>
- **Yamaguchi and Logan 2014**: stim-paced typing overhead. *JEP:HPP* 40:592-612. <https://doi.org/10.1037/a0034404>
- **Inhoff and Wang 1992**: eye-hand coordination during typing. *JEP:HPP* 18:437-448. <https://doi.org/10.1037/0096-1523.18.2.437>

## Mobile and desktop typing baselines

Justifies supporting phone, laptop, and tablet as real input channels.

- **Palin 2019**: 37,000-volunteer mobile typing study; average 36.2 WPM, two-thumb ~38 WPM. *MobileHCI 2019*. <https://doi.org/10.1145/3338286.3340120>
- **Dhakal 2018**: 136M-keystroke desktop typing study; average 51.6 WPM, fastest above 120. *CHI 2018*. <https://doi.org/10.1145/3173574.3174220>
- **Leino et al.**: ITE Typing Dataset, mobile keystroke-level labels. Aalto University. <https://userinterfaces.aalto.fi/typing37k/>

## HCI throughput

Motivates the 5x5 touchband grid: keep N = 25, test whether spatial tapping can beat keyboard motor memory.

- **MacKenzie 1992**: Fitts' law in HCI. *Human-Computer Interaction* 7:91-139. <https://doi.org/10.1207/s15327051hci0701_3>
- **MacKenzie and Soukoreff 2002**: text entry for mobile computing. *Human-Computer Interaction* 17:147-198. <https://doi.org/10.1207/S15327051HCI172&3_3>

## Silence

Why Channel ships no audio.

- **Kämpfe 2010**: background music meta-analysis. *Psychology of Music* 39:424-448. <https://doi.org/10.1177/0305735610376261>
- **Pietschnig 2010**: Mozart effect meta-analysis (debunk). *Intelligence* 38:314-323. <https://doi.org/10.1016/j.intell.2010.03.001>
- **Oberleiter and Pietschnig 2023**: Mozart effect multiverse meta-analysis (further debunk). *Scientific Reports* 13.

## Target color and visual salience

- **Wong 2011**: color-blindness palette guidance, redundant non-color cues. *Nature Methods* 8:441. <https://doi.org/10.1038/nmeth.1618>
- **Töllner 2020**: chromatic + luminance contrast speed attentional selection. *Journal of Vision* 20.
- **Komban 2014**: light/dark detection asymmetry; informs target color on dark plate. *Neuron* 82:224-234. <https://doi.org/10.1016/j.neuron.2014.02.020>

## Post-error slowing

- **Notebaert 2009**: post-error slowing as an orienting response. *Cognition* 111:275-279. <https://doi.org/10.1016/j.cognition.2009.02.002>

## Background information theory

- **Shannon 1948**: information theory foundation. *Bell System Technical Journal*. <https://doi.org/10.1002/j.1538-7305.1948.tb01338.x>
- **Hick 1952**: rate of gain of information. *QJEP* 4:11-26. <https://doi.org/10.1080/17470215208416600>
- **Hyman 1953**: stimulus information as a determinant of reaction time. *JEP* 45:188-196. <https://doi.org/10.1037/h0056940>
