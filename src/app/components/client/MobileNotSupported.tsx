import React from 'react';

const MobileNotSupported: React.FC = () => {
    return (
        <div className='text-center text-lg text-white bg-slate-600 px-2 py-2 leading-relaxed'>
            <p><strong>Mobile device not supported.</strong></p>
            <p> Please access this web application from a laptop or desktop.</p>
        </div>
    );
};

export default MobileNotSupported;