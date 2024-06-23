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
                    <span key={1} id={id+'span1'}className='sr-only'>
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
