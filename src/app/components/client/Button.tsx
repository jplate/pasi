import React, { useState, useEffect, useMemo, useRef, forwardRef, CSSProperties } from 'react';
import clsx from 'clsx/lite';
import { WithTooltip, Placement } from './EditorComponents';
import { useThrottle } from '../../util/Misc';

interface ButtonProps {
    id: string;
    label?: React.ReactNode;
    icon?: JSX.Element;
    style?: string;
    activeStyle?: string; // the activeStyle and inactiveStyle props are used to style the button depending on whether it is 'pressed'.
    // They are combined with the style prop.
    inactiveStyle?: string;
    tooltip?: React.ReactNode;
    tooltipPlacement?: Placement;
    pressed?: boolean; // for toggle functionality
    disabled: boolean;
    onClick: () => void;
}

export const BasicButton = React.memo(
    forwardRef(
        (
            {
                id,
                label,
                icon,
                pressed,
                activeStyle,
                inactiveStyle,
                style,
                disabled,
                tooltip,
                tooltipPlacement,
                onClick,
            }: ButtonProps,
            ref: React.ForwardedRef<HTMLButtonElement>
        ) => {
            // These states, and the keyDown handler, are needed for no other reason than to ensure that the color of the button briefly changes when
            // the user presses the 'Enter' key while the button is focused.
            const [buttonElement, setButtonElement] = useState<HTMLButtonElement | null>(null);
            const [active, setActive] = useState(false);

            const handleKeyDown = useThrottle((e: React.KeyboardEvent<HTMLButtonElement>) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    buttonElement?.click();
                    if (!disabled) {
                        setActive(true);
                    }
                }
            }, 400);

            if (disabled && active) {
                setActive(false);
            }

            const button = useMemo(
                () => (
                    <button
                        id={id}
                        className={clsx(
                            'block px-2 py-1 text-base font-medium border shadow-md disabled:shadow-none',
                            'disabled:opacity-50 enabled:hover:font-semibold enabled:hover:border-transparent transition',
                            'focus:outline-none focus:ring-1',
                            style,
                            pressed || active ? activeStyle : inactiveStyle
                        )}
                        disabled={disabled}
                        onClick={onClick}
                        onKeyDown={handleKeyDown}
                        onKeyUp={() => setActive(false)}
                        onBlur={() => setTimeout(() => setActive(false), 50)}
                        ref={(element) => {
                            setButtonElement(element); // Save the DOM element in the state.
                            if (typeof ref === 'function') {
                                ref(element);
                            } else if (ref) {
                                ref.current = element;
                            }
                        }}
                    >
                        {icon
                            ? [
                                  <span key={0} id={id + 'span0'}>
                                      {icon}
                                  </span>,
                                  <span key={1} id={id + 'span1'} className='sr-only'>
                                      {label ?? ''}
                                  </span>,
                              ]
                            : label}
                    </button>
                ),
                [
                    active,
                    disabled,
                    id,
                    ref,
                    style,
                    pressed,
                    activeStyle,
                    inactiveStyle,
                    icon,
                    label,
                    onClick,
                    handleKeyDown,
                    setActive,
                    setButtonElement,
                ]
            );

            return tooltip ? (
                <WithTooltip comp={button} tooltip={tooltip} placement={tooltipPlacement} />
            ) : (
                button
            );
        }
    )
);
// Set the displayName property for debugging purposes
BasicButton.displayName = 'BasicButton';

export const BasicColoredButton = React.memo(
    forwardRef(
        (
            { id, label, icon, style, tooltip, tooltipPlacement, pressed, disabled, onClick }: ButtonProps,
            ref: React.ForwardedRef<HTMLButtonElement>
        ) => {
            return (
                <BasicButton
                    id={id}
                    label={label}
                    icon={icon}
                    pressed={pressed}
                    activeStyle='bg-btnactivebg text-btnactivecolor'
                    inactiveStyle='bg-btnbg/85 text-btncolor enabled:hover:bg-btnhoverbg'
                    style={clsx(
                        'border-btnborder/50 enabled:hover:text-btnhovercolor',
                        'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor focus:ring-btnfocusring',
                        style
                    )}
                    tooltip={tooltip}
                    tooltipPlacement={tooltipPlacement}
                    disabled={disabled}
                    onClick={onClick}
                    ref={ref}
                />
            );
        }
    )
);
// Set the displayName property for debugging purposes
BasicColoredButton.displayName = 'BasicColoredButton';

interface CopyToClipboardButtonProps {
    id: string;
    iconSize: number;
    textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const CopyToClipboardButton = React.memo(
    ({ id, iconSize, textareaRef }: CopyToClipboardButtonProps) => {
        const [scrollbarWidth, setScrollbarWidth] = useState(0); // width of the vertical scrollbar in rem.
        const [copied, setCopied] = useState(false);
        const buttonRef = useRef<HTMLButtonElement>(null);

        const baseIconClassName = 'absolute';
        const originalIconClassName = clsx('copy-icon original-icon', baseIconClassName);
        const copiedIconClassName = clsx('copy-icon copied-icon', baseIconClassName);

        useEffect(() => {
            const updateScrollbarWidth = () => {
                if (textareaRef.current) {
                    const { left, right } = textareaRef.current.getBoundingClientRect();
                    const { clientWidth } = textareaRef.current;
                    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
                    setScrollbarWidth((right - left - clientWidth) / fontSize);
                }
            };

            updateScrollbarWidth();

            const textarea = textareaRef.current;

            if (textarea) {
                textarea.addEventListener('input', updateScrollbarWidth);
                textarea.addEventListener('resize', updateScrollbarWidth);

                // Create a mutation and a resize observer to watch for programmatic changes
                const mutObserver = new MutationObserver(updateScrollbarWidth);
                const resizeObserver = new ResizeObserver((entries) => {
                    entries.forEach(() => updateScrollbarWidth());
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

        const buttonStyle: CSSProperties = {
            position: 'absolute',
            top: '0.25rem',
            right: `${0.25 + scrollbarWidth}rem`,
            padding: '0.25rem',
        };

        const iconStyle: CSSProperties = {
            width: `${iconSize / 4}rem`,
            height: `${iconSize / 4}rem`,
        };

        const button = (
            <button
                id={id}
                ref={buttonRef}
                className='copy-button rounded-md'
                style={buttonStyle} // For much of the styling, we're relying on global.css.
                disabled={copied}
                onClick={async () => {
                    if (textareaRef.current) {
                        try {
                            await navigator.clipboard.writeText(textareaRef.current.value);
                            setCopied(true);
                            if (buttonRef.current) {
                                buttonRef.current.classList.add('copied');
                            }
                            setTimeout(() => {
                                setCopied(false);
                                if (buttonRef.current) {
                                    buttonRef.current.classList.remove('copied');
                                }
                            }, 2000); // Show check-marked clipboard icon for 2 seconds
                        } catch {
                            console.warn('Copy to clipboard failed');
                        }
                    }
                }}
            >
                <div className='relative' style={iconStyle}>
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        strokeWidth={1.5}
                        stroke='currentColor'
                        className={copiedIconClassName}
                        style={iconStyle}
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75'
                        />
                    </svg>
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        strokeWidth={1.5}
                        stroke='currentColor'
                        className={originalIconClassName}
                        style={iconStyle}
                    >
                        <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            d='M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z'
                        />
                    </svg>
                </div>
            </button>
        );

        return button;
    }
);
CopyToClipboardButton.displayName = 'CopyToClipboardButton';
