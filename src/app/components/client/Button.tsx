import React, { useContext } from 'react'
import clsx from 'clsx/lite'
import { Placement } from 'tippy.js'
import { WithTooltip } from './EditorComponents.tsx'
import { DarkModeContext } from './MainPanel.tsx'


interface ButtonProps {
    id: string
    label?: string
    icon?: JSX.Element
    style?: string
    tooltip?: React.ReactNode
    tooltipPlacement?: Placement
    pressed?: boolean // for toggle functionality
    disabled: boolean
    onClick: () => void
}

export const BasicButton = ({id, label, icon, style, disabled, tooltip, tooltipPlacement, onClick}: ButtonProps) => {
    const button = (<button id={id} className={clsx('block px-2 py-1 text-base font-medium border shadow-md disabled:shadow-none', 
                'disabled:opacity-50 enabled:hover:font-semibold enabled:hover:border-transparent transition',
                'focus:outline-none focus:ring-1', style)}
                disabled={disabled}
                onClick={onClick} >
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
        </button>)
    return tooltip? <WithTooltip comp={button} tooltip={tooltip} placement={tooltipPlacement} />: button
}

export const BasicColoredButton = ({id, label, icon, style, tooltip, tooltipPlacement, pressed, disabled, onClick}: ButtonProps) => {
    return (
        <BasicButton id={id} label={label} icon={icon} style={clsx(pressed? 'bg-btnactivebg': 'bg-btnbg/85 enabled:hover:bg-btnhoverbg', 
            'text-btncolor border-btnborder/50 enabled:hover:text-btnhovercolor',
            'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor focus:ring-btnfocusring', style)} 
            tooltip={tooltip} tooltipPlacement={tooltipPlacement} disabled={disabled} onClick={onClick} />
    )
}

interface CopyToClipboardButtonProps {
    id: string
    textareaRef: React.RefObject<HTMLTextAreaElement>
}

export const CopyToClipboardButton = ({id, textareaRef}: CopyToClipboardButtonProps) => {
    return (
        <button className={clsx('absolute top-1 right-1 p-1 rounded-sm bg-btnbg/50 text-btncolor/60 enabled:hover:bg-btnhoverbg enabled:hover:text-btnhovercolor',
                'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor')}
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
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
        </svg>
    </button>);
}
