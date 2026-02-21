import type { JSX } from 'react';
import StaticSection from './StaticSection';
import StaticLatexCode from './StaticLatexCode';
import {
    sampleFile,
    IntroSectionContent,
    HotkeySectionContent,
    AltSectionContent,
    BasicFeaturesSectionContent,
    SampleFileSectionContent,
} from '../Content';

export interface PasiSectionProps {
    dark: boolean;
    isMac?: boolean;
    keyCmd: (s: string) => JSX.Element[];
}

export const IntroSection = ({ dark, keyCmd }: PasiSectionProps) => (
    <StaticSection id='intro-section' dark={dark}>
        <IntroSectionContent keyCmd={keyCmd} />
    </StaticSection>
);

export const HotkeySection = ({ dark, isMac, keyCmd }: PasiSectionProps) => (
    <StaticSection id='keyboard-commands' header='Keyboard commands' dark={dark}>
        <HotkeySectionContent keyCmd={keyCmd} dark={dark} isMac={isMac} />
    </StaticSection>
);

export const AltSection = ({ dark }: PasiSectionProps) => (
    <StaticSection id='alternatives-section' header='Alternative apps' dark={dark}>
        <AltSectionContent />
    </StaticSection>
);

export const BasicFeaturesSection = ({ dark, keyCmd }: PasiSectionProps) => (
    <StaticSection id='design-principles' header='Basic design features' dark={dark}>
        <BasicFeaturesSectionContent keyCmd={keyCmd} />
    </StaticSection>
);

export const SampleFileSection = ({ dark }: PasiSectionProps) => (
    <StaticSection id='sample-file' header='Sample file' dark={dark}>
        <SampleFileSectionContent codeBlock={<StaticLatexCode code={sampleFile} />} />
    </StaticSection>
);
