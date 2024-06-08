import react, { useContext } from 'react'
import clsx from 'clsx/lite'
import Tippy from '@tippyjs/react'
import { Placement } from 'tippy.js'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'
import 'tippy.js/themes/translucent.css'

import { DarkModeContext } from '../../page.tsx'


interface ButtonProps {
    id: string
    label?: string
    icon?: JSX.Element
    style?: string
    tooltip?: string
    tooltipPlacement?: Placement
    pressed?: boolean // for toggle functionality
    disabled: boolean
    onClick: () => void
}

export const BasicButton = ({id, label, icon, style, disabled, tooltip, tooltipPlacement, onClick}: ButtonProps) => {
    const dark = useContext(DarkModeContext)

    const button = (<button id={id} className={clsx('block px-2 py-1 text-base font-medium border', 
                'disabled:opacity-50 enabled:hover:font-semibold enabled:hover:border-transparent transition',
                'focus:outline-none focus:ring-1', style)}
                disabled={disabled}
                onClick={onClick} >
            {icon? [<span key={0} id={id+'span0'}>{icon}</span>, 
                    <span key={1} id={id+'span1'}className='sr-only'>{label?? ''}</span>]: 
                label?? ''}
        </button>)


    return tooltip? 
        (<Tippy theme={dark? 'translucent': 'light'} delay={[400,0]} arrow={false} placement={tooltipPlacement} content={tooltip}>
            {button}
        </Tippy>): button
}

export const BasicColoredButton = ({id, label, icon, style, tooltip, tooltipPlacement, pressed, disabled, onClick}: ButtonProps) => {
    return (
        <BasicButton id={id} label={label} icon={icon} style={clsx(pressed? 'bg-btnactivebg': 'bg-btnbg/85 enabled:hover:bg-btnhoverbg', 
            'text-btncolor border-btnborder/50 enabled:hover:text-btnhovercolor',
            'enabled:active:bg-btnactivebg enabled:active:text-btnactivecolor focus:ring-btnfocusring', style)} 
            tooltip={tooltip} tooltipPlacement={tooltipPlacement} disabled={disabled} onClick={onClick} />
    )
}
