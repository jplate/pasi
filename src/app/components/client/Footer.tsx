import React from 'react';

interface FooterProps {
    copyRightHolder: string;
    homepage: string;
    licenseInfo: string;
    sections: {
        header: string;
        contents: React.JSX.Element[];
    }[];
}

const footerStyle = (sectionsLength: number) => `
    @media (min-width: 640px) {
        .footer-div {
            grid-template-columns: repeat(${sectionsLength}, minmax(0, 1fr));
        }
    }
`;

const Footer = ({ copyRightHolder, homepage, licenseInfo, sections }: FooterProps) => {
    return (
        <footer className='py-8 2xl:ml-[-150px]'>
            <style>{footerStyle(sections.length)}</style>
            <div className='footer-div mx-auto max-w-fit grid gap-8'>
                {sections.map((info, i) => (
                    <div key={i} className='mx-6 sm:mx-2 2xl:ml-0 2xl:flex 2xl:items-baseline'>
                        <h3 className='text-base font-semibold my-1 2xl:mr-6'>{info.header}</h3>
                        <ul className='text-sm 2xl:inline 2xl:flex 2xl:space-x-6'>
                            {info.contents.map((item, j) => (
                                <li key={j} className='my-1'>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className='xl:max-w-[80vw] 2xl:max-w-[70vw] mx-auto mt-3 border-t border-btnborder/60 pt-4'>
                <p className='text-xs text-center px-8'>
                    © {new Date().getFullYear()}{' '}
                    <a href={homepage} target='_blank' rel='noopener noreferrer'>
                        {copyRightHolder}
                    </a>
                    . {licenseInfo}
                </p>
            </div>
        </footer>
    );
};

const MyFooter = () => (
    <Footer
        copyRightHolder='Jan Plate'
        homepage='https://jplate.github.io/home/Home'
        licenseInfo='The source code for this webpage is licensed under the MIT License.'
        sections={[
            {
                header: 'Links',
                contents: [
                    <a
                        key='1'
                        href='https://github.com/jplate/pasi'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        GitHub repository
                    </a>,
                    <a
                        key='2'
                        href='https://opensource.org/license/MIT'
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        License
                    </a>,
                ],
            },
            {
                header: 'Contact',
                contents: [
                    <>
                        <span>Email: </span>
                        <a href='mailto:janplate@gmail.com'>jan.plate@gmail.com</a>
                    </>,
                    <>
                        <span>&#120143;: </span> {/* Twitter */}
                        <a href='https://x.com/jan_plate' target='_blank' rel='noopener noreferrer'>
                            @jan_plate
                        </a>
                    </>,
                ],
            },
        ]}
    />
);

export default MyFooter;
