'use client';

import type { JSX } from 'react';
import Section from './Section';
import LatexCode from './LatexCode';
import {
    sampleFile,
    type CodeButtonSpec,
    IntroSectionContent,
    HotkeySectionContent,
    AltSectionContent,
    BasicFeaturesSectionContent,
    SampleFileSectionContent,
    ConnectorsSectionContent,
    ContourExamplesSectionContent,
} from '../Content';

export interface PasiSectionProps {
    dark: boolean;
    isMac?: boolean;
    keyCmd: (s: string) => JSX.Element[];
}

interface InteractiveSectionProps extends PasiSectionProps {
    renderCodeButton: (spec: CodeButtonSpec) => React.ReactNode;
}

export const IntroSection = ({ dark, keyCmd }: PasiSectionProps) => (
    <Section id='intro-section' dark={dark}>
        <IntroSectionContent keyCmd={keyCmd} />
    </Section>
);

export const HotkeySection = ({ dark, isMac, keyCmd }: PasiSectionProps) => (
    <Section id='keyboard-commands' header='Keyboard commands' dark={dark}>
        <HotkeySectionContent keyCmd={keyCmd} dark={dark} isMac={isMac} />
    </Section>
);

export const AltSection = ({ dark }: PasiSectionProps) => (
    <Section id='alternatives-section' header='Alternative apps' dark={dark}>
        <AltSectionContent />
    </Section>
);

export const BasicFeaturesSection = ({ dark, keyCmd }: PasiSectionProps) => (
    <Section id='design-principles' header='Basic design features' dark={dark}>
        <BasicFeaturesSectionContent keyCmd={keyCmd} />
    </Section>
);

export const SampleFileSection = ({ dark }: PasiSectionProps) => (
    <Section id='sample-file' header='Sample file' dark={dark}>
        <SampleFileSectionContent codeBlock={<LatexCode dark={dark} code={sampleFile} />} />
    </Section>
);

export const ConnectorsSection = ({ dark, keyCmd, renderCodeButton }: InteractiveSectionProps) => (
    <Section id='connectors' header='Connectors' dark={dark}>
        <ConnectorsSectionContent dark={dark} keyCmd={keyCmd} renderCodeButton={renderCodeButton} />
    </Section>
);

export const ContourExamplesSection = ({ dark, keyCmd, renderCodeButton }: InteractiveSectionProps) => (
    <Section id='contour-examples' header='Contour examples' dark={dark}>
        <ContourExamplesSectionContent keyCmd={keyCmd} dark={dark} renderCodeButton={renderCodeButton} />
    </Section>
);
