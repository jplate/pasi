import React from 'react';


interface FooterProps {
  copyRightHolder: string
  licenseInfo: string
  sections: {
    header: string;
    contents: React.JSX.Element[];
  }[]
}

const footerStyle = (sectionsLength: number) => `
    @media (min-width: 640px) {
        .footer-div {
            grid-template-columns: repeat(${sectionsLength}, minmax(0, 1fr));
        }
    }
`;

const Footer = ({ copyRightHolder, licenseInfo, sections }: FooterProps) => {
  return (
    <footer className='py-8 2xl:ml-[-150px]'>
      <style>{footerStyle(sections.length)}</style>
      <div className='footer-div mx-auto max-w-fit grid gap-8'>
        {sections.map((info, i) =>         
          <div key={i} className='mx-6 sm:mx-2 2xl:ml-0 2xl:flex 2xl:items-baseline'>
            <h3 className='text-base font-semibold my-1 2xl:mr-6'>{info.header}</h3>
            <ul className='text-sm 2xl:inline 2xl:flex 2xl:space-x-6'>
              {info.contents.map((item, j) =>
                <li key={j} className='my-1'>
                  {item}
                </li>
            )}
            </ul>
          </div>
        )}
      </div>
      <div className='xl:max-w-[80vw] 2xl:max-w-[70vw] mx-auto mt-3 border-t border-btnborder/60 pt-4'>
        <p className='text-xs text-center px-8'>
          © {new Date().getFullYear()} {copyRightHolder}. {licenseInfo}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
