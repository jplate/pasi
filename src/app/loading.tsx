export default function Loading() {
    return (
        <div className='pasi min-h-[950px] min-w-[800px] flex'>
            <div className='animate-pulse min-w-full min-h-full m-12 flex justify-center'>
                <div className='pt-10 text-lg font-light tracking-wider'>Loading...</div>
            </div>
        </div>
    );
}
