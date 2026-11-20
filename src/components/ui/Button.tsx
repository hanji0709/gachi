import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from './cx'
import { Icon, type IconName } from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
  /** md = 44px(기본), sm = 36px(표·필터 안), header = 40px */
  size?: 'md' | 'sm' | 'header'
  block?: boolean
  icon?: IconName
  iconRight?: IconName
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  iconRight,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'md' ? 18 : 16
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block', className)}
      {...rest}
    >
      {icon && <Icon name={icon} size={iconSize} strokeWidth={variant === 'primary' ? 2 : 1.5} />}
      {children}
      {iconRight && <Icon name={iconRight} size={16} />}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  label: string
  variant?: 'plain' | 'primary'
  iconSize?: number
}

/** 아이콘만 있는 버튼: aria-label 필수 */
export function IconButton({ icon, label, variant = 'plain', iconSize, className, type = 'button', ...rest }: IconButtonProps) {
  const primary = variant === 'primary'
  return (
    <button
      type={type}
      aria-label={label}
      className={cx('icon-btn', primary && 'icon-btn--primary', className)}
      {...rest}
    >
      <Icon name={icon} size={iconSize ?? (primary ? 20 : 22)} strokeWidth={primary ? 2 : 1.5} />
    </button>
  )
}

interface PickerButtonProps {
  children: ReactNode
  /** m = 모바일 알약형 */
  variant?: 'pc' | 'm'
  icon?: IconName
}

/** 결산월·기간 선택 버튼 (달력 아이콘 + 값 + ▼) */
export function PickerButton({ children, variant = 'pc', icon = 'calendar' }: PickerButtonProps) {
  const m = variant === 'm'
  return (
    <button type="button" className={cx('picker-btn', m && 'picker-btn--m')}>
      <Icon name={icon} size={m ? 16 : 18} color="var(--text-sub)" />
      {children}
      <Icon name="chevronDown" size={m ? 14 : 16} color="var(--text-sub)" />
    </button>
  )
}
