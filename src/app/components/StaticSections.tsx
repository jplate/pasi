import type { JSX } from 'react';
import StaticSection from './StaticSection';
import StaticLatexCode from './StaticLatexCode';
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

const staticCodeButton = ({ text }: CodeButtonSpec) => <span className='text-linkcolor'>{text}</span>;

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

export const ConnectorsSection = ({ dark, keyCmd }: PasiSectionProps) => (
    <StaticSection id='connectors' header='Connectors' dark={dark}>
        <ConnectorsSectionContent dark={dark} keyCmd={keyCmd} renderCodeButton={staticCodeButton} />
    </StaticSection>
);

export const ContourExamplesSection = ({ dark, keyCmd }: PasiSectionProps) => (
    <StaticSection id='contour-examples' header='Contour examples' dark={dark}>
        <ContourExamplesSectionContent dark={dark} keyCmd={keyCmd} renderCodeButton={staticCodeButton} />
    </StaticSection>
);
