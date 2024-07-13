import React, { useState, useCallback, useEffect, forwardRef, CSSProperties } from 'react'
import clsx from 'clsx/lite'
import { Placement } from 'tippy.js'
import { WithTooltip } from './EditorComponents.tsx'
import { useThrottle } from '../../util/Misc'



interface ButtonProps {
    id: string
    label?: string
    icon?: JSX.Element
    style?: string
    activeStyle?: string  // the activeStyle and inactiveStyle props are used to style the button depending on whether it is 'pressed'. 
        // They are combined with the style prop.
    inactiveStyle?: string
    tooltip?: React.ReactNode
    tooltipPlacement?: Placement
    pressed?: boolean // for toggle functionality
    disabled: boolean
    onClick: () => void
}

export const BasicButton = forwardRef((
        { id, label, icon, pressed, activeStyle, inactiveStyle, style, disabled, tooltip, tooltipPlacement, onClick }: ButtonProps, 
        ref: React.ForwardedRef<HTMLButtonElement>
    ) => {
        // These states, and the keyDown handler, are needed for no other reason than to ensure that the color of the button briefly changes when 
        // the user presses the 'Enter' key while the button is focused.
        const [buttonElement, setButtonElement] = useState<HTMLButtonElement | null>(null);
        const [active, setActive] = useState(false);

        const handleKeyDown = useCallback(
            useThrottle(
                (e: React.KeyboardEvent<HTMLButtonElement>) => {
                    if (e.key === 'Enter') {
                        e.preventDefault(); 
                        e.stopPropagation();
                        buttonElement?.click(); 
                        setActive(prev => true);
                    }
                }, 
                500
            ),
            [buttonElement]
        );

        const button = (
            <button id={id} className={clsx('block px-2 py-1 text-base font-medium border shadow-md disabled:shadow-none', 
                        'disabled:opacity-50 enabled:hover:font-semibold enabled:hover:border-transparent transition',
                        'focus:outline-none focus:ring-1', style, pressed || active? activeStyle: inactiveStyle)}
                    disabled={disabled}
                    onClick={onClick} 
                    onKeyDown={handleKeyDown} 
                    onKeyUp={(e) => setActive(false)}
                    onBlur={(e) => setTimeout(() => setActive(false), 50)}
                    ref={(element) => {
                        setButtonElement(element); // Save the DOM element in the state.
                        if (typeof ref === 'function') {
                          ref(element); 
                        } else if (ref) {
                          ref.current = element; 
                        }
                    }} >
                    {icon? [
                        <span key={0} id={id+'span0'}>{icon}</span>, 
                        <span key={1} id={id+'span1'} className='sr-only'>
                            {label?? ''}
                        </span>
                    ]: 
                    label? label.split('\n').map((line, index) => 
                        <React.Fragment key={index}>
                            {line}
                            <br />
                        </React.Fragment>
                    ): ''
                }
            </button>
        );
        return tooltip? <WithTooltip comp={button} tooltip={tooltip} placement={tooltipPlacement} />: button;
    }
);
// Set the displayName property for debugging purposes
BasicButton.displayName = 'BasicButton';

export const BasicColoredButton = forwardRef((
        { id, label, icon, style, tooltip, tooltipPlacement, pressed, disabled, onClick }: ButtonProps,
        ref: React.ForwardedRef<HTMLButtonElement>
    ) => {
        return (
            <BasicButton id={id} label={label} icon={icon} pressed={pressed} 
                activeStyle='bg-btnactivebg' 
                inactiveStyle='bg-btnbg/85 enabled:hover:bg-btnhoverbg'
                style={clsx('text-btncolor border-btnborder/50 enabled:hover:text-btnhovercolor',
                    'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor focus:ring-btnfocusring', style)} 
                tooltip={tooltip} tooltipPlacement={tooltipPlacement} disabled={disabled} onClick={onClick} ref={ref} />
        );
    }
);
// Set the displayName property for debugging purposes
BasicColoredButton.displayName = 'BasicColoredButton';

  
interface CopyToClipboardButtonProps {
    id: string
    iconStyle: string
    textareaRef: React.RefObject<HTMLTextAreaElement>
}

export const CopyToClipboardButton = ({ id, iconStyle, textareaRef }: CopyToClipboardButtonProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [scrollbarWidth, setScrollbarWidth] = useState(0); // width of the vertical scrollbar in rem.

    useEffect(() => {

        const updateScrollbarWidth = () => {
            if (textareaRef.current) {
                const { left, right } = textareaRef.current.getBoundingClientRect();
                const { clientWidth } = textareaRef.current;
                const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                setScrollbarWidth(prev => (right - left - clientWidth) / fontSize);
            }
        }

        updateScrollbarWidth();

        const textarea = textareaRef.current;

        if (textarea) {
            textarea.addEventListener('input', updateScrollbarWidth);
            textarea.addEventListener('resize', updateScrollbarWidth);

            // Create a mutation and a resize observer to watch for programmatic changes
            const mutObserver = new MutationObserver(updateScrollbarWidth);
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    updateScrollbarWidth();
                }
            });
            mutObserver.observe(textarea, {
                childList: true,
                subtree: true,
                characterData: true,
            });
            resizeObserver.observe(textarea);

            return () => {
                textarea.removeEventListener('input', updateScrollbarWidth);
                mutObserver.disconnect();
                resizeObserver.disconnect();
            };
        }
    }, [textareaRef]);


    const baseStyle: CSSProperties = {
        position: 'absolute',
        top: '0.25rem',
        right: `${0.25 + scrollbarWidth}rem`,
        padding: '0.25rem',
        borderRadius: '0.125rem',
        backgroundColor: 'rgba(var(--btnbg), 0.5)',
        color: 'rgba(var(--btncolor), 0.6)',
        transition: 'all 0.2s ease-in-out'
    };

    const hoverStyle: CSSProperties = {
        backgroundColor: 'rgba(var(--btnhoverbg))',
        color: 'rgba(var(--btnhovercolor))',
    };

    const activeStyle: CSSProperties = {
        backgroundColor: 'rgba(var(--btnactivebg))',
        color: 'rgba(var(--btnactivecolor))',
    };

    // Combine base style with conditional hover/active styles
    const style: CSSProperties = {
        ...baseStyle,
        ...(isHovered && !isActive? hoverStyle: {}),
        ...(isActive? activeStyle: {}),
    };

    const button = (
        <button id={id} style={style}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            onBlur={() => setIsActive(false)} 
            onClick={async () => {
                if (textareaRef.current) {
                    try {
                        await navigator.clipboard.writeText(textareaRef.current.value);
                    } catch (err) {
                        console.error('Failed to copy: ', err);
                    }
                }
            }} >
        {/* source: heroicons.com */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={iconStyle}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
        </svg>
    </button>);

    return <WithTooltip comp={button} tooltip={'Copy to clipboard'} placement={'left'} />;
}
