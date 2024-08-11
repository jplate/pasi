import React from 'react';


interface FooterProps {
  sections: {
    header: string;
    contents: React.JSX.Element[];
  }[]
}

const Footer = ({ sections }: FooterProps) => {
  return (
    <footer className='py-8 2xl:ml-[-150px]'>
      <div className='footer-div container mx-auto grid gap-8 px-20 md:px-32 lg:px-64 2xl:px-72'>            
        <style>
            @media (min-width: 640px) {'{'} .footer-div {'{'} grid-template-columns: repeat({sections.length}, minmax(0, 1fr)) {'}}'}
        </style>
        {sections.map((info, i) =>         
          <div key={i} className='mx-6 sm:mx-auto 2xl:ml-2 2xl:flex 2xl:items-baseline'>
            <h3 className='text-lg font-semibold my-1 2xl:mr-6'>{info.header}</h3>
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
      <div className='container mx-auto mt-3 text-center border-t border-btnborder/60 pt-4'>
        <p className='text-sm px-8'>
          © {new Date().getFullYear()} Jan Plate. The source code for this webpage is licensed under the MIT License.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
