import React from 'react';

const MobileNotSupported: React.FC = () => {
    return (
        <div className='text-center text-3xl text-white bg-slate-600 px-4 py-4 leading-loose'>
            <p><strong>Mobile device not supported.</strong></p>
            <p> Please access this web application from a laptop or desktop.</p>
        </div>
    );
};

export default MobileNotSupported;