import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CircleCheck } from 'lucide-react';
import gsap from 'gsap';
import { ANIMATION } from '../../shared/utils/constants';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'success',
  children,
  className = '',
}) => {
  const badgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (variant !== 'danger' || !badgeRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.to(badgeRef.current, {
        scale: ANIMATION.BADGE.DANGER_SCALE,
        opacity: ANIMATION.BADGE.DANGER_OPACITY,
        duration: ANIMATION.BADGE.PULSE_DURATION,
        repeat: -1,
        yoyo: true,
        ease: ANIMATION.EASING.GSAP,
      });
    }, badgeRef);

    return () => {
      ctx.revert();
    };
  }, [variant]);

  const variantStyles = {
    success: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-primary/10 text-primary border-primary/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
  };

  return (
    <span
      ref={badgeRef}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${variantStyles[variant]} ${className}`}
    >
      {variant === 'success'
        ? <CircleCheck className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        : <AlertTriangle className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </span>
  );
};
